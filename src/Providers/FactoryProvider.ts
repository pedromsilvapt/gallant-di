import { Provider } from './Provider';
import { Injector } from '../Injector';

export class FactoryProvider<T> extends Provider<T> {
    factory : ( ...args : any[] ) => any;

    dependencies : any[];

    readonly cacheable : boolean;

    constructor ( token : any, factory : ( ...args : any[] ) => T, dependencies : any[] = [], cacheable : boolean = false ) {
        super();

        this.token = token;
        this.factory = factory;
        this.dependencies = dependencies;
        this.cacheable = cacheable;
    }

    public resolve ( injector : Injector ) {
        return this.factory( this.dependencies.map( token => injector.get( token ) ) );
    }
}