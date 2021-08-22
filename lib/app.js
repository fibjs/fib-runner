var util = require('util');
var child_process = require('child_process');

class App {
    constructor(opt) {
        this.opt = util.extend({
            name: '',
            description: '',
            cwd: undefined,
            exec: "",
            script: "",
            arg: [],
            env: {},
            instances: 1
        }, opt);

        this.retries = 0;
        this.uptime = new Date();
        this.downtime = 0;
        this.logs = [];

        if (this.opt.autostart)
            this.status = 'RUNNING';
    }

    check_state() {
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
                        delete this.proc;
                        this.downtime = new Date();
                        this.retries++;

                        if (this.status == 'STOPPING')
                            this.status = 'STOPPED';
                        else if (this.retries >= this.opt.startretries)
                            this.status = 'FAILED';
                    });
                } catch (e) {
                    console.log(e);
                    this.downtime = new Date();
                    this.retries++;

                    if (this.retries >= this.opt.startretries)
                        this.status = 'FAILED';
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
};

module.exports = App;