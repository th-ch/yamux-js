import {Config} from './mux';
import {Session} from './session';

export class Client extends Session {
    constructor(config?: Config) {
        super(true, config);
    }
}
