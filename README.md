#micro-ioc.js

>A simple "do one thing" Container/Service Locator, facilitating an IoC/DI design pattern for your NodeJS applications

The [Inversion of Control](https://en.wikipedia.org/wiki/Inversion_of_control)/[Depedency Injection](https://en.wikipedia.org/wiki/Dependency_injection) design patterns provide a great way to build loosely coupled, modular systems.  Developers can reduce concrete dependencies on specific modules when needed, by following a [design-by-contract](https://en.wikipedia.org/wiki/Design_by_contract) approach, creating depedencies on abstractions, allowing the Container to provide the implementation.  This design can help increase the reusability, testability, and maintainability, while generally helping "future proof" your application.  

None of these concepts are new, especially not to javascript, and there are several options that support IoC/DI.  The motivation for micro-js was the need for a simple un-opinionated Container/Service Locator, with a familiar API, while not introducing any proprietary syntax/concepts for loading dependencies or providing coupling.  micro-ioc conforms to the [AMD-js API](https://github.com/amdjs/amdjs-api/wiki/AMD), with exception to supporting commonJS within the factory methods themselves (by design).  If you are familiar with other AMD libraries such as [RequireJS](http://requirejs.org), you already know how to use micro-ioc. 

###Installing
>npm install micro-ioc

###Defining a Module

    //sampleModule.js
    define('sampleModule', {
        var myModule = { 
            someMethod: function() { ... }
        }

        return myModule;
    });

###Defining a Module with dependencies

    define('sampleModule', ['otherModule'], function(otherModule) {
        var myModule = { 
            someMethod: function() { 
                return otherModule.anotherMethod();
            }
        }

        return myModule;
    });
