import {expect} from 'chai';

import {Client} from '../src/client';
import {Session} from '../src/session';

describe('Client', () => {
    it('is a Session instance', () => {
        const client = new Client();
        expect(client instanceof Session).to.be.true;
        client.close();
    });
});
