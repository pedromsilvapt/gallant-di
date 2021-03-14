import { InjectFlags, Injector } from './Injector';
import { Annotate } from '@gallant/annotate';
import { InjectSchema, InjectOptions } from './Decorators';
import { ValueProvider } from './Providers/ValueProvider';

export interface Class<T> {
    new ( ...args : any[] ) : T;
}

export class MethodInjector {
    public static resolveDependency<T> ( injector : Injector, classConstructor: Class<T>, dependency : InjectOptions, self ?: any ) : any {
        if ( dependency.provideSelf ) {
            if ( !self ) {
                throw new Error( `Cannot provide self for a constructor dependency in ${ classConstructor }.` );
            }

            injector = injector.createChild( [ new ValueProvider( classConstructor, self ) ] );
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

    public static resolveAllDependencies<T> ( injector : Injector, classConstructor: Class<T>, dependencies : InjectOptions[], self ?: T ) : [ number, any ][] {
        return dependencies.map( dep => [ dep.parameter, this.resolveDependency( injector, classConstructor, dep, self ) ] as any );
    }

    public static getConstructorDependencies<T> ( classConstructor: Class<T> ) : InjectOptions[] {
        // TODO classConstructor[ Injector.dependencies ]
        return Annotate.getForClass( classConstructor, InjectSchema ).map( ann => ann.metadata );
    }
    
    public static getMemberDependencies<T> ( classConstructor: Class<T>, member : string | symbol ) : InjectOptions[] {
        return Annotate.getForMember( classConstructor, member, InjectSchema ).map( ann => ann.metadata );
    }

    public static mixArguments ( dependencies : [ number, any ][], inputArgs : any[] ) : any[] {
        dependencies.sort((a, b) => a[0] - b[0]);

        inputArgs = inputArgs.slice();

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

        args.push( ...inputArgs );
        
        return args;
    }

    public static resolve<T> ( injector: Injector, objectClass: Class<T>, method: string | symbol, manualArgs: any[], self ?: T ): any[] {
        // When method is null, we are talking about the constructor
        const injectOptions = method != null
            ? MethodInjector.getMemberDependencies( objectClass, method )
            : MethodInjector.getConstructorDependencies( objectClass );

        const dependencies = MethodInjector.resolveAllDependencies( injector, objectClass, injectOptions, self );

        const args = MethodInjector.mixArguments( dependencies, manualArgs );

        return args;
    }

    public static call<T, M extends keyof T> ( injector: Injector, objectClass: T, method: M, manualArgs: any[] ) : T[M] extends ((...args: any[]) => infer R) ? R : any;
    public static call<T, M extends keyof T> ( injector: Injector, objectClass: Class<T>, method: null | undefined, manualArgs: any[] ) : T;
    public static call<T, M extends keyof T> ( injector: Injector, objectClass: T | Class<T>, method: M, manualArgs: any[] ) : any {
        if ( method == null ) {
            const args = this.resolve( injector, objectClass as Class<T>, null, manualArgs );
            
            return new (objectClass as Class<T>)( ...args );
        } else {
            const args = this.resolve( injector, objectClass.constructor.prototype as Class<T>, method as any, manualArgs, objectClass as T );
            
            return (( objectClass as T )[ method ] as any)( ...args );
        }
    }
}
