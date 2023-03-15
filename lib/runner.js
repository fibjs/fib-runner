var util = require('util');
var App = require('./app');

class Runner {
    constructor() {
        this.apps = {};
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

        return {};
    }

    stop(name) {
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        app.stop();

        return {};
    }

    restart(name) {
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        app.stop();
        app.start();

        return {};
    }

    stat(name, stat, interval) {
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        return app.stat(stat, interval);
    }

    log(name, length) {
        var app = this.apps[name];
        if (!app)
            throw new Error(`app ${name} not exist.`);

        return app.log(length);
    }

    attach(name, sock, length) {
        var app = this.apps[name];
        if (!app)
            sock.close();
        else
            app.attach(sock, length);

        return {};
    }

    reload(cfg) {
        var has_app = false;
        var apps = this.apps;
        this.apps = {};

        if (cfg.apps)
            cfg.apps.forEach(opt => {
                has_app = true;
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

        if (has_app) {
            if (!this.timer)
                this.timer = setInterval(() => {
                    for (let name in this.apps)
                        this.apps[name].check_state();
                }, 1000);
        } else {
            if (this.timer) {
                clearInterval(this.timer);
                delete this.timer;
            }
        }
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
                rss: app.proc ? app.proc.interval_usage.rss : 0,
                cpu: app.proc ? app.stat("cpu", 1) : []
            };
        }

        return apps;
    }
};

module.exports = Runner;