import {expect} from 'chai';

import {Server} from '../src/server';
import {Session} from '../src/session';

describe('Server', () => {
    it('is a Session instance', () => {
        const server = new Server((_) => {});
        expect(server instanceof Session).to.be.true;
        server.close();
    });
});
