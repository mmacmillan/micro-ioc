#micro-ioc.js

>A simple "do one thing" Container, facilitating an IoC/DI design pattern for your NodeJS applications

The [Inversion of Control](https://en.wikipedia.org/wiki/Inversion_of_control)/[Depedency Injection](https://en.wikipedia.org/wiki/Dependency_injection) design patterns provide a great way to build loosely coupled, modular systems.  When building your application, DI can help apply concepts like [design-by-contract](https://en.wikipedia.org/wiki/Design_by_contract) to reduce concrete dependencies, [mock-objects](http://) to improve testability, and so on.   However, these benefits can often come with of the cost of adopting a complex framework, or unfamiliar/non-standard techniques for defining and utilizing your modules.

The motivation for micro-js was the need for a simple, standalone Container/Service Locator, with a familiar API, while not introducing any complex syntax/concepts for defining modules/providing coupling.  

micro-ioc conforms to the [AMD-js API](https://github.com/amdjs/amdjs-api/wiki/AMD).

###Installing
>npm install micro-ioc

###Defining an Object Module

    define('sampleModule', {
        description: 'a sample module',
        someMethod: function() { 
            ... 
        }
    });

###Defining a Module using a Factory

    define('sampleModule', function() {
        var privateName = 'sample module';

        return {
            description: 'a module called '+ privateName,
            someMethod: function() { 
                ... 
            }
        }
    });


###Defining a Module with dependencies

    define('otherModule', ['sampleModule'], function(sampleModule) {
        return { 
            description: 'otherModule, using: '+ sampleModule.description,
            anotherMethod: function() { 
                var output = sampleModule.someMethod();
                return output + 1;
            }
        }
    });

###Running the tests
>mocha tests

The tests provide good basic usage examples, and can help quickly understand the functionality micro-ioc intends to provide.
