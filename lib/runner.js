var util = require('util');
var App = require('./app');

class Runner {
    constructor() {
        this.apps = {};

        this.timer = setInterval(() => {
            for (let name in this.apps)
                this.apps[name].check_state();
        }, 1000);
    }

    shutdown() {
        if (this.timer) {
            clearInterval(this.timer);
            delete this.timer;
        }

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
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        app.stop();
        delete this.apps[name];
    }

    start(name) {
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        app.start();
    }

    stop(name) {
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        app.stop();
    }

    restart(name) {
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        app.stop();
        app.start();
    }

    usage(name, stat, interval) {
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        return app.usage(stat, interval);
    }

    log(name, length) {
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        return app.log(length);
    }

    attach(name, sock, length) {
        var app = this.apps[name];
        if (!app) {
            sock.close();
            throw new Error(`app ${name} not exist.`);
        }

        app.attach(sock, length);
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

    list() {
        var apps = {};

        for (var name in this.apps) {
            var app = this.apps[name];
            apps[name] = {
                description: app.opt.description,
                pid: app.proc ? app.proc.pid : -1,
                status: app.status,
                retries: app.retries,
                uptime: app.proc ? new Date() - app.uptime : 0,
                user: app.proc ? app.proc.interval_usage.user : 0,
                sys: app.proc ? app.proc.interval_usage.sys : 0,
                rss: app.proc ? app.proc.interval_usage.rss : 0,
            };
        }

        return apps;
    }
};

module.exports = Runner;