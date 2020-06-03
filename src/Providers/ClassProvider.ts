import { Provider } from './Provider';
import { Injector, InjectFlags } from '../Injector';
import { Annotate } from '@gallant/annotate';
import { InjectSchema, InjectOptions, FactorySchema } from '../Decorators';
import { collect, sorting, groupingBy, mapping, first } from 'data-collectors';
import { ValueProvider } from './ValueProvider';
import { HookSchema, Hook } from '../Decorators/Hook';

export interface Class<T> {
    new ( ...args : any[] ) : T;
}

export class ClassProvider<T> extends Provider<T> {
    classConstructor : Class<T>;

    singleton : boolean;

    args : any[];

    protected instance : T = null;

    constructor ( token : any, classConstructor : Class<T>, singleton : boolean = true, args : any[] = [] ) {
        super();

        this.token = token;
        this.classConstructor = classConstructor;
        this.args = args;
        this.singleton = singleton;
    }

    public resolveDependency ( injector : Injector, dependency : InjectOptions, self ?: T ) : any {
        if ( dependency.provideSelf ) {
            if ( !self ) {
                throw new Error( `Cannot provide self for a constructor dependency in ${ this.token } ${ this.classConstructor }.` );
            }

            injector = injector.createChild( [ new ValueProvider( this.classConstructor, self ) ] );
        }

        if ( dependency.provides ) {
            injector = injector.createChild( dependency.provides );
        }

        let value = dependency.args instanceof Array
            ? injector.create( dependency.token, dependency.args, dependency.flags || InjectFlags.Default )
            : injector.get( dependency.token, dependency.flags || InjectFlags.Default );

        if ( dependency.flags & InjectFlags.Optional && value === null && 'defaultValue' in dependency ) {
            value = dependency.defaultValue;
        }

        return value;
    }

    public resolveAllDependencies ( injector : Injector, dependencies : InjectOptions[], self ?: T ) : [ number, any ][] {
        return dependencies.map( dep => [ dep.parameter, this.resolveDependency( injector, dep, self ) ] as any );
    }

    public getConstructorDependencies () : InjectOptions[] {
        // TODO this.classConstructor[ Injector.dependencies ]
        return Annotate.getForClass( this.classConstructor, InjectSchema ).map( ann => ann.metadata );
    }
    
    public getMemberDependencies ( member : string | symbol ) : InjectOptions[] {
        return Annotate.getForMember( this.classConstructor, member, InjectSchema ).map( ann => ann.metadata );
    }

    public mixArguments ( dependencies : [ number, any ][], inputArgs : any[] ) : any[] {
        inputArgs = [].slice();

        const args : any[] = [];

        let lastIndex = 0;

        for ( let [ index, value ] of dependencies ) {
            while ( typeof index === 'number' && lastIndex < index ) {
                if ( inputArgs.length > 0 ) args.push( inputArgs.shift() );
                else args.push( null );

                lastIndex += 1;
            }

            args.push( value );

            lastIndex += 1;
        }
        
        return args;
    }

    public resolve ( injector : Injector ) : T {
        if ( this.instance != null ) {
            return this.instance;
        }

        const args = this.mixArguments( this.resolveAllDependencies( injector, this.getConstructorDependencies() ), this.args );

        const instance = new this.classConstructor( ...args );

        const memberAnnotations = collect( 
            Annotate.get( this.classConstructor.prototype, InjectSchema ).filter( ann => ann.member != null ),
            groupingBy( ann => ann.member, mapping( ann => ann.metadata, first() ) )
        );

        for ( let [ member, annotation ] of memberAnnotations ) {
            if ( Annotate.getForMember( this.classConstructor.prototype, member, HookSchema ).length === 0 ) {
                ( instance as any )[ member ] = this.resolveDependency( injector, annotation, instance );
            }
        }

        const factories = Annotate.get( this.classConstructor.prototype, FactorySchema );

        for ( let factory of factories ) {
            ( instance as any )[ factory.member ] = factory.metadata( instance );
        }

        const hooks = Annotate.get( this.classConstructor.prototype, HookSchema );

        for ( let hook of hooks ) {
            if ( hook.metadata.name === 'init' ) {
                const hookArgs = this.resolveAllDependencies( injector, this.getMemberDependencies( hook.member ), instance );

                ( instance as any )[ hook.member ]( ...hookArgs );
            }
        }

        if ( this.singleton ) {
            this.instance = instance;
        }

        return instance;
    }
}