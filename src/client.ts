import {Config} from './mux';
import {Session} from './session';
import type {Stream} from './stream';

export class Client extends Session {
    constructor(config?: Config, onStream?: (stream: Stream) => void) {
        super(true, config, onStream);
    }
}
