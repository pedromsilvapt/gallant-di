import { Annotate } from '@gallant/annotate';

export var FactorySchema = Annotate.schema<FactoryOptions>( Symbol( 'Factory' ), true, false );

export interface FactoryOptions {
    ( self : any ) : any;
}

export function Factory ( factory : FactoryOptions ) {
    return ( target : any, property : string | symbol ) => {
        Annotate.add( target, property, FactorySchema, factory );
    };
}
