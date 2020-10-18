import {expect} from 'chai';

import {STREAM_STATES} from '../src/constants';
import {Session} from '../src/session';
import {Stream} from '../src/stream';

const createStream = (streamID = 0, state = STREAM_STATES.Init) => {
    const session = new Session(false);
    const stream = new Stream(session, streamID, state);

    return {streamID, stream, session};
};

describe('Stream', () => {
    it('has an ID', () => {
        const {session, streamID, stream} = createStream();
        expect(stream.ID()).to.equal(streamID);
        session.close();
    });

    it('can send a window update', (done) => {
        const {stream, session} = createStream();
        session.on('data', (data) => {
            expect(
                Buffer.compare(
                    data,
                    Buffer.from(['00', '01', '00', '01', '00', '00', '00', '00', '00', '00', '00', '00'])
                )
            ).to.equal(0);
            session.removeAllListeners('data');
            session.close();
            done();
        });
        stream.sendWindowUpdate();
    });

    it('can close when established', (done) => {
        // Established stream
        let {stream, session} = createStream(0, STREAM_STATES.Established);
        session.on('data', (data) => {
            expect(
                Buffer.compare(
                    data,
                    Buffer.from(['00', '01', '00', '04', '00', '00', '00', '00', '00', '00', '00', '00'])
                )
            ).to.equal(0);
            session.removeAllListeners('data');
            session.close();
            done();
        });
        stream.close();
    });

    it('can close when connection is already closed', (done) => {
        const {stream, session} = createStream(0, STREAM_STATES.RemoteClose);
        session.on('data', (data) => {
            expect(
                Buffer.compare(
                    data,
                    Buffer.from(['00', '01', '00', '04', '00', '00', '00', '00', '00', '00', '00', '00'])
                )
            ).to.equal(0);
            session.removeAllListeners('data');
            session.close();
            done();
        });
        stream.close();
    });
});
