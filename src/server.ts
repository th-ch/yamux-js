import {Duplex} from 'stream';

import {Config} from './mux';
import {Session} from './session';

export class Server extends Session {
    constructor(onStream: (duplex: Duplex) => void, config?: Config) {
        super(false, config, onStream);
    }
}
