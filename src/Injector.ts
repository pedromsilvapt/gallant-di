import { Provider } from './Providers/Provider';
import { ClassProvider, Class } from './Providers/ClassProvider';
import { ValueProvider } from './Providers/ValueProvider';
import { TaggedProvider } from './Providers/TaggedProvider';
import { InjectorScopes, Scope } from './Scope';
import { MethodInjector } from './MethodInjector';

interface Cached<T> {
    value : T;
    owner : BaseInjector;
    injector : BaseInjector;
}

export enum InjectFlags {
    Default = 0,
    Optional = 1 << 0,
    SkipSelf = 1 << 1,
    Self = 1 << 2,
    SkipCache = 1 << 3,

    // Experimental (DO NOT USE)
    DontCache = 1 << 4,
    Scoped = 1 << 5,
    Unscoped = 1 << 6
}

export class TokenNotFoundError extends Error {
    constructor ( token : any ) {
        if ( token == null ) {
            super( `Could not retrieve the dependency for token '${ token }'. Tip: If you are just setting up the project, make sure you have the flag "emitDecoratorMetadata" set to \`true\` in your 'tsconfig.json' file!` );
        } else if ( token.constructor?.name != null ) {
            super( `Could not retrieve the dependency for token '${ token.constructor.name }'.` );
        } else {
            super( `Could not retrieve the dependency for token '${ token }'.` );
        }
    }
}

export class InvalidTagProviderError extends Error {
    constructor ( token : any ) {
        super( `Invalid tag provider ${ token }.` );
    }
}

export class BaseInjector {
    public parent : BaseInjector;

    public scope : Scope;

    /**
     * In order to avoid going up the injectors' tree, cache
     */
    protected providersCache ?: Map<any, Cached<Provider<any>>> = new Map();

    /**
     * Some dependencies can be cached and don't need to be resolved all the time
     */
    protected cache ?: Map<any, Cached<any>> = new Map();

    /**
     * Associates an identifying token with each provider
     */
    protected providers : Map<any, Provider<any>> = new Map();

    public readonly mutable : boolean = false;

    constructor ( providers : ( Class<any> | Provider<any> )[] = [], parent : BaseInjector = null, scope : boolean | number | Scope = false ) {
        this.parent = parent;

        this.scope = Scope.createChild( scope, parent?.scope );

        for ( let provider of providers ) {
            this.add( provider );
        }

        this.add( new ValueProvider( Injector, this ) );
    }

    protected add ( provider : Class<any> | Provider<any> ) : void {
        if ( !( provider instanceof Provider ) ) {
            provider = new ClassProvider( provider, provider ) as Provider<any>;
        }

        // When a provider is registered with a scope lower than 0, it means
        // the scope should be the same as the injector's scope
        if ( provider.scope < 0 ) {
            provider.scope = this.scope.id;
        }

        this.providers.set( provider.token, provider );
    }

    /**
     * Traverses up the injector chain looking for a matching token provider. It then analyzes the token and identifies it's scope.
     */
    protected locateInternal<T> ( token : any, flags : InjectFlags = InjectFlags.Default, forceProviders : boolean = false ) : [ BaseInjector, BaseInjector, Provider<T>, T, boolean ] {
        if ( !( flags & InjectFlags.SkipCache ) ) {
            // First steps are checking the caches
            if ( !forceProviders && this.cache.has( token ) ) {
                const located = this.cache.get( token );

                // If the cached item is not from here, but we have specifically
                // asked for providers from this injector alone, return not found
                if ( flags & InjectFlags.Self && located.owner != this ) {
                    return null;
                }

                return [ located.owner, located.injector, null, located.value, true ];
            }

            if ( this.providersCache.has( token ) ) {
                const located = this.providersCache.get( token );

                // If the cached item is not from here, but we have specifically
                // asked for providers from this injector alone, return not found
                if ( flags & InjectFlags.Self && located.owner != this ) {
                    if ( flags & InjectFlags.Optional ) {
                        return null;
                    }
                }

                return [ located.owner, located.injector, located.value, null, true ];
            }
        }

        if ( this.providers.has( token ) ) {
            return [ this, this, this.providers.get( token ), null, false ];
        }

        if ( this.parent != null && !( flags & InjectFlags.Self ) ) {
            const match = this.parent.locateInternal<T>( token, flags, forceProviders );

            if ( match != null && match[ 2 ] != null ) {
                // When the scope is 0, it's injector is the lowest possible
                // When the scope is > 0, then it's injector is the lowest inside the same scope
                // Also when the scope is < owner.scope.id, then it's injector is the lowest insize the owner's same scope
                // match[ 2 ] is the provider's scope
                // match[ 0 ] is the owner's scope
                let scope = Math.max( match[ 2 ].scope, match[ 0 ].scope.id );

                // 1 - singleton, 2 - requests, 0 - transient

                if ( scope < 1 || this.scope.id <= scope ) {
                    match[ 1 ] = this;
                }
            }

            return match;
        }

        return null;
    }

    public locate<T> ( token : any, flags ?: InjectFlags ) : [ Injector, Injector, Provider<T> ] {
        const result = this.locateInternal<T>( token, flags, true );

        if ( !result ) {
            return [ null, null, null ];
        }

        return [ result[ 0 ], result[ 1 ], result[ 2 ] ];
    }

    public get<T> ( token : Class<T>, flags ?: InjectFlags ) : T;
    public get<T> ( token : any, flags ?: InjectFlags ) : T;
    public get<T> ( token : any, flags : InjectFlags = InjectFlags.Default ) : T {
        // - When both the SkipSelf and Self flags are enabled, no match will ever be found (obviously)
        // Since it is impossible to find something that is at the same time anywhere but here, and also forcefully here
        // - Also when skipping self, but self is the root, there won't be anything to find
        if ( ( flags & InjectFlags.SkipSelf && flags & InjectFlags.Self )
          || ( flags & InjectFlags.SkipSelf && this.parent == null ) ) {
            if ( flags & InjectFlags.Optional ) {
                return null;
            } else {
                throw new TokenNotFoundError( token );
            }
        }

        if ( flags & InjectFlags.SkipSelf ) {
            return this.parent.get( token, flags & ~InjectFlags.SkipSelf );
        }

        const match = this.locateInternal<T>( token, flags );

        if ( match == null ) {
            if ( flags & InjectFlags.Optional ) {
                return null;
            } else {
                throw new TokenNotFoundError( token );
            }
        }

        let [ owner, injector, provider, value, cached ] = match;

        // We either return a provider or a value
        // So if we got a provider, it means we have got to resolve it first
        if ( provider != null ) {
            // Scope N == 0 (reserved) stands for unscoped providers: can be instantiated anywhere by any injector
            // Scope N >= 1: The bigger N, the more specific the scope. A more general scope N == 1 (singleton, for example)
            //               cannot depend on a more specific scope N == 2 (request scope, for example)
            if ( injector.scope.id < provider.scope ) {
                throw new Error( `Cannot intantiate provider with scope ${ provider.scope } from an injector with scope ${ injector.scope.id }.` );
            }

            value = provider.resolve( injector );

            // Providers can always be cached. In the future, we will have to be cognizant of mutable injectors in
            // the middle of the injection chain, and also a way of caching missing dependencies as well
            if ( provider.scope == 0 && !cached && !( flags & InjectFlags.SkipCache ) ) {
                this.providersCache.set( token, { owner: owner, injector: this, value: provider } );
            }
        }

        const cachedInjector = provider == null && cached;
        const cachedHere = cachedInjector && owner == this;

        // We already cached the provider. Now some providers don't allow their values to be cached
        // because they might want to return a new one every time they are resolved
        // So we have to check if the value was already cached (which means it's provider allows cache)
        // or if we're caching it for the first time, the provider must allow it
        if ( !( flags & InjectFlags.SkipCache ) && ( provider == null || provider.scope > 0 ) ) {
            if ( !cachedInjector ) {
                injector.cache.set( token, { owner: injector, injector, value } );
            }

            if ( !cachedHere ) {
                this.cache.set( token, { owner: this, injector, value } );
            }
        }

        return value;
    }

    public create<T> ( constructor : Class<T>, args : any[] = [], flags : InjectFlags = InjectFlags.Default ) : T {
        return new ClassProvider( constructor, constructor, 0, args ).resolve( this );
    }

    public createChild ( providers : ( Class<any> | Provider<any> )[] = [], scope : boolean | number | Scope = false ) : BaseInjector {
        return new BaseInjector( providers, this, scope );
    }

    public tag ( tag : any, tokens : any[] ) : void {
        if ( !this.providers.has( tag ) ) {
            this.providers.set( tag, new TaggedProvider( tag ) );
        }

        const provider = this.providers.get( tag );

        if ( provider instanceof TaggedProvider ) {
            provider.addAll( tokens );
        } else {
            throw new InvalidTagProviderError( tag );
        }
    }

    public call<T, M extends keyof T> ( objectClass: T, method: M, ...manualArgs: any[]) : T[M] extends ((...args: any[]) => (infer R)) ? R : string;
    public call<T, M extends keyof T> ( objectClass: Class<T>, method: null | undefined, ...manualArgs: any[]) : T;
    public call<T, M extends keyof T> ( objectClass: T | Class<T>, method: M, ...manualArgs: any[]) : any {
        return MethodInjector.call( this, objectClass as any, method, manualArgs );
    }
}

export class MutableInjector extends BaseInjector {
    public readonly mutable : boolean = true;

    public add ( provider : Class<any> | Provider<any> ) : void {
        super.add( provider );
    }

    public set ( token : any, provider : Class<any>, scope : number = -1 ) : void {
        this.add( new ClassProvider( token, provider ) );
    }
}

export class Injector extends BaseInjector {
    static readonly main : MutableInjector = new MutableInjector();

    public static get<T> ( token : Class<T>, flags ?: InjectFlags ) : T;
    public static get<T> ( token : any, flags ?: InjectFlags ) : T;
    public static get<T> ( token : any, flags : InjectFlags = InjectFlags.Default ) : T {
        return this.main.get( token, flags );
    }

    public static create<T> ( constructor : Class<T>, args : any[] = [], flags : InjectFlags = InjectFlags.Default ) : T {
        return this.main.create( constructor, args, flags );
    }

    public static createChild ( providers : ( Class<any> | Provider<any> )[] ) : BaseInjector {
        return this.main.createChild( providers );
    }

    public static createRoot ( providers : ( Class<any> | Provider<any> )[] = [], scope: number = InjectorScopes.Singleton ) {
        return new BaseInjector( providers, null, scope );
    }

    public static add ( provider : Class<any> | Provider<any> ) : void {
        this.main.add( provider );
    }

    public static set ( token : any, provider : Class<any> ) : void {
        this.main.add( new ClassProvider( token, provider ) );
    }
}
