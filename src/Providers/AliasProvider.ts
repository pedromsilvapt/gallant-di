import { Provider } from './Provider';
import { Injector, InjectFlags } from '../Injector';

/**
 * Creates an alias provider for another provider in the same injector (or any of it's ancestors.)
 * Therefore, resolving this provider is the same as resolving the provider associated with the defined alias
 */
export class AliasProvider<T> extends Provider<T> {
    token : any;

    alias : any;

    flags : InjectFlags;

    readonly cacheable : boolean;

    constructor ( token : any, alias : any, flags : InjectFlags = InjectFlags.Default, scope : number = 0 ) {
        super();

        this.token = token;
        this.alias = alias;
        this.flags = flags;
        this.scope = scope;
    }

    public resolve ( injector : Injector ) : T {
        return injector.get( this.alias, this.flags );
    }
}