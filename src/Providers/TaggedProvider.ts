import { Provider } from './Provider';
import { Injector, InjectFlags } from '../Injector';

export class TaggedProvider<T = any> extends Provider<T[]> {
    inherit : boolean;

    items : Set<any>;

    constructor ( token : any, services: any[] = [], inherit : boolean = true, scope : number = -1 ) {
        super();

        this.token = token;
        this.inherit = inherit;
        this.items = new Set( services );
        this.scope = scope;
    }

    public add ( ...tokens : any[] ) : void {
        this.addAll( tokens );
    }

    public addAll ( tokens : any[] ) : void {
        for ( let token of tokens ) {
            this.items.add( token );
        }
    }

    public resolve ( injector : Injector ) {
        const parent : T[] = this.inherit
            ? injector.get( this.token, InjectFlags.Optional | InjectFlags.SkipSelf ) || []
            : [];

        return parent.concat( Array.from( this.items ).map( token => injector.get( token ) as T ) );
    }
}
