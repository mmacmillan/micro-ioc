var assert = require('assert'),
    ioc = require('../ioc.js');

var messages = {
    'no-instance': 'no object was returned for the given key'
};

describe('As a container', function() {


    //** note: each test starts with a blank container
    beforeEach(function() {
        ioc.clear();
    });

    afterEach(function() {
        ioc.removeAllListeners();
    });



    it('can define a simple object', function() {

        define('simple-object', {
            name: 'a simple object',
            someFn: function() { return true }
        });

        var obj = ioc('simple-object');


        assert(!!obj, messages['no-instance']);
        assert(!!obj.someFn());
    });


    it('can define a simple object with dependencies', function() {

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


    it('circular dependencies are are handled, and can be intercepted', function() {
        var isCircular = false;

        //** listen for the circular event, setting a flag if detected
        ioc.on('circular', function(args) { 
            isCircular = true;
            //console.log('circular: ', args.module.key, args.dependency);
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
