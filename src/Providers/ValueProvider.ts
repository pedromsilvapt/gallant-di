import { Provider } from './Provider';
import { Injector } from '../Injector';

export class ValueProvider<T> extends Provider<T> {
    token : any;

    value : any;

    constructor ( token : any, value : T, scope = -1 ) {
        super();

        this.token = token;
        this.value = value;
        this.scope = scope;
    }

    public resolve ( injector : Injector ) {
        return this.value;
    }
}
