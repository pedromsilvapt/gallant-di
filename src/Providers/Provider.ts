import { Injector } from '../Injector';

export abstract class Provider<T> {
    token : any;

    scope : number = 0;

    abstract resolve ( injector : Injector ) : T;
}