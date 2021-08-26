var util = require('util');
var App = require('./app');

class Runner {
    constructor() {
        this.apps = {};
    }

    shutdown() {
        for (let name in this.apps)
            this.apps[name].stop();
    }

    add(opt) {
        if (!util.isString(opt.name))
            throw new Error('opt.name need to be String.');
        if (this.apps[opt.name])
            throw new Error(`app ${opt.name} exist.`);

        this.apps[opt.name] = new App(opt);
    }

    update(opt) {
        if (!util.isString(opt.name))
            throw new Error('opt.name need to be String.');
        if (!this.apps[opt.name])
            throw new Error(`app ${opt.name} not exist.`);

        return this.apps[opt.name].update(opt);
    }

    remove(name) {
        if (!this.apps[name])
            throw new Error(`app ${name} not exist.`);

        this.apps[name].stop();
        delete this.apps[name];
    }

    start(name) {
        if (!this.apps[name])
            throw new Error(`app ${name} not exist.`);

        this.apps[name].start();
    }

    stop(name) {
        if (!this.apps[name])
            throw new Error(`app ${name} not exist.`);

        this.apps[name].stop();
    }

    restart(name) {
        if (!this.apps[name])
            throw new Error(`app ${name} not exist.`);

        this.apps[name].stop();
        this.apps[name].start();
    }

    reload(cfg) {
        var apps = this.apps;
        this.apps = {};

        if (cfg.apps)
            cfg.apps.forEach(opt => {
                if (apps[opt.name]) {
                    var app = apps[opt.name];
                    delete apps[opt.name];
                    this.apps[opt.name] = app;
                    app.update(opt);
                } else
                    this.apps[opt.name] = new App(opt);
            });

        for (var name in apps)
            apps[name].stop();
    }
};

module.exports = Runner;