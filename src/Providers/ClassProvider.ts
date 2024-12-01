import { Provider } from './Provider';
import { Injector } from '../Injector';
import { Annotate } from '@gallant/annotate';
import { InjectSchema, FactorySchema } from '../Decorators';
import { collect, groupingBy, mapping, first } from 'data-collectors';
import { HookSchema } from '../Decorators/Hook';
import { MethodInjector } from '../MethodInjector';

export interface Class<T> {
    new ( ...args : any[] ) : T;
}

export class ClassProvider<T> extends Provider<T> {
    classConstructor : Class<T>;

    singleton : boolean;

    args : any[];

    protected instance : T = null;

    constructor ( token : Class<T>, scope ?: number, args ?: any[] );
    constructor ( token : any, classConstructor : Class<T>, scope ?: number, args ?: any[] );
    constructor ( token : any | Class<T>, classConstructor ?: Class<T> | number | undefined, scope ?: number | any[] | undefined, args ?: any[] | undefined ) {
        super();

        if ( classConstructor == null ) {
            classConstructor = token;
        }

        if ( typeof classConstructor === 'number' ) {
            args = scope as any[];
            scope = classConstructor as number;
            classConstructor = token;
        }

        this.token = token;
        this.classConstructor = classConstructor as any;
        this.args = args ?? [];
        this.scope = scope as number ?? -1;
    }

    public resolve ( injector : Injector ) : T {
        const args = MethodInjector.resolve( injector, this.classConstructor, null, this.args );

        const instance = new this.classConstructor( ...args );

        const memberAnnotations = collect(
            // When member is null, we're talking about constructors.
            // When parameter is not null, we're talking about method parameter injectors
            Annotate.get( this.classConstructor.prototype, InjectSchema ).filter( ann => ann.member != null && ann.metadata.parameter == null ),
            groupingBy( ann => ann.member, mapping( ann => ann.metadata, first() ) )
        );

        for ( let [ member, annotation ] of memberAnnotations ) {
            // && typeof ( instance as any )[ member ] !== 'function'
            if ( Annotate.getForMember( this.classConstructor.prototype, member, HookSchema ).length === 0 ) {
                ( instance as any )[ member ] = MethodInjector.resolveDependency( injector, this.classConstructor, annotation, instance );
            }
        }

        const factories = Annotate.get( this.classConstructor.prototype, FactorySchema );

        for ( let factory of factories ) {
            ( instance as any )[ factory.member ] = factory.metadata( instance );
        }

        const hooks = Annotate.get( this.classConstructor.prototype, HookSchema );

        for ( let hook of hooks ) {
            if ( hook.metadata.name === 'init' ) {
                const hookArgs = MethodInjector.resolve( injector, this.classConstructor, hook.member, [], instance );

                ( instance as any )[ hook.member ]( ...hookArgs );
            }
        }

        return instance;
    }
}
