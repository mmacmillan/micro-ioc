var assert = require('assert'),
    ioc = require('../ioc.js');

var messages = {
    'no-instance': 'no object was returned for the given key'
};

describe('As a Container', function() {


    //** note: each test starts with an empty container
    beforeEach(function() {
        ioc.clear();
    });

    afterEach(function() {
        ioc.removeAllListeners();
    });



    it('can define an object module', function() {

        define('simple-object', {
            name: 'a simple object',
            someFn: function() { return true }
        });

        var obj = ioc('simple-object');

        assert(!!obj, messages['no-instance']);
        assert(!!obj.someFn());
    });

    it('can define a module using a factory', function() {

        define('simple-object', function() {
            return {
                name: 'a simple object',
                someFn: function() { return true }
            }
        });

        var obj = ioc('simple-object');

        assert(!!obj, messages['no-instance']);
        assert(!!obj.someFn());
    });


    it('can define a module with dependencies', function() {

        define('simple-object', {
            name: 'a simple object',
            someFn: function() { return true }
        });

        define('simple-object2', ['simple-object'], function(simpleObject) {
            return {
                name: 'simple object 2',
                anotherFn: function() {
                    return !!simpleObject.someFn();
                }
            }
        });

        var obj = ioc('simple-object2');

        assert(!!obj, messages['no-instance']);
        assert(!!obj.anotherFn());
    });


    it('can handle the event when a module is created', function() {
        var created = false;

        ioc.on('module:create', function(ctx) {
            ctx.module.key == 'simple-object' && (created = true);
        });


        define('simple-object', function() {
            return {
                name: 'a simple object',
                someFn: function() { return true }
            }
        });

        var obj = ioc('simple-object');

        assert(!!obj, messages['no-instance']);
        assert(!!created);
    });


    it('can handle resolution errors for individual modules', function() {
        var resolved = true;

        ioc.on('resolve:error', function(ctx) {
            if(ctx.key == 'a-missing-module')
                resolved = false;
        });

        //** attempt to obtain an instance of a non-existing module
        var obj = ioc('a-missing-module');

        assert(!resolved);
    });

    it('can handle resolution errors for all modules when initializing the container', function() {
        var resolved = true;

        define('simple-object', {
            name: 'a simple object'
        });

        define('cant-be-resolved', ['a-missing-module'], function(missingModule) {
            name: 'an unresolvable module'
        });

        ioc.on('unresolved', function(modules) {
            if(modules.length > 0 && modules[0].key == 'cant-be-resolved')
                resolved = false;
        });

        //** initialize all the modules in the container
        ioc.initialize()

        assert(!resolved);
    });


    it('shared dependencies are only resolved once ', function() {

        //** count how many times each module is created
        var counts = {};
        ioc.on('module:create', function(args) {
            !counts[args.module.key]
                ? counts[args.module.key] = 1
                : counts[args.module.key] += 1;
        });


        define('simple-object', function() {
            return {
                name: 'a simple object',
                someFn: function() { return 'one'; }
            }
        });

        define('simple-object2', ['simple-object'], function(simpleObject) {
            return {
                name: 'simple object 2',
                anotherFn: function() { return simpleObject.someFn() + ' two'; }
            }
        });

        define('simple-object3', ['simple-object2', 'simple-object'], function(simpleObject2, simpleObject) {
            return { name: simpleObject2.anotherFn() + ' three!', }
        });


        var obj = ioc('simple-object3');

        assert(!!obj, messages['no-instance']);
        assert(obj.name == 'one two three!');

        //** ensure simple-object, although shared, is created just once
        assert(counts['simple-object'] == 1);
    });


    it('circular dependencies are not resolved, and can be handled', function() {
        var isCircular = false;

        //** listen for the circular event, setting a flag if detected
        ioc.on('circular', function(args) { 
            isCircular = true;
        });


        define('parent-object', ['child-object'], function(child) {
            return { 
                test: function() { return !!child }
            }
        });

        define('child-object', ['parent-object'], function(parent) {
            return { 
                test: function() { return !!parent }
            }
        });


        //** get the parent object, forcing resolution, and handling of the circular
        var obj = ioc('parent-object');

        assert(!!obj, messages['no-instance']);
        assert(isCircular == true);
    });

});


describe('As a Service Locator', function() {

    //** note: each test starts with an empty container
    beforeEach(function() {
        ioc.clear();
    });

    afterEach(function() {
        ioc.removeAllListeners();
    });

    it('modules can be retrieved by their name/key', function() {

        define('some-module', {
            someField: 'some value'
        });

        var obj = ioc('some-module');

        assert(!!obj, messages['no-instance']);
        assert(obj.someField == 'some value');
    });

    it.skip('a collection of modules can be retrieved by their path', function() {
    });

});
