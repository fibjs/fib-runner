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
        signal: "SIGTERM", //SIGTERM, SIGHUP, SIGINT, SIGQUIT, SIGKILL, SIGUSR1, or SIGUSR2
    };

    return util.extend(def_opt, opt);
}

class App {
    constructor(opt) {
        this.opt = bind_opt(opt);

        this.retries = 0;
        this.uptime = new Date();
        this.downtime = 0;
        this.logs = [];

        if (this.opt.autostart)
            this.status = 'RUNNING';
        else
            this.status = 'STOPPED';
    }

    check_state() {
        function shutdown(o) {
            delete o.proc;

            o.downtime = new Date();
            o.retries++;

            if (o.status == 'STOPPING')
                o.status = 'STOPPED';
            else if (o.retries > 0 && (!o.opt.autorestart || o.retries >= o.opt.startretries))
                o.status = 'FAILED';
        }

        if (this.status == 'RUNNING') {
            var tm = new Date();
            if (!this.proc && (tm - this.downtime) > this.opt.startsecs * 1000) {
                var opt = {
                    stdio: this.opt.stdio,
                    cwd: this.opt.cwd,
                    env: this.opt.env,
                }

                try {
                    this.proc = this.opt.exec
                        ? child_process.spawn(this.opt.exec, this.opt.arg, opt)
                        : child_process.fork(this.opt.script, this.opt.arg, opt);

                    this.proc.on("exit", () => {
                        shutdown(this);
                    });
                } catch (e) {
                    console.log(e);
                    shutdown(this);
                }
            }
        }
    }

    stop() {
        if (this.status == 'RUNNING') {
            if (this.proc) {
                this.status = 'STOPPING';
                this.proc.kill(this.opt.signal);
            } else
                this.status = 'STOPPED';
        }
    }

    start() {
        if (this.status == 'STOPPING') {
            this.status = 'RUNNING';
            this.retries = -1;
        } else if (this.status != 'RUNNING') {
            this.status = 'RUNNING';
            this.retries = 0;
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