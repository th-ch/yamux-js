# Yamux-js

[![npm version](https://badge.fury.io/js/yamux-js.svg)](https://www.npmjs.com/package/yamux-js)
[![Build status](https://img.shields.io/github/workflow/status/th-ch/yamux-js/Node.js%20CI)](https://github.com/th-ch/yamux-js)
[![GitHub license](https://img.shields.io/github/license/th-ch/yamux-js.svg)](https://github.com/th-ch/yamux-js/blob/master/LICENSE)

Yamux-js (Yet another Multiplexer) is a Node.js (TypeScript/JavaScript) port of the multiplexing library for Golang made by HashiCorp: https://github.com/hashicorp/yamux. The 2 libraries are fully interoperable (you can have a client in Golang and a server in JS, or the other way around).

_From https://github.com/hashicorp/yamux:_

It relies on an underlying connection to provide reliability and ordering, such as TCP or Unix domain sockets, and provides stream-oriented multiplexing. It is inspired by SPDY but is not interoperable with it.

Yamux features include:

-   Bi-directional streams
    -   Streams can be opened by either client or server
    -   Useful for NAT traversal
    -   Server-side push support
-   Flow control
    -   Avoid starvation
    -   Back-pressure to prevent overwhelming a receiver
-   Keep Alives
    -   Enables persistent connections over a load balancer
-   Efficient
    -   Enables thousands of logical streams with low overhead

## Installation

Install Yamux-js using [`yarn`](https://yarnpkg.com/en/package/jest):

```bash
yarn add yamux-js
```

Or [`npm`](https://www.npmjs.com/package/yamux-js):

```bash
npm install --save yamux-js
```

## Usage

### Client side

```js
var {Client} = require('yamux-js');

var client = new Client();
client.on('error', (err) => {
    console.log('An error occured:', err);
});
client.pipe(commonXXXChannel).pipe(client);

var stream1 = client.open();
stream1.on('end', () => {
    console.log('client disconnected');
});
stream1.on('data', (data) => {
    console.log('recv:', data.toString());
});
stream1.on('error', (err) => {
    console.log('An error occured:', err);
});
stream1.write('Sending data');

var stream2 = client.open();
// ...
```

### Server side

```js
var {Server} = require('yamux-js');

var server = new Server((stream) => {
    stream.on('end', () => {
        console.log('client disconnected');
    });
    stream.on('data', (data) => {
        console.log('recv:', data.toString());
        stream.write('Sending back data');
    });
    stream.on('error', (err) => {
        console.log('An error occured:', err);
    });
});
server.on('error', (err) => {
    console.log('An error occured:', err);
});

server.pipe(commonXXXChannel).pipe(server);
```

### Configuration

Both `Server` and `Client` can take a custom config as last argument in their constructor:

```js
{
    // AcceptBacklog is used to limit how many streams may be
    // waiting an accept.
    // WARNING [Difference with the Go implementation]: total number of streams, not in-flight
    acceptBacklog: number; // default: 256

    // EnableKeepalive is used to do a period keep alive
    // messages using a ping.
    enableKeepAlive: boolean; // default: true

    // KeepAliveInterval is how often to perform the keep alive
    keepAliveInterval: number; // In seconds, default: 30

    // ConnectionWriteTimeout is meant to be a "safety valve" timeout after
    // we which will suspect a problem with the underlying connection and
    // close it. This is only applied to writes, where's there's generally
    // an expectation that things will move along quickly.
    connectionWriteTimeout: number; // In seconds, default: 10

    // MaxStreamWindowSize is used to control the maximum
    // window size that we allow for a stream.
    maxStreamWindowSize: number; // default: 256 * 1024 (256 KB)

    // Logger is used to pass in the logger to be used.
    logger: typeof console.log; // default: console.log
}
```
