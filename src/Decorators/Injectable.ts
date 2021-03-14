import { Annotate } from '@gallant/annotate';
import { MutableInjector, Injector } from '../Injector';

export interface InjectableOptions {
    token ?: any;
    tags ?: any[];
    scope ?: number;
    injector ?: MutableInjector;
}

export var InjectableSchema = Annotate.schema<InjectableOptions>( Symbol( 'Injectable' ) );

export function Injectable ( options : InjectableOptions = {} ) {
    return ( constructor : any ) => {
        if ( !options.token ) {
            options = { ...options, token: constructor };
        }

        let injector : MutableInjector = Injector.main;

        if ( options.injector ) {
            injector = options.injector;
        }

        injector.set( options.token, constructor, options.scope ?? -1 );

        if ( options.tags ) {
            for ( let tag of options.tags ) {
                injector.tag( tag, [ options.token ] );
            }
        }

        Annotate.add( constructor, InjectableSchema, options );
    };
}