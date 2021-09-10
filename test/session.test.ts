import {Duplex} from 'stream';

import {expect} from 'chai';

import {FLAGS, TYPES, VERSION} from '../src/constants';
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
            Buffer.from(['00', '02', '00', '01', '00', '00', '00', '00', '00', '00', '00', '00']),
            // second ping
            Buffer.from(['00', '02', '00', '01', '00', '00', '00', '00', '00', '00', '00', '01']),
            // Third ping
            Buffer.from(['00', '02', '00', '01', '00', '00', '00', '00', '00', '00', '00', '02']),
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
        let hasReceivedMessageBeforeWindowUpdate = false;

        const {client} = getServerAndClient(testConfig, testConfig, (stream) => {
            stream.on('data', (data) => {
                const received = data.toString();

                if (!hasReceivedMessageBeforeWindowUpdate) {
                    expect(received).to.equal('Data before window update');
                    hasReceivedMessageBeforeWindowUpdate = true;
                } else {
                    expect(received).to.equal('Data after window update');
                    done();
                }
            });
        });

        const stream = client.open();
        stream.write('Data before window update');

        // Update the window (size += 1)
        const hdr = new Header(VERSION, TYPES.WindowUpdate, FLAGS.ACK, stream.ID(), 1);
        client.send(hdr);

        stream.write('Data after window update');
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
