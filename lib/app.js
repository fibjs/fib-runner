var util = require('util');
var child_process = require('child_process');


function bind_opt(opt) {
    var def_opt = {
        name: '',
        description: '',
        exec: "",
        script: "",
        stdio: 'inherit',
        cwd: undefined,
        arg: [],
        env: {},
        instances: 1,
        autostart: true,
        startsecs: 1,
        startretries: 3,
        autorestart: true,
        signal: "SIGTERM", //SIGTERM, SIGHUP, SIGINT, SIGQUIT, SIGKILL, SIGUSR1, or SIGUSR2
    };

    return util.extend(def_opt, opt);
}

function start_app(o) {
    function shutdown() {
        delete o.proc;

        o.retries++;

        if (o.status == 'STOPPING') {
            o.downtime = new Date();
            o.status = 'STOPPED';
        }
        else if (o.retries == 0)
            start_app(o);
        else if (!o.opt.autorestart || o.retries >= o.opt.startretries) {
            o.downtime = new Date();
            o.status = 'FAILED';
        }
        else o.timer = setTimeout(() => {
            delete o.timer;
            start_app(o);
        }, o.opt.startsecs * 1000);
    }

    var opt = {
        stdio: o.opt.stdio,
        cwd: o.opt.cwd,
        env: o.opt.env,
    }

    try {
        o.proc = o.opt.exec
            ? child_process.spawn(o.opt.exec, o.opt.arg, opt)
            : child_process.fork(o.opt.script, o.opt.arg, opt);

        o.proc.on("exit", shutdown);
    } catch (e) {
        console.log(e);
        shutdown();
    }
}

class App {
    constructor(opt) {
        this.opt = bind_opt(opt);

        this.retries = 0;
        this.uptime = new Date();
        this.logs = [];

        if (this.opt.autostart) {
            this.status = 'RUNNING';
            start_app(this);
        }
        else
            this.status = 'STOPPED';
    }

    stop() {
        if (this.status == 'RUNNING') {
            if (this.proc) {
                this.status = 'STOPPING';
                try {
                    this.proc.kill(this.opt.signal);
                } catch (e) { }
            } else {
                if (this.timer) {
                    clearTimeout(this.timer);
                    delete this.timer;
                }

                this.status = 'STOPPED';
            }
        }
    }

    start() {
        if (this.status == 'STOPPING') {
            this.status = 'RUNNING';
            this.retries = -1;
        } else if (this.status != 'RUNNING') {
            this.status = 'RUNNING';
            this.retries = 0;
            start_app(this);
        }
    }

    update(opt) {
        opt = bind_opt(opt);
        var reload = !util.isDeepEqual({
            exec: opt.exec,
            script: opt.script,
            stdio: opt.stdio,
            cwd: opt.cwd,
            arg: opt.arg,
            env: opt.env
        }, {
            exec: this.opt.exec,
            script: this.opt.script,
            stdio: this.opt.stdio,
            cwd: this.opt.cwd,
            arg: this.opt.arg,
            env: this.opt.env
        });

        this.opt = opt;

        if (reload) {
            this.stop();
            this.start();
        }

        return reload;
    }
};

module.exports = App;