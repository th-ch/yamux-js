import {Stream} from './stream';

import {Config} from './mux';
import {Session} from './session';

export class Server extends Session {
    constructor(onStream: (stream: Stream) => void, config?: Config) {
        super(false, config, onStream);
    }
}
