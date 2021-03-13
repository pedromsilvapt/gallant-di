import { Provider } from './Provider';
import { Injector, InjectFlags } from '../Injector';

export class DefaultProvider<T> extends Provider<T> {
    provider : Provider<T>;
    
    get cacheable () : boolean {
        return false;
    }

    constructor ( provider : Provider<T>, scope : number = 0 ) {
        super();

        this.token = provider.token;
        this.provider = provider;
        this.scope = scope;
    }

    resolve ( injector : Injector ) : T {
        const value = injector.get<T>( this.token, InjectFlags.Optional | InjectFlags.SkipSelf );

        if ( !value ) {
            return this.provider.resolve( injector );
        }

        return value;
    }
}