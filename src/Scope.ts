export class Scope {
    static createChild ( scope : number | boolean | Scope, parentScope : Scope = null ) : Scope {
        // If scope is a boolean, it's behavior is as follows:
        //  - true: Create a new scope above the parent scope. If there is no parent scope, then create a scope with id 1
        //  - false: Return the parent scope. If there is no parent scope, then create a scope with id 1
        if ( typeof scope === 'boolean' ) {
            if ( scope == true ) {
                return new Scope( ( parentScope?.id ?? 0 ) + 1 );
            } else {
                return ( parentScope ?? new Scope( 1 ) );
            }
        // If the scope is a number, just create a scope with that id
        // And treat it the same as if a scope object was passed
        } else if ( typeof scope === 'number' ) {
            scope = new Scope( scope );
        }

        if ( scope.id < 1 ) {
            throw new Error( `Negative valued scopes are not valid.` );
        }

        if ( scope.id < ( parentScope?.id ?? 0 ) ) {
            throw new Error( `Cannot create child scope "${ scope.id }" for parent with larger scope "${ parentScope?.id }"` )
        }

        return scope;
    }

    public id : number;

    public constructor ( id : number ) {
        this.id = id;
    }
}

export enum InjectorScopes {
    Transient = 0,
    Singleton = 1
}
