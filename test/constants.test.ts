import {expect} from 'chai';

import {VERSION, TYPES, FLAGS, STREAM_STATES, initialStreamWindow, GO_AWAY_ERRORS, ERRORS} from '../src/constants';

describe('Constants', () => {
    describe('Proto version', () => {
        it('should have the correct value', () => {
            expect(VERSION).to.equal(0);
        });
    });

    describe('Types', () => {
        it('should have the correct values', () => {
            expect(TYPES.Data).to.equal(0x0);
            expect(TYPES.WindowUpdate).to.equal(0x1);
            expect(TYPES.Ping).to.equal(0x2);
            expect(TYPES.GoAway).to.equal(0x3);
        });
    });

    describe('Flags', () => {
        it('should have the correct values', () => {
            expect(FLAGS.SYN).to.equal(0x1);
            expect(FLAGS.ACK).to.equal(0x2);
            expect(FLAGS.FIN).to.equal(0x4);
            expect(FLAGS.RST).to.equal(0x8);
        });
    });

    describe('Stream states', () => {
        it('should have the correct values', () => {
            expect(STREAM_STATES.Init).to.equal(0);
            expect(STREAM_STATES.SYNSent).to.equal(1);
            expect(STREAM_STATES.SYNReceived).to.equal(2);
            expect(STREAM_STATES.Established).to.equal(3);
            expect(STREAM_STATES.LocalClose).to.equal(4);
            expect(STREAM_STATES.RemoteClose).to.equal(5);
            expect(STREAM_STATES.Closed).to.equal(6);
            expect(STREAM_STATES.Reset).to.equal(7);
        });
    });

    describe('Initial stream window', () => {
        it('should have the correct value', () => {
            expect(initialStreamWindow).to.equal(262144);
        });
    });

    describe('Go away errors', () => {
        it('should have the correct values', () => {
            expect(GO_AWAY_ERRORS.goAwayNormal).to.equal(0);
            expect(GO_AWAY_ERRORS.goAwayProtoErr).to.equal(1);
            expect(GO_AWAY_ERRORS.goAwayInternalErr).to.equal(2);
        });
    });

    describe('Errors', () => {
        it('should have the correct values', () => {
            expect(ERRORS.errInvalidVersion.message).to.equal('invalid protocol version');
            expect(ERRORS.errInvalidMsgType.message).to.equal('invalid msg type');
            expect(ERRORS.errSessionShutdown.message).to.equal('session shutdown');
            expect(ERRORS.errStreamsExhausted.message).to.equal('streams exhausted');
            expect(ERRORS.errDuplicateStream.message).to.equal('duplicate stream initiated');
            expect(ERRORS.errRecvWindowExceeded.message).to.equal('recv window exceeded');
            expect(ERRORS.errTimeout.message).to.equal('i/o deadline reached');
            expect(ERRORS.errStreamClosed.message).to.equal('stream closed');
            expect(ERRORS.errUnexpectedFlag.message).to.equal('unexpected flag');
            expect(ERRORS.errRemoteGoAway.message).to.equal('remote end is not accepting connections');
            expect(ERRORS.errConnectionReset.message).to.equal('connection reset');
            expect(ERRORS.errConnectionWriteTimeout.message).to.equal('connection write timeout');
            expect(ERRORS.errKeepAliveTimeout.message).to.equal('keepalive timeout');
        });
    });
});
