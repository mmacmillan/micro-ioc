/*
 | ioc.js
 | ----
 | a simple container, facilitating an IoC/DI design pattern, providing facilities to load, register, and retrieve instances of the modules/components in your application.
 |
 | Mike MacMillan
 | mikejmacmillan@gmail.com
*/
var util = require('util'),
    _ = require('lodash'),
    fs = require('fs'),
    events = require('events'),
    path = require('path'),
    modules = {},
    unresolved = [],
    init = false;

var defaults = {
    keyProp: 'name',
    parse: function(o) { return o; },
    filter: function(o) { return path.extname(o) == '.js'; } //** by default, filter all but javascript
};

//** the ioc container; gets an instance of a resolved object
function ioc(key, args, context) { return ioc.instance(key, args, context) }

//** extend the ioc object
_.extend(ioc, events.EventEmitter.prototype, {
    initialize: function(success, error) {
        if(init) return;

        //** resolve all the objects
        Object.keys(modules).forEach(function(m) { modules[m].resolve() })

        //** trigger the unresolved event if any unresolved dependencies remain
        if(unresolved.length > 0) {
            error && error.call && error.call(unresolved);
            return ioc.emit('unresolved', unresolved);
        }

        //** fire success, trigger load
        init = true;
        success && success.call && success.call(ioc);
        ioc.emit('load');
    },

    initialized: function() { return init },


    //** Resolution Methods
    //** ----

    //** format: instance('key', [arg1, arg2, ...] [, context]);
    instance: function(key, args, context) {
        //** find the object by key, and resolve with the given arguments
        key = (key||'').toLowerCase().replace('.', '/').replace('\\', '/');
        var args = args||[],
            comp = modules[key] && modules[key].instance(args, context);

        //** if the object couldn't be resolved, trigger an event for handling
        !comp && ioc.emit('resolve:error', { key: key, args: args, context: context });
        return comp;
    },

    //** format: ns('controllers')
    //** returns a list of modules beneath the given path/namespace
    ns: function(nskey) {
        var objs = {},
            nskey = (nskey||'').toLowerCase().replace(/[/\\]/g, '\\/'),
            gex = nskey && nskey != '' ? new RegExp('\\/?'+ nskey +'(\\/)?(.*?)') : /^[^\/]*$/;

        //** find all the objects of the given namespace, and return an object which can be used for resolution
        for(var key in modules)
            gex.test(key) && (objs[key] = modules[key]);

        return objs;
    },

    //** simply return if the container contains an object with the given key
    contains: function(key) {
        return !!modules[key];
    },

    modules: function() {
        return modules;
    },

    clear: function() {
        modules = {};
    },



    //** Registration Methods
    //** ----

    path: function(dir, opt) {
        //** some default options...
        _.defaults((opt = opt||{}), {
            recurse: opt.recurse!==false,
            keyProp: opt.keyProp || defaults.keyProp,
            parse: opt.parse || defaults.parse,
            filter: opt.filter || defaults.filter
        });

        function load(p) {
            var dirs = [],
                base = opt.key;

            fs.readdir(p, function(err, files) {
                if(err) throw err;

                //** determine the base key path, if no key has been given
                if(!base) {
                    base = p.replace(crane.path, '')
                            .replace(/[\\]/g, '/')
                            .replace(/\/\//g, '/')
                            .replace(/^\//, '');

                    base = path.normalize(base +'/');
                }

                files.forEach(function(name) {
                    //** queue folders for for loading if recursion is enabled
                    if(fs.statSync(p +'/'+ name).isDirectory())
                        return opt.recurse && dirs.push(p + name +'/');
                    else {
                        //** apply the filter to the file's name/path, returning if necessary
                        if(('apply' in opt.filter) && !opt.filter.call(this, name)) return;

                        //** require the object to see if its valid; fire the parse callback if so, then create the container key and register it.  reject objects
                        //** that return the ioc; that means they are self-registering, and merely need be require()'d
                        if((x = require(p +'/'+ name)) !== ioc) {
                            var key = base + (x[opt.keyProp] || path.basename(name, '.js'));
                            if(('apply' in opt.parse) && !opt.parse.call(this, x, key)) return;
                            this.define(key, x, opt);
                        }
                    }
                }.bind(this));

                //** recurse each sub-directory
                dirs.forEach(load.bind(this));
            });
        }

        load.call(this, path.normalize((dir[0] == '/' ? dir : crane.path +'/'+ dir) +'/'));
        return this;
    },

    children: function(key, obj, opt) {
        if(!obj) return;

        //** apply some defaults
        _.defaults((opt = opt||{}), {
            filter: defaults.parse //** ie, do nothing to filter by default
        });

        //** split the object's children into key/value pairs, and register each, allowing the dev a chance to filter before registration
        _.pairs(obj).forEach(function(pair) {
            if(('apply' in opt.filter) && !opt.filter.apply(this, pair)) return;
            this.define(key +'/'+ pair[0], pair[1], opt);
        }.bind(this));

        return this;
    },

    //** intended for including ioc modules; those that simply ioc.define() within their .js file
    module: function(modulePath, opt) {
        require(path.normalize(modulePath[0] == '/' ? modulePath : crane.path +'/'+ modulePath));
        return this;
    },

    //** 2 usages: define('name', { implementation }, { options }) or define('name', ['depependency1', 'dependency2'], { implementation }, { options })
    //** if the implementation is a function, it is assumed that the module is returned after executing that function (with scope)
    define: function(key, deps, obj, opt) {
        //** normalize the key
        key = (key||'').toLowerCase();

        //** allow the second argument to be either a dependency array, or the implementation itself
        if(!Array.isArray(deps) || !obj) {
            opt = obj;
            obj = deps;
            deps = [];
        }

        //** make sure dependencies are in an array
        !Array.isArray(deps) && (deps = [deps]);

        //** register the object, wrapped in a facade to facilitate resolution
        if(modules[key] && opt.force !== true) return;
        modules[key] = {
            key: key,
            dependencies: deps,
            resolved: {},
            resolutionAttempts: 0,

            //** holds a resolved instance to avoid duplicate work
            _instance: null,

            instance: function(args, context) {
                var comp = null;
                args = args||[];

                //** if this module appears to be unresolved, attempt to resolve it
                if(Object.keys(this.resolved).length != this.dependencies.length) {
                    if(!this.resolve(args, context)) return;
                }

                //** if we've already created an instance, return it
                if(!this._instance) {

                    //** obtain an "instance", which is either uses the object as-is, or invokes its factory with the resolved dependencies
                    this._instance = _.isFunction(obj)
                        ? obj.apply(obj, _.toArray(this.resolved))
                        : obj;

                    ioc.emit('module:create', { module: this, instance: this._instance });
                }

                return this._instance;
            },

            /**
             * resolves the object against the given context, ensuring all dependencies are valid by triggering resolve
             * recursively on all child dependencies.  circular dependencies will be met with an empty object, and any
             * dependencies already resolved will be reused.  if unresolvable, the parent object will be added to a
             * global unresolved queue.
             *
             * @param {Array} args
             * @param {Object} context
             * @returns {boolean} whether or the not the object and its dependencies can be resolved
             */
            resolve: function(args, context) {
                args = args||[];
                context = context||{};

                if(!context[this.key])
                    context[this.key] = this;

                if(Object.keys(this.resolved).length != this.dependencies.length) {
                    var resolved = true;

                    this.dependencies.forEach(function(dep) {
                        dep = dep && dep.toLowerCase() || '';

                        //** skip resolved dependencies
                        if(this.resolved[dep]) return;

                        //** if we've seen this dependency somewhere in this resolution chain...
                        if(context[dep]) {
                            //** determine if its a circular dependency
                            var circular = _.find(context[dep].dependencies||[], function(key) {
                                return key.toLowerCase() == this.key
                            }.bind(this));

                            //** circular dependencies are met with an empty object, otherwise, share the reference
                            this.resolved[dep] = !!circular ? {} : context[dep];
                            !!circular && ioc.emit('circular', { module: this, dependency: dep });
                            return;
                        }

                        //** get the target dependency from the container, pushing this object into the resolution Q if we can't
                        var obj = ioc.instance(dep, null, context);
                        if(obj) this.resolved[dep] = obj;
                        else  resolved = false;
                    }.bind(this));

                    if(!resolved) unresolved.push(this);
                    return resolved;
                }
            }
        }

        //** provide a shorthand to its container registration object
        obj._iocKey = key;
        return this;
    }
});

//** initialize the ioc as an eventEmitter as well; psuedo-inheritance, then expose it as the module
events.EventEmitter.call(ioc);

//** implement the AMD-js spec, supplying a define.amd object
//** https://github.com/amdjs/amdjs-api/wiki/AMD
define = ioc.define;
define.amd = {};

module.exports = ioc;
