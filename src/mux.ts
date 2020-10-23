import {initialStreamWindow} from './constants';

export interface Config {
    // AcceptBacklog is used to limit how many streams may be
    // waiting an accept.
    // WARNING [Difference with the Go implementation]: total number of streams, not in-flight
    acceptBacklog?: number;

    // EnableKeepalive is used to do a period keep alive
    // messages using a ping.
    enableKeepAlive?: boolean;

    // KeepAliveInterval is how often to perform the keep alive
    keepAliveInterval?: number; // In seconds

    // ConnectionWriteTimeout is meant to be a "safety valve" timeout after
    // we which will suspect a problem with the underlying connection and
    // close it. This is only applied to writes, where's there's generally
    // an expectation that things will move along quickly.
    connectionWriteTimeout?: number; // In seconds

    // MaxStreamWindowSize is used to control the maximum
    // window size that we allow for a stream.
    maxStreamWindowSize?: number;

    // Logger is used to pass in the logger to be used.
    logger?: typeof console.log;
}

export const defaultConfig = {
    acceptBacklog: 256,
    enableKeepAlive: true,
    keepAliveInterval: 30, // In seconds
    connectionWriteTimeout: 10, // In seconds
    maxStreamWindowSize: initialStreamWindow,
    logger: console.log,
};
