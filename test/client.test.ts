import {expect} from 'chai';

import {Client} from '../src/client';
import {Session} from '../src/session';
import {EVENT_CONNECT} from '../src/events';

describe('Client', () => {
    it('is a Session instance', () => {
        const client = new Client();
        expect(client instanceof Session).to.be.true;
        client.close();
    });

    it('fires "connect" event once stream opened', () => {
        const client = new Client();
        const connectedStreams: Session[] = [];

        client.on(EVENT_CONNECT, connected => connectedStreams.push(connected));

        const stream = client.open();

        expect(connectedStreams).to.be.deep.equal([stream]);
        client.close();
    });
});
