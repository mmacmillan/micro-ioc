var assert = require('assert'),
    ioc = require('../ioc.js');

describe('As a container', function() {

    it('can define a simple object', function() {

        ioc.define('simple-object', {
            name: 'a simple object'
        });

        var obj = ioc('simple-object');

        assert(!!obj);
        assert(!!obj.name.length > 0);
        console.log(obj);
    });


});
