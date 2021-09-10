export const VERSION = 0;

export enum TYPES {
    Data = 0x0,
    WindowUpdate = 0x1,
    Ping = 0x2,
    GoAway = 0x3,
}

export enum FLAGS {
    SYN = 0x1,
    ACK = 0x2,
    FIN = 0x4,
    RST = 0x8,
}

export enum STREAM_STATES {
    Init = 0,
    SYNSent = 1,
    SYNReceived = 2,
    Established = 3,
    LocalClose = 4,
    RemoteClose = 5,
    Closed = 6,
    Reset = 7,
}

export const initialStreamWindow = 256 * 1024;

export enum GO_AWAY_ERRORS {
    // goAwayNormal is sent on a normal termination
    goAwayNormal = 0,

    // goAwayProtoErr sent on a protocol error
    goAwayProtoErr = 1,

    // goAwayInternalErr sent on an internal error
    goAwayInternalErr = 2,
}

export const ERRORS = {
    // ErrInvalidVersion means we received a frame with an
    // invalid version
    errInvalidVersion: new Error('invalid protocol version'),

    // ErrInvalidMsgType means we received a frame with an
    // invalid message type
    errInvalidMsgType: new Error('invalid msg type'),

    // ErrSessionShutdown is used if there is a shutdown during
    // an operation
    errSessionShutdown: new Error('session shutdown'),

    // ErrStreamsExhausted is returned if we have no more
    // stream ids to issue
    // WARNING [Difference with the Go implementation]: not used in the Node.js lib
    errStreamsExhausted: new Error('streams exhausted'),

    // ErrDuplicateStream is used if a duplicate stream is
    // opened inbound
    errDuplicateStream: new Error('duplicate stream initiated'),

    // ErrReceiveWindowExceeded indicates the window was exceeded
    errRecvWindowExceeded: new Error('recv window exceeded'),

    // ErrTimeout is used when we reach an IO deadline
    errTimeout: new Error('i/o deadline reached'),

    // ErrStreamClosed is returned when using a closed stream
    errStreamClosed: new Error('stream closed'),

    // ErrUnexpectedFlag is set when we get an unexpected flag
    errUnexpectedFlag: new Error('unexpected flag'),

    // ErrRemoteGoAway is used when we get a go away from the other side
    errRemoteGoAway: new Error('remote end is not accepting connections'),

    // ErrConnectionReset is sent if a stream is reset. This can happen
    // if the backlog is exceeded, or if there was a remote GoAway.
    errConnectionReset: new Error('connection reset'),

    // ErrConnectionWriteTimeout indicates that we hit the "safety valve"
    // timeout writing to the underlying stream connection.
    errConnectionWriteTimeout: new Error('connection write timeout'),

    // ErrKeepAliveTimeout is sent if a missed keepalive caused the stream close
    errKeepAliveTimeout: new Error('keepalive timeout'),
} as const;
