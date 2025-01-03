import {expect} from 'chai';

import {VERSION, TYPES, FLAGS} from '../src/constants';
import {Header} from '../src/header';

describe('Header', () => {
    it('has the correct length', () => {
        expect(Header.LENGTH).to.equal(12);
    });

    it('can parse and re-encode an encoded header', () => {
        const encodedHeader = Buffer.from([0x0, 0x2, 0x0, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x7]);
        const header = Header.parse(encodedHeader);

        expect(header.version).to.equal(VERSION);
        expect(header.type).to.equal(TYPES.Ping);
        expect(header.flags).to.equal(FLAGS.SYN);
        expect(header.streamID).to.equal(0);
        expect(header.length).to.equal(7);

        expect(Buffer.compare(header.encode(), encodedHeader)).to.equal(0);
    });
});
