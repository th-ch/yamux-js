import {expect} from 'chai';
import {Duplex} from 'stream';

import {Server} from '../src/server';
import {Client} from '../src/client';
import {Session} from '../src/session';
import {EVENT_ACCEPT} from '../src/events';

describe('Server', () => {
    it('is a Session instance', () => {
        const server = new Server((_) => {});
        expect(server instanceof Session).to.be.true;
        server.close();
    });

    it('fires "accept" event per incoming connection', () => {
        const acceptedCallbackStreams: Duplex[] = [];
        const server = new Server((acceptdStream) => acceptedCallbackStreams.push(acceptdStream));
        const client = new Client();
        const acceptedEventStreams: Session[] = [];

        client.pipe(server).pipe(server);

        server.on(EVENT_ACCEPT, acceptdStream => acceptedEventStreams.push(acceptdStream));

        client.open();



        expect(acceptedEventStreams).to.have.length(1);
        expect(acceptedEventStreams).to.be.deep.equal(acceptedCallbackStreams);

        client.close();
        server.close();
    });
});
