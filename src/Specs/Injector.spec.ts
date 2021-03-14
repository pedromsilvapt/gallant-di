import * as test from 'tape';
import { Injector } from '../Injector';
import { ClassProvider } from '../Providers/ClassProvider';

class TestClass {
    value : number;
    
    constructor ( value : number ) {
        this.value = value;
    }
}

enum TestScopes {
    Transient = 0,
    Singleton = 1,
    ChildScope = 2
}

test( 'creating a simple class', function ( t ) {
    const injector = new Injector();

    const instance = injector.create( TestClass, [ 1 ] );

    t.ok( instance, "Returned instance is a truthy value" )
    t.assert( instance instanceof TestClass, "Instance subtype of TestClass" )
    t.equal( instance.value, 1, "Expect instance value property to be 1" );
    t.end();
} );

test( 'resolving a transient class twice', function ( t ) {
    const injector = new Injector( [
        new ClassProvider( TestClass, TestClass, TestScopes.Transient, [ 1 ] )
    ] );

    const instance1 = injector.get( TestClass );
    const instance2 = injector.get( TestClass );

    t.ok( instance1, "Returned instance1 is a truthy value" )
    t.ok( instance2, "Returned instance2 is a truthy value" )
    t.assert( instance1 instanceof TestClass, "Instance1 subtype of TestClass" )
    t.assert( instance2 instanceof TestClass, "Instance2 subtype of TestClass" )
    t.equal( instance1.value, 1, "Expect instance 1 value property to be 1" );
    t.equal( instance2.value, 1, "Expect instance 2 value property to be 1" );
    t.notStrictEqual( instance1, instance2, "Expect instance1 not to be the same as instance 2" );
    t.end();
} );

test( 'resolving a singleton class', function ( t ) {
    const injector = new Injector( [
        new ClassProvider( TestClass, TestClass, TestScopes.Singleton, [ 1 ] )
    ] );

    const instance1 = injector.get( TestClass );
    const instance2 = injector.get( TestClass );

    t.ok( instance1, "Returned instance1 is a truthy value" )
    t.ok( instance2, "Returned instance2 is a truthy value" )
    t.assert( instance1 instanceof TestClass, "Instance1 subtype of TestClass" )
    t.assert( instance2 instanceof TestClass, "Instance2 subtype of TestClass" )
    t.equal( instance1.value, 1, "Expect instance 1 value property to be 1" );
    t.equal( instance2.value, 1, "Expect instance 2 value property to be 1" );
    t.strictEqual( instance1, instance2, "Expect instance1 to be the same as instance 2" );
    t.end();
} );

test( 'resolving a singleton class from different child injectors', function ( t ) {
    const injector = new Injector( [
        new ClassProvider( TestClass, TestClass, TestScopes.Singleton, [ 1 ] )
    ] );

    const injector1 = injector.createChild( [], TestScopes.ChildScope );
    const injector2 = injector.createChild( [], TestScopes.ChildScope );

    const instance1 = injector1.get( TestClass );
    const instance2 = injector2.get( TestClass );

    t.equal( injector1.scope.id, TestScopes.ChildScope, "Returned injector1 has bigger scope than parent" )
    t.equal( injector2.scope.id, TestScopes.ChildScope, "Returned injector2 has bigger scope than parent" )

    t.ok( instance1, "Returned instance1 is a truthy value" )
    t.ok( instance2, "Returned instance2 is a truthy value" )
    t.assert( instance1 instanceof TestClass, "Instance1 subtype of TestClass" )
    t.assert( instance2 instanceof TestClass, "Instance2 subtype of TestClass" )
    t.equal( instance1.value, 1, "Expect instance 1 value property to be 1" );
    t.equal( instance2.value, 1, "Expect instance 2 value property to be 1" );
    t.strictEqual( instance1, instance2, "Expect instance1 to be the same as instance 2" );
    t.end();
} );

test( 'resolving a child scope class from different child injectors', function ( t ) {
    const injector = new Injector( [
        new ClassProvider( TestClass, TestClass, TestScopes.ChildScope, [ 1 ] )
    ] );

    const injector1 = injector.createChild( [], TestScopes.ChildScope );
    const injector2 = injector.createChild( [], TestScopes.ChildScope );

    const instance1 = injector1.get( TestClass );
    const instance2 = injector2.get( TestClass );

    t.equal( injector1.scope.id, TestScopes.ChildScope, "Returned injector1 has bigger scope than parent" )
    t.equal( injector2.scope.id, TestScopes.ChildScope, "Returned injector2 has bigger scope than parent" )

    t.ok( instance1, "Returned instance1 is a truthy value" )
    t.ok( instance2, "Returned instance2 is a truthy value" )
    t.assert( instance1 instanceof TestClass, "Instance1 subtype of TestClass" )
    t.assert( instance2 instanceof TestClass, "Instance2 subtype of TestClass" )
    t.equal( instance1.value, 1, "Expect instance 1 value property to be 1" );
    t.equal( instance2.value, 1, "Expect instance 2 value property to be 1" );
    t.notStrictEqual( instance1, instance2, "Expect instance1 not to be the same as instance 2" );
    t.end();
} );

test( 'resolving an overriden child scope class from different child injectors', function ( t ) {
    const injector = new Injector( [
        new ClassProvider( TestClass, TestClass, TestScopes.ChildScope, [ 1 ] )
    ] );

    const injector2 = injector.createChild( [ new ClassProvider( TestClass, TestClass, TestScopes.ChildScope, [ 2 ] ) ], true );
    const injector1 = injector.createChild( [], true );

    const instance1 = injector1.get( TestClass );
    const instance2 = injector2.get( TestClass );

    t.equal( injector1.scope.id, TestScopes.ChildScope, "Returned injector1 has bigger scope than parent" )
    t.equal( injector2.scope.id, TestScopes.ChildScope, "Returned injector2 has bigger scope than parent" )

    t.ok( instance1, "Returned instance1 is a truthy value" )
    t.ok( instance2, "Returned instance2 is a truthy value" )
    t.assert( instance1 instanceof TestClass, "Instance1 subtype of TestClass" )
    t.assert( instance2 instanceof TestClass, "Instance2 subtype of TestClass" )
    t.equal( instance1.value, 1, "Expect instance 1 value property to be 1" );
    t.equal( instance2.value, 2, "Expect instance 2 value property to be 1" );
    t.notStrictEqual( instance1, instance2, "Expect instance1 not to be the same as instance 2" );
    t.end();
} );

test( 'resolving a child scoped from a global injector should throw', function ( t ) {
    const injector = new Injector( [
        new ClassProvider( TestClass, TestClass, TestScopes.ChildScope, [ 1 ] )
    ] );

    t.throws( () => injector.get( TestClass ), 'Cannot instantiate child scoped provider' );
    t.end();
} );