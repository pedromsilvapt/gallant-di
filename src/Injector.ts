import { Provider } from './Providers/Provider';
import { ClassProvider, Class } from './Providers/ClassProvider';
import { ValueProvider } from './Providers/ValueProvider';
import { TaggedProvider } from './Providers/TaggedProvider';

interface Cached<T> {
    value : T;
    owner : BaseInjector;
}

export enum InjectFlags {
    Default = 0,
    Optional = 1 << 0,
    SkipSelf = 1 << 1,
    Self = 1 << 2,
    SkipCache = 1 << 3
}

export class TokenNotFoundError extends Error {
    constructor ( token : any ) {
        super( `Could not retrieve the dependency for token ${ token }.` );
    }
}

export class InvalidTagProviderError extends Error {
    constructor ( token : any ) {
        super( `Invalid tag provider ${ token }.` );
    }
}

export class BaseInjector {
    public parent : BaseInjector;

    /**
     * Associates an identifying token with each provider
     */
    protected providers : Map<any, Provider<any>> = new Map();

    /**
     * In order to avoid going up the injectors' tree, cache 
     */
    protected providersCache ?: Map<any, Cached<Provider<any>>> = new Map();

    /**
     * Some dependencies can be cached and don't need to be resolved all the time
     */
    protected cache ?: Map<any, Cached<any>> = new Map();

    public readonly mutable : boolean = false;

    constructor ( providers : ( Class<any> | Provider<any> )[] = [], parent : BaseInjector = null ) {
        this.parent = parent;

        for ( let provider of providers ) {
            this.add( provider );
        }

        this.add( new ValueProvider( Injector, this ) );
    }

    protected add ( provider : Class<any> | Provider<any> ) : void {
        if ( !( provider instanceof Provider ) ) {
            provider = new ClassProvider( provider, provider ) as Provider<any>;
        }

        this.providers.set( provider.token, provider );
    }

    protected locateInternal<T> ( token : any, flags : InjectFlags = InjectFlags.Default, forceProviders : boolean = false ) : [ BaseInjector, Provider<T>, T, boolean ] {
        if ( !( flags & InjectFlags.SkipCache ) ) {
            // First steps are checking the caches
            if ( !forceProviders && this.cache.has( token ) ) {
                const located = this.cache.get( token );

                // If the cached item is not from here, but we have specifically
                // asked for providers from this injector alone, return not found
                if ( flags & InjectFlags.Self && located.owner != this ) {
                    return null;
                }

                return [ located.owner, null, located.value, true ];
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

                return [ located.owner, located.value, null, true ];
            }
        }
        
        if ( this.providers.has( token ) ) {
            return [ this, this.providers.get( token ), null, false ];
        }

        if ( this.parent != null && !( flags & InjectFlags.Self ) ) {
            return this.parent.locateInternal( token, flags, forceProviders );
        }

        return null;
    }

    public locate<T> ( token : any, flags ?: InjectFlags ) : [ Injector, Provider<T> ] {
        const result = this.locateInternal<T>( token, flags );

        if ( !result ) {
            return [ null, null ];
        }

        return [ result[ 0 ], result[ 1 ] ];
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

        let [ injector, provider, value, cached ] = match;

        const cachedHere = cached && injector == this;

        // We either return a provider or a value
        // So if we got a provider, it means we have got to resolve it first
        if ( provider != null ) {
            value = provider.resolve( this );

            // Providers can always be cached. In the future, we will have to be cognizant of mutable injectors in
            // the middle of the injection chain, and also a way of caching missing dependencies as well
            if ( !cachedHere && !( flags & InjectFlags.SkipCache ) ) {
                this.providersCache.set( token, { owner: injector, value: provider } );
            }
        }

        // We already cached the provider. Now some providers don't allow their values to be cached
        // because they might want to return a new one every time they are resolved
        // So we have to check if the value was already cached (which means it's provider allows cache)
        // or if we're caching it for the first time, the provider must allow it
        if ( !( flags & InjectFlags.SkipCache ) && ( !cachedHere || provider != null ) && ( !provider || provider.cacheable == true ) ) {
            this.cache.set( token, { owner: injector, value } );
        }

        return value;
    }

    public create<T> ( constructor : Class<T>, args : any[] = [], flags : InjectFlags = InjectFlags.Default ) : T {
        return new ClassProvider( constructor, constructor, false, args ).resolve( this );
    }

    public createChild ( providers : ( Class<any> | Provider<any> )[] ) : BaseInjector {
        return new BaseInjector( providers, this );
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
}

export class MutableInjector extends BaseInjector {
    public readonly mutable : boolean = true;

    public add ( provider : Class<any> | Provider<any> ) : void {
        super.add( provider );
    }

    public set ( token : any, provider : Class<any> ) : void {
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

    public static add ( provider : Class<any> | Provider<any> ) : void {
        this.main.add( provider );
    }

    public static set ( token : any, provider : Class<any> ) : void {
        this.main.add( new ClassProvider( token, provider ) );
    }
}