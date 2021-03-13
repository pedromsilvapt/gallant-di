import * as test from 'tape';
import { Injector } from '../../Injector';
import { ClassProvider } from '../../Providers/ClassProvider';
import { Inject } from '../../Decorators/Inject';

class DepA { }
class DepB { }

enum TestScopes {
    Transient = 0,
    Singleton = 1,
    ChildScope = 2
}

test( 'resolving DepC', function ( t ) {
    @Inject()
    class DepC {
        depA : DepA;
        
        @Inject()
        depB : DepB;

        constructor ( depA : DepA ) {
            this.depA = depA;
        }
    }
    
    const injector = new Injector( [
        new ClassProvider( DepA, DepA ),
        new ClassProvider( DepB, DepB ),
        new ClassProvider( DepC, DepC )
    ] );

    const instance = injector.create( DepC, [ 1 ] );

    t.ok( instance, "Returned instance is a truthy value" )
    t.assert( instance instanceof DepC, "Instance subtype of DepC" )
    t.ok( instance.depA, "Instance.depA is a truthy value" )
    t.assert( instance.depA instanceof DepA, "Instance.depA subtype of DepA" )
    t.ok( instance.depB, "Instance.depB is a truthy value" )
    t.assert( instance.depB instanceof DepB, "Instance.depB subtype of DepB" )
    t.end();
} );
