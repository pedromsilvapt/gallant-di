# @gallant/di

> Straighforward Dependency Injection for Typescript/JavaScript applications

# Installation
```shell
npm install --save @gallant/di
```

# Usage
```typescript
import { Injector, Inject } from '@gallant/di';

class TransportLayer {
    // ...
}

class Request {
    public constructor ( public value: number ) {}
}

class Response {
    public constructor ( public value: number ) {}
}

class ServiceServer {
    // Supports member injection
    // The `Injector` token is always available
    @Inject()
    injector : Injector = null;

    // As well as constructor injection
    constructor ( @Inject() public transport : TransportLayer ) {
        this.transport.on( 'request', value => {
            // Create a child injector with the request provider and a scoped lifetime
            const scopedInjector = this.injector.createChild( [ Request, Response ], ServiceLifetime.Scoped );

            scopedInjector.get( Request ).value = value;
    
            // Call this.execute and auto-inject the arguments
            scopedInjector.call( this, 'execute' );

            console.log( scopedInjector.get( Response ).value );
        } );
    }

    execute ( @Inject() request: Request, @Inject() response: Response ) {
        response.value = request.value * 2;
    }
}

const mainServiceInjector = Injector.createRoot( [
    TransportLayer,
    ServiceServer,
], ServiceLifetime.Singleton );

const server = mainServiceInjector.get( ServiceServer );
const transport = mainServiceInjector.get( TransportLayer );

assert(server.transport == transport, "Services are singleton");

transport.emit( 'request', 1 );
transport.emit( 'request', 2 );
```
