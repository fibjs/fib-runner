var util = require('util');
var child_process = require('child_process');

const usage_history_size = 60 * 24 * 30;

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
        this.usage = {
            history: [],
            now: {
                tm: Math.floor(new Date() / 60000),
                count: 0,
                user: 0,
                system: 0,
                rss: 0
            }
        };

        if (this.opt.autostart) {
            this.status = 'RUNNING';
            start_app(this);
        }
        else
            this.status = 'STOPPED';
    }

    check_state() {
        var usage;

        if (this.proc) {
            try {
                usage = this.proc.usage();

                var tm = Math.floor(new Date() / 60000);
                var now = this.usage.now;
                if (tm != now.tm) {
                    this.usage.history.push(now);
                    var len = this.usage.history.length - usage_history_size - 1;
                    if (len >= 0)
                        delete this.usage.history[len];
                    console.log(this.usage.history);

                    this.usage.now = {
                        tm: tm,
                        count: 1,
                        user: usage.user,
                        system: usage.system,
                        rss: usage.rss
                    }
                } else {
                    var count = now.count;
                    var count1 = count + 1;

                    now.count = count1;
                    now.user = (now.user * count + usage.user) / count1;
                    now.system = (now.system * count + usage.system) / count1;
                    now.rss = (now.rss * count + usage.rss) / count1;
                }
            } catch (e) {
                console.log(e);
            }
        }
    }

    stop() {
        if (this.status == 'RUNNING') {
            if (this.proc) {
                this.status = 'STOPPING';
                try {
                    this.proc.kill(this.opt.signal);
                } catch (e) {
                    console.log(e);
                }
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