import { InjectOptions, isMethodDecorator, isClassDecorator, InjectSchema, isPropertyDecorator, isParameterDecorator } from './Inject';
import { InjectFlags } from '../Injector';
import { Annotate } from '@gallant/annotate';

export function Optional ( defaultValue ?: any ) {
    const hasDefaultValue = arguments.length > 0;

    return ( ...args : any[] ) => {
        const options : InjectOptions = { flags: InjectFlags.Optional };

        if ( hasDefaultValue ) {
            options.defaultValue = defaultValue;
        }

        if ( isClassDecorator( args ) || isMethodDecorator( args ) ) {
            const [ target, method ] = args;
            
            const annotations = Annotate.getForMember( target as any, method, InjectSchema )
                .filter( ann => typeof ann.metadata.parameter === 'number' );

            if ( typeof options.parameter != 'number' ) {
                const index = Math.max( -1, ...annotations.map( ann => ann.metadata.parameter ) ) + 1;

                options.parameter = index;
            }

            Annotate.add( target as any, method, InjectSchema, options );
        } else if ( isPropertyDecorator( args ) ) {
            const [ target, member ] = args;

            Annotate.add( target as any, member, InjectSchema, options );            
        } else if ( isParameterDecorator( args ) ) {
            const [ target, method, index ] = args;

            options.parameter = index;

            Annotate.add( target as any, method, InjectSchema, options );
        }
    }
}