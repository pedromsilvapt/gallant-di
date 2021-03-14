import { Injector, Inject } from '@gallantjs/di';
import { assert } from 'node:console';

// See https://docs.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.servicelifetime
enum ServiceLifetime {
    // The transient lifetime must always be zero, creates a new instance every time
    Transient = 0,
    // One global instance per injector
    Singleton = 1,
    // One instance per request
    Scoped = 2,
}

class TransportLayer {
    protected listener: (value: number) => void;

    on ( topic: string, callback: (value: number) => unknown ): void {
        this.listener = callback;
    }

    emit ( topic: string, value: number ): void {
        this.listener(value);
    }
}

class Request {
    public constructor ( public value: number ) {}
}

class Response {
    public constructor ( public value: number ) {}
}

class ServiceServer {
    // Supports member injection
    @Inject()
    injector : Injector = null;

    // As well as constructor injection
    constructor ( @Inject() public transport : TransportLayer ) {
        this.transport.on( 'request', value => {
            // Create a child injector with the request provider and a scoped lifetime
            const scopedInjector = this.injector.createChild( [ Request, Response ], ServiceLifetime.Scoped );

            scopedInjector.get(Request).value = value;
    
            // Call this.execute and auto-inject the arguments
            scopedInjector.call( this, 'execute' );

            console.log(scopedInjector.get(Response).value);
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

assert(server.transport == transport);

transport.emit('request', 1);
transport.emit('request', 2);