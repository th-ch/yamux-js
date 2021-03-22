import {Duplex, Transform, TransformCallback} from 'stream';

import {FLAGS, STREAM_STATES, TYPES, VERSION, GO_AWAY_ERRORS, ERRORS} from './constants';
import {Header} from './header';
import {Config, defaultConfig} from './mux';
import {Stream} from './stream';

export class Session extends Transform {
    // localGoAway indicates that we should stop accepting futher connections
    private localGoaway = false;

    // remoteGoAway indicates the remote side does not want futher connections.
    private remoteGoAway = false;

    // nextStreamID is the next stream we should send. This depends if we are a client/server.
    private nextStreamID: number;

    // config holds our configuration
    public config: typeof defaultConfig;

    // pings is used to track inflight pings
    private pings: Map<number, NodeJS.Timeout> = new Map();
    private pingID = 0;
    private pingTimer?: NodeJS.Timeout;

    // streams maps a stream id to a stream
    private streams: Map<number, Stream> = new Map();

    // shutdown is used to safely close a session
    private shutdown = false;

    // Callback when a steam had been created
    protected onStream?: (duplex: Duplex) => void;

    // Current header from data received
    private currentHeader?: Header;

    constructor(client: boolean, config?: Config, onStream?: (duplex: Duplex) => void) {
        super();
        if (client) {
            this.nextStreamID = 1;
        } else {
            this.nextStreamID = 2;
        }
        this.onStream = onStream;
        this.config = {
            ...defaultConfig,
            ...config,
        };

        if (this.config.enableKeepAlive) {
            this.keepalive();
        }
    }

    _transform(chunk: any, encoding: BufferEncoding, cb: TransformCallback): void {
        let packet = Buffer.alloc(chunk.length, chunk);

        if (!this.currentHeader) {
            if (packet.length >= Header.LENGTH) {
                this.currentHeader = Header.parse(packet);
                packet = packet.slice(Header.LENGTH);
            } else {
                // header info is incomplete wait for more data
                return cb();
            }
        }

        let expectedLength = this.currentHeader.length;

        // Verify the version
        if (this.currentHeader.version !== VERSION) {
            this.config.logger('[ERR] yamux: Invalid protocol version: %d', this.currentHeader.version);
            return this.close(ERRORS.errInvalidVersion);
        }

        switch (this.currentHeader.type) {
            case TYPES.Data:
            case TYPES.WindowUpdate:
                // we have enough data to handle the packet
                if (packet.length >= expectedLength) {
                    var rest = packet.slice(expectedLength);
                    var fullPacket = packet.slice(0, expectedLength);

                    this.handleStreamMessage(this.currentHeader, fullPacket, encoding);
                    this.currentHeader = undefined;

                    if (rest.length > 0) {
                        return this._transform(rest, encoding, cb);
                    }
                }
                break;
            case TYPES.Ping:
                this.handlePing(this.currentHeader);
                this.currentHeader = undefined;
                if (packet.length > 0) {
                    return this._transform(packet, encoding, cb);
                }
                break;
            case TYPES.GoAway:
                this.handleGoAway(this.currentHeader);
                this.currentHeader = undefined;
                break;
            default:
                return this.close(ERRORS.errInvalidMsgType);
        }

        // done processing for now
        return cb();
    }

    private handleStreamMessage(currentHeader: Header, fullPacket: Buffer, encoding: BufferEncoding) {
        // Check for a new stream creation
        if (currentHeader.flags == FLAGS.SYN) {
            return this.incomingStream(currentHeader.streamID);
        }

        // Get the stream
        const stream = this.streams.get(currentHeader.streamID);

        // If we do not have a stream, likely we sent a RST
        if (!stream) {
            // Drain any data on the wire
            if (currentHeader.type === TYPES.Data && currentHeader.length > 0) {
                this.config.logger('[WARN] yamux: Discarding data for stream: %d', currentHeader.streamID);
            } else {
                this.config.logger('[WARN] yamux: Discarding data for stream: %d', currentHeader.streamID);
            }
            return;
        }

        // Check if this is a window update
        if (currentHeader.type === TYPES.WindowUpdate) {
            stream.incrSendWindow(currentHeader);
        }

        stream.push(fullPacket, encoding);
    }

    public closeStream(streamID: number) {
        this.streams.delete(streamID);
    }

    public isClosed() {
        return this.shutdown;
    }

    // Close is used to close the session and all streams.
    // Attempts to send a GoAway before closing the connection.
    public close(error?: ERRORS | string) {
        if (this.shutdown) {
            return;
        }

        this.goAway(GO_AWAY_ERRORS.goAwayNormal);

        if (this.pingTimer) {
            clearInterval(this.pingTimer);
        }
        this.pings.forEach((responseTimeout) => clearTimeout(responseTimeout));

        this.shutdown = true;
        this.streams.forEach((stream) => {
            stream.forceClose();
            stream.destroy();
        });

        if (error) {
            this.emit('error', error);
        }
        this.end();
    }

    // incomingStream is used to create a new incoming stream
    private incomingStream(streamID: number) {
        // Reject immediately if we are doing a go away
        if (this.localGoaway) {
            const hdr = new Header(VERSION, TYPES.WindowUpdate, FLAGS.RST, streamID, 0);
            return this.send(hdr);
        }

        // Allocate a new stream
        const stream = new Stream(this, streamID, STREAM_STATES.SYNReceived);

        // Check if stream already exists
        if (this.streams.has(streamID)) {
            this.config.logger('[ERR] yamux: duplicate stream declared');
            this.emit('error', ERRORS.errDuplicateStream);
            return this.goAway(GO_AWAY_ERRORS.goAwayProtoErr);
        }

        // Register the stream
        this.streams.set(streamID, stream);

        if (this.streams.size > this.config.acceptBacklog) {
            // Backlog exceeded! RST the stream
            this.config.logger('[WARN] yamux: backlog exceeded, forcing connection reset');
            this.streams.delete(streamID);
            const hdr = new Header(VERSION, TYPES.WindowUpdate, FLAGS.RST, streamID, 0);
            return this.send(hdr);
        }

        if (this.onStream) {
            this.onStream(stream);
        }
    }

    // goAway is used to send a goAway message
    private goAway(reason: GO_AWAY_ERRORS) {
        const hdr = new Header(VERSION, TYPES.GoAway, 0, 0, reason);
        return this.send(hdr);
    }

    // Open is used to create a new stream
    public open(): Stream {
        const stream = new Stream(this, this.nextStreamID, STREAM_STATES.Init);
        this.nextStreamID += 2;

        if (this.isClosed()) {
            this.emit('error', ERRORS.errSessionShutdown);
            return stream;
        }
        if (this.remoteGoAway) {
            this.emit('error', ERRORS.errRemoteGoAway);
            return stream;
        }

        this.streams.set(stream.ID(), stream);
        stream.sendWindowUpdate();

        return stream;
    }

    private handlePing(hdr: Header) {
        const pingID = hdr.length;
        if (hdr.flags === FLAGS.SYN) {
            const responseHdr = new Header(VERSION, TYPES.Ping, FLAGS.ACK, 0, pingID);
            return this.send(responseHdr);
        }

        // Handle a response
        const responseTimeout = this.pings.get(pingID);
        if (responseTimeout) {
            clearTimeout(responseTimeout);
            this.pings.delete(pingID);
        }
    }

    // Ping is used to measure the RTT response time
    private ping() {
        if (this.shutdown) {
            this.emit('error', ERRORS.errSessionShutdown);
            return;
        }
        const pingID = this.pingID++;
        const hdr = new Header(VERSION, TYPES.Ping, FLAGS.SYN, 0, pingID);

        // Wait for a response
        const responseTimeout = setTimeout(() => {
            clearTimeout(responseTimeout); // Ignore it if a response comes later.
            this.emit('error', ERRORS.errKeepAliveTimeout);
            this.close(ERRORS.errTimeout);
        }, this.config.connectionWriteTimeout * 1000);
        this.pings.set(pingID, responseTimeout);

        this.send(hdr);
    }

    private keepalive() {
        this.pingTimer = setInterval(() => this.ping(), this.config.keepAliveInterval * 1000);
    }

    public send(header: Header, data?: Buffer) {
        const buffers = [header.encode()];
        if (data) {
            buffers.push(data);
        }

        const toSend = Buffer.concat(buffers);
        if (!this.writableEnded) {
            this.push(toSend);
        }
    }

    private handleGoAway(hdr: Header) {
        const code = hdr.length;
        switch (code) {
            case GO_AWAY_ERRORS.goAwayNormal:
                this.remoteGoAway = true;
                break;
            case GO_AWAY_ERRORS.goAwayProtoErr:
                this.config.logger('[ERR] yamux: received protocol error go away');
                return this.close('yamux protocol error');
            case GO_AWAY_ERRORS.goAwayInternalErr:
                this.config.logger('[ERR] yamux: received internal error go away');
                return this.close('remote yamux internal error');
            default:
                this.config.logger('[ERR] yamux: received unexpected go away');
                return this.close('unexpected go away received');
        }
    }
}
