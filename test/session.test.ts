import {Duplex} from 'stream';

import {expect} from 'chai';

import {FLAGS, TYPES, VERSION, initialStreamWindow} from '../src/constants';
import {Header} from '../src/header';
import {Session} from '../src/session';
import {defaultConfig} from '../src/mux';

const testConfig = {
    ...defaultConfig,
    enableKeepAlive: false,
    keepAliveInterval: 0.1, // In seconds
    connectionWriteTimeout: 0.5, // In seconds
};
const testConfigWithKeepAlive = {
    ...testConfig,
    enableKeepAlive: true,
};

const getServerAndClient = (
    serverConfig = testConfig,
    clientConfig = testConfig,
    onStream?: (duplex: Duplex) => void
) => {
    const server = new Session(false, serverConfig, onStream);
    const client = new Session(true, clientConfig);
    client.pipe(server).pipe(client);

    return {client, server};
};

describe('Server session', () => {
    it('sends pings if keepalive is configured', (done) => {
        const server = new Session(false, testConfigWithKeepAlive);
        const expectedPings = [
            // first ping
            Buffer.from([0x0, 0x2, 0x0, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0]),
            // second ping
            Buffer.from([0x0, 0x2, 0x0, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x1]),
            // Third ping
            Buffer.from([0x0, 0x2, 0x0, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x2]),
        ];

        server.on('data', (data) => {
            if (expectedPings.length === 0) {
                server.removeAllListeners('data');
                server.close();
                return done();
            }
            const expectedPing = expectedPings.shift()!;
            expect(Buffer.compare(data, expectedPing)).to.equal(0);
        });
    });

    it('errors if pings time out', (done) => {
        const server = new Session(false, testConfigWithKeepAlive);
        server.on('error', (err) => {
            expect(err.toString()).to.equal('Error: keepalive timeout');
            server.removeAllListeners('error');
            server.close();
            return done();
        });
    });

    it('accepts streams', (done) => {
        const nbStreams = 10;
        const expectedOutput = new Set();

        const {client} = getServerAndClient(
            {...testConfig, connectionWriteTimeout: 2},
            {...testConfig, connectionWriteTimeout: 2},
            (stream) => {
                stream.on('data', (data) => {
                    const received = data.toString();
                    expect(expectedOutput.has(received)).to.be.true;
                    // Send it back
                    stream.write(received);
                });
            }
        );

        for (let i = 0; i < nbStreams; i++) {
            const message = 'echo-' + i;
            expectedOutput.add(message);

            const stream = client.open();
            stream.on('data', (data) => {
                const received = data.toString();
                expect(expectedOutput.has(received)).to.be.true;
                expectedOutput.delete(received);
                if (expectedOutput.size === 0) {
                    done();
                }
            });
            // Send the message and wait to get it back
            stream.write(message);
        }
    });

    it('supports sending big data chunks', (done) => {
        const nbStreams = 2;
        const expectedOutput = new Set();

        const {client} = getServerAndClient(testConfig, testConfig, (stream) => {
            stream.on('data', (data) => {
                const received = data.toString();
                expect(expectedOutput.has(received)).to.be.true;
                // Send it back
                stream.write(received);
            });
        });

        for (let i = 0; i < nbStreams; i++) {
            const message = ('echo-' + i).repeat(10000);
            expectedOutput.add(message);

            const stream = client.open();
            expect(stream).to.not.be.undefined;
            stream!.on('data', (data) => {
                const received = data.toString();
                expect(expectedOutput.has(received)).to.be.true;
                expectedOutput.delete(received);
                if (expectedOutput.size === 0) {
                    done();
                }
            });
            // Send the message and wait to get it back
            stream!.write(message);
        }
    });

    it('updates the receive window', (done) => {
        const expectedOutput = new Set();

        const {client, server} = getServerAndClient(testConfig, testConfig, (stream) => {
            stream.on('data', (data) => {
                const received = data.toString();
                expect(expectedOutput.has(received)).to.be.true;
                // Send it back
                stream.write(received);
            });
        });


        const message = Buffer.alloc(1024).fill(0x42);
        expectedOutput.add(message.toString());

        const stream = client.open();
        expect(stream).to.not.be.undefined;

        stream.on('data', (data) => {
            expect(stream['recvWindow']).to.equal(initialStreamWindow - 1024)
            done();
        });

        // Send the message and wait to get it back
        stream.write(message);
    });

    it('updates the receive window - and resets it when needed', (done) => {
        const expectedOutput = new Set();

        const {client, server} = getServerAndClient(testConfig, testConfig, (stream) => {
            stream.on('data', (data) => {
                const received = data.toString();
                expect(expectedOutput.has(received)).to.be.true;
                // Send it back
                stream.write(received);
            });
        });


        const message = Buffer.alloc(200 * 1024).fill(0x42);
        expectedOutput.add(message.toString());

        const stream = client.open();
        expect(stream).to.not.be.undefined;

        stream.on('data', (data) => {
            expect(stream['recvWindow']).to.equal(initialStreamWindow)
            done();
        });

        // Send the message and wait to get it back
        stream.write(message);
    });

    it('handles Go away', (done) => {
        const {server, client} = getServerAndClient(testConfig, testConfig);
        client.on('error', (err) => {
            expect(err.toString()).to.equal('Error: remote end is not accepting connections');
            done();
        });
        server.close();
        const stream = client.open();
        expect(stream).to.be.undefined;
    });

    it('handles many streams', (done) => {
        const nbStreams = 1000;
        const expectedOutput = new Set();

        const {client} = getServerAndClient(
            {...testConfig, acceptBacklog: 1000, connectionWriteTimeout: 2},
            {...testConfig, connectionWriteTimeout: 2},
            (stream) => {
                stream.on('data', (data) => {
                    const received = data.toString();
                    expect(expectedOutput.has(received)).to.be.true;
                    // Send it back
                    stream.write(received);
                });
            }
        );

        for (let i = 0; i < nbStreams; i++) {
            const message = 'echo-' + i;
            expectedOutput.add(message);

            const stream = client.open();
            expect(stream).to.not.be.undefined;
            stream!.on('data', (data) => {
                const received = data.toString();
                expect(expectedOutput.has(received)).to.be.true;
                expectedOutput.delete(received);
                if (expectedOutput.size === 0) {
                    done();
                }
            });
            // Send the message and wait to get it back
            stream!.write(message);
        }
    });

    it('handles correctly window updates', (done) => {
        const {client} = getServerAndClient(testConfig, testConfig, (stream) => {
            // Write back the data
            stream.on('data', stream.write);
        });

        let hasReceivedMessageBeforeWindowUpdate = false;

        const stream = client.open();
        stream.on('data', (data) => {
            const received = data.toString();

            if (!hasReceivedMessageBeforeWindowUpdate) {
                expect(received).to.equal('Data before window update');
                hasReceivedMessageBeforeWindowUpdate = true;
            } else {
                expect(received).to.equal('Data after window update');
            }
        });

        stream.write('Data before window update');

        const stream2 = client.open();
        stream2.on('data', (data) => {
            const received = data.toString();
            expect(received).to.equal('unrelated data');
            done();
        });

        const dataWithHeader = (streamID: number, data: string) =>
            Buffer.concat([new Header(VERSION, TYPES.Data, 0, streamID, data.length).encode(), Buffer.from(data)]);

        // Update the window (size += 1)
        const hdr = new Header(VERSION, TYPES.WindowUpdate, FLAGS.ACK, stream.ID(), 1);
        // Send additional data along with the window update, for both streams
        client.send(
            hdr,
            Buffer.concat([
                dataWithHeader(stream.ID(), 'Data after window update'),
                dataWithHeader(stream2.ID(), 'unrelated data'),
            ])
        );
    });
});

describe('Server/client', () => {
    it('handles close before ack', (done) => {
        const server = new Session(false, testConfig, (stream) => {
            stream.end(); // Close the stream immediately
            done();
        });
        const client = new Session(true, testConfig);
        client.pipe(server).pipe(client);
        client.open();
    });
});
