import { Annotate } from '@gallant/annotate';

export var HookSchema = Annotate.schema<HookOptions>( Symbol( 'Hook' ), true, false );

export interface HookOptions {
    name: string;
}

export function Hook ( hook ?: HookOptions | string ) {
    return ( target : any, property : string | symbol ) => {
        if ( !hook ) {
            hook = property.toString();

            if ( hook.startsWith( 'on' ) && hook[ 2 ] === hook[ 2 ].toUpperCase() ) {
                hook = hook[ 2 ].toLowerCase() + hook.slice( 3 );
            }
        }
    
        if ( typeof hook === 'string' ) {
            hook = { name: hook };
        }

        Annotate.add( target, property, HookSchema, hook );
    };
}
