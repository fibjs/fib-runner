var util = require('util');
var App = require('./app');

class Runner {
    constructor(opt) {
        this.opt = util.extend({
            autostart: true,
            startsecs: 1,
            startretries: 3,
            autorestart: true
        }, opt);

        this.apps = {};

        this.timer = setInterval(() => {
            for (let name in this.apps)
                this.apps[name].check_state();
        }, 200)
    }

    shutdown() {
        if (this.timer) {
            for (let name in this.apps)
                this.apps[name].stop();

            clearInterval(this.timer);
            delete this.timer;
        }
    }

    add(opt) {
        opt = util.extend(this.opt, opt);
        if (!util.isString(opt.name))
            throw new Error('opt.name need to be String.');
        if (this.apps[opt.name])
            throw new Error(`app ${opt.name} exist.`);

        this.apps[opt.name] = new App(opt);
    }

    update(opt) {
        opt = util.extend(this.opt, opt);
        if (!util.isString(opt.name))
            throw new Error('opt.name need to be String.');
        if (!this.apps[opt.name])
            throw new Error(`app ${opt.name} not exist.`);

        return this.apps[opt.name].update(opt);
    }

    remove(name) {
        this.apps[name].stop();
        delete this.apps[name];
    }

    start(name) {
        this.apps[name].start();
    }

    stop(name) {
        this.apps[name].stop();
    }

    restart(name) {
        this.apps[name].stop();
        this.apps[name].start();
    }
};

module.exports = Runner;