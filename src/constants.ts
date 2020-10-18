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

export enum ERRORS {
    // ErrInvalidVersion means we received a frame with an
    // invalid version
    errInvalidVersion = 'invalid protocol version',

    // ErrInvalidMsgType means we received a frame with an
    // invalid message type
    errInvalidMsgType = 'invalid msg type',

    // ErrSessionShutdown is used if there is a shutdown during
    // an operation
    errSessionShutdown = 'session shutdown',

    // ErrStreamsExhausted is returned if we have no more
    // stream ids to issue
    // WARNING [Difference with the Go implementation]: not used in the Node.js lib
    errStreamsExhausted = 'streams exhausted',

    // ErrDuplicateStream is used if a duplicate stream is
    // opened inbound
    errDuplicateStream = 'duplicate stream initiated',

    // ErrReceiveWindowExceeded indicates the window was exceeded
    errRecvWindowExceeded = 'recv window exceeded',

    // ErrTimeout is used when we reach an IO deadline
    errTimeout = 'i/o deadline reached',

    // ErrStreamClosed is returned when using a closed stream
    errStreamClosed = 'stream closed',

    // ErrUnexpectedFlag is set when we get an unexpected flag
    errUnexpectedFlag = 'unexpected flag',

    // ErrRemoteGoAway is used when we get a go away from the other side
    errRemoteGoAway = 'remote end is not accepting connections',

    // ErrConnectionReset is sent if a stream is reset. This can happen
    // if the backlog is exceeded, or if there was a remote GoAway.
    errConnectionReset = 'connection reset',

    // ErrConnectionWriteTimeout indicates that we hit the "safety valve"
    // timeout writing to the underlying stream connection.
    errConnectionWriteTimeout = 'connection write timeout',

    // ErrKeepAliveTimeout is sent if a missed keepalive caused the stream close
    errKeepAliveTimeout = 'keepalive timeout',
}
