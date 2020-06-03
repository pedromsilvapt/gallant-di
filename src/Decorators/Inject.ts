import { Annotate } from '@gallant/annotate';
import { InjectFlags } from '../Injector';
import { Provider } from '../Providers/Provider';

export type ClassDecoratorArgs<T extends Function> = [ ( target : T ) => void | T ]
export type PropertyDecoratorArgs = [ Object, string | symbol ];
export type MethodDecoratorArgs<T> = [ Object, string | symbol, TypedPropertyDescriptor<T> ];
export type ParameterDecoratorArgs = [ Object, string | symbol, number ];

export function isClassDecorator<T extends Function> ( args : any ) : args is ClassDecoratorArgs<T> {
    return args.length == 1;
}

export function isPropertyDecorator ( args : any ) : args is PropertyDecoratorArgs {
    return args.length == 2 || ( args.length == 3 && typeof args[ 2 ] != 'number' && !args[ 2 ] );
}

export function isMethodDecorator<T> ( args : any ) : args is MethodDecoratorArgs<T> {
    return args.length == 3 && typeof args[ 2 ] !== "number" && !!args[ 2 ];
}

export function isParameterDecorator ( args : any ) : args is ParameterDecorator {
    return args.length == 3 && typeof args[ 2 ] === "number";
}

export var InjectSchema = Annotate.schema<InjectOptions>( Symbol( 'Inject' ) , true, injectMerger, injectIdentity );

export interface InjectOptions {
    token ?: any;
    flags ?: InjectFlags,
    defaultValue ?: any,
    parameter ?: number;
    args ?: any[];
    provides ?: Provider<any>[];
    provideSelf ?: boolean;
}

export function Inject ( token ?: any, options : InjectOptions | any[] = {} ) {
    return ( ...args : any[] ) => {
        if ( options instanceof Array ) {
            options = { args: options };
        }
        
        if ( !options.token ) {
            options.token = token;
        }
        
        return InjectWith( options )( ...args );
    };
}

export function InjectWith ( options : InjectOptions | any[] = {} ) {
    return ( ...args : any[] ) => {
        if ( options instanceof Array ) {
            options = { args: options };
        }

        if ( isClassDecorator( args ) || isMethodDecorator( args ) ) {
            const [ target, method ] = args;

            const annotations = Annotate.getForMember( target as any, method, InjectSchema )
                .filter( ann => typeof ann.metadata.parameter === 'number' );
                
            if ( typeof options.parameter != 'number' ) {
                const index = Math.max( -1, ...annotations.map( ann => ann.metadata.parameter ) ) + 1;

                options = { ...options, parameter: index };
            }

            if ( !options.token ) {
                options = { ...options, token: ( Reflect.getMetadata( 'design:paramtypes', target ) || [] )[ options.parameter ] };
            }

            Annotate.add( target as any, method, InjectSchema, options );
        } else if ( isPropertyDecorator( args ) ) {
            const [ target, member ] = args;
            
            if ( !options.token ) {
                options = { ...options, token: Reflect.getMetadata( 'design:type', target, member ) };
            }

            Annotate.add( target as any, member, InjectSchema, options );
        } else if ( isParameterDecorator( args ) ) {
            const [ target, method, index ] = args;

            options = { ...options, parameter: index };

            if ( !options.token ) {
                options = { ...options, token: ( Reflect.getMetadata( 'design:paramtypes', target ) || [] )[ index ] };
            }

            Annotate.add( target, method, InjectSchema, options );
        }
    }
}

function injectIdentity ( a : InjectOptions, b : InjectOptions ) {
    return a.parameter == b.parameter;
}

function injectMerger ( a : InjectOptions, b : InjectOptions ) {
    const out = { ...a, ...b };

    if ( a.flags && b.flags ) {
        out.flags = a.flags | b.flags;
    }

    return out;
}

