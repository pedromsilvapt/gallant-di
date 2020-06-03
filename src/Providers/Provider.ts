import { Injector } from '../Injector';

export abstract class Provider<T> {
    token : any;

    readonly cacheable : boolean = false;

    abstract resolve ( injector : Injector ) : T;
}