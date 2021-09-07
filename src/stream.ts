import {Duplex} from 'stream';

import {STREAM_STATES, FLAGS, TYPES, initialStreamWindow, VERSION, ERRORS} from './constants';
import {Header} from './header';
import {Session} from './session';

export class Stream extends Duplex {
    private recvWindow: number;
    private sendWindow: number;
    private id: number;
    private session: Session;
    private state: STREAM_STATES;
    private recvBuf?: Buffer;
    private controlHdr?: Header;

    constructor(session: Session, id: number, state: STREAM_STATES) {
        super();
        this.session = session;
        this.id = id;
        this.state = state;

        this.recvWindow = initialStreamWindow;
        this.sendWindow = initialStreamWindow;
    }

    public ID(): number {
        return this.id;
    }

    public _read(size: number): void {
        if (size > this.recvWindow) {
            this.session.config.logger(
                '[ERR] yamux: receive window exceeded (stream: %d, remain: %d, recv: %d)',
                this.id,
                this.recvWindow,
                size
            );
            this.emit('error', new Error(ERRORS.errRecvWindowExceeded));
        }
    }

    public _write(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null) => void): void {
        switch (this.state) {
            case STREAM_STATES.LocalClose:
            case STREAM_STATES.RemoteClose:
            case STREAM_STATES.Closed:
                this.emit('error', new Error(ERRORS.errStreamClosed));
                break;
            case STREAM_STATES.Reset:
                this.emit('error', new Error(ERRORS.errConnectionReset));
                break;
            default:
                if (this.sendWindow === 0) {
                    setTimeout(() => this._write(chunk, encoding, cb), 100);
                    return;
                }
                const flags = this.sendFlags();
                const packetLength = Math.min(this.sendWindow, chunk.length);
                const sendHdr = new Header(VERSION, TYPES.Data, flags, this.id, packetLength);
                const buffers = [sendHdr.encode(), chunk];
                const packet = Buffer.concat(buffers);

                const rest = packet.slice(packetLength + Header.LENGTH);
                const packetToSend = packet.slice(0, packetLength + Header.LENGTH);
                this.sendWindow -= packetLength;

                const writeTimeout = setTimeout(() => {
                    this.emit('error', new Error(ERRORS.errConnectionWriteTimeout));
                    clearTimeout(writeTimeout);
                }, this.session.config.connectionWriteTimeout * 1000);
                this.session.push(packetToSend, encoding);
                clearTimeout(writeTimeout);

                if (rest.length > 0) {
                    return this._write(rest, encoding, cb);
                }

                break;
        }

        return cb();
    }

    private sendFlags() {
        let flags: FLAGS = 0;

        switch (this.state) {
            case STREAM_STATES.Init:
                flags = FLAGS.SYN;
                this.state = STREAM_STATES.SYNSent;
                break;
            case STREAM_STATES.SYNReceived:
                flags = FLAGS.ACK;
                this.state = STREAM_STATES.Established;
        }

        return flags;
    }

    public sendWindowUpdate() {
        const max = this.session.config.maxStreamWindowSize;
        const delta = max - (this.recvBuf ? this.recvBuf.length : 0) - this.recvWindow;

        const flags = this.sendFlags();

        if (delta < max / 2 && flags === 0) {
            return;
        }

        // Update our window
        this.recvWindow += delta;

        // Send the header
        this.controlHdr = new Header(VERSION, TYPES.WindowUpdate, flags, this.id, delta);
        this.session.send(this.controlHdr);
    }

    // sendClose is used to send a FIN
    private sendClose() {
        const flags = FLAGS.FIN;
        this.controlHdr = new Header(VERSION, TYPES.WindowUpdate, flags, this.id, 0);
        if (!this.session.isClosed()) {
            this.session.send(this.controlHdr);
        }
    }

    public close() {
        switch (this.state) {
            // Opened means we need to signal a close
            case STREAM_STATES.SYNSent:
            case STREAM_STATES.SYNReceived:
            case STREAM_STATES.Established:
                this.state = STREAM_STATES.LocalClose;
                this.sendClose();

            case STREAM_STATES.LocalClose:
            case STREAM_STATES.RemoteClose:
                this.state = STREAM_STATES.LocalClose;
                this.sendClose();
                this.session.closeStream(this.id);
        }
    }

    public forceClose() {
        this.state = STREAM_STATES.Closed;
    }

    private processFlags(flags: FLAGS) {
        // Close the stream without holding the state lock
        let closeStream = false;
        if (flags === FLAGS.ACK) {
            if (this.state === STREAM_STATES.SYNSent) {
                this.state = STREAM_STATES.Established;
            }
        }
        if (flags === FLAGS.SYN) {
            switch (this.state) {
                case STREAM_STATES.SYNSent:
                case STREAM_STATES.SYNReceived:
                case STREAM_STATES.Established:
                    this.state = STREAM_STATES.RemoteClose;
                    break;
                case STREAM_STATES.LocalClose:
                    this.state = STREAM_STATES.Closed;
                    closeStream = true;
                    break;
                default:
                    this.session.config.logger('[ERR] yamux: unexpected FIN flag in state %d', this.state);
                    this.emit('error', new Error(ERRORS.errUnexpectedFlag));
                    return;
            }
        }

        if (flags === FLAGS.RST) {
            this.state = STREAM_STATES.Reset;
            closeStream = true;
        }

        if (closeStream) {
            this.session.closeStream(this.id);
        }
    }

    public incrSendWindow(hdr: Header) {
        this.processFlags(hdr.flags);
        this.sendWindow += hdr.length;
    }
}
