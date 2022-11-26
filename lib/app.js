var util = require('util');
var fs = require('fs');
var child_process = require('child_process');
var stat_chart = require('./stat_chart');
const Usage = require('./usage');

const log_history_size = 2000;

function bind_opt(opt) {
    var def_opt = {
        name: '',
        description: '',
        exec: "",
        script: "",
        cwd: undefined,
        arg: [],
        env: {},
        instances: 1,
        autostart: true,
        startsecs: 1,
        startretries: 3,
        autorestart: true,
        savelog: false,
        signal: "SIGTERM", //SIGTERM, SIGHUP, SIGINT, SIGQUIT, SIGKILL, SIGUSR1, or SIGUSR2
    };

    return util.extend(def_opt, opt);
}

function put_log(o, msg) {
    o.socks.forEach(sock => sock.send(msg));
    o.logs.push(msg);
    var len = o.logs.length - log_history_size - 1;
    if (len >= 0)
        delete o.logs[len];
}

function act_log(o, msg) {
    put_log(o, `${new Date().toISOString()} - ${msg}\n`);
}

function start_app(o) {
    function shutdown() {
        act_log(o, 'process is exited.');

        if (o.status != 'STOPPING')
            try {
                if (o.opt.savelog) {
                    var fname = `log_${o.opt.name}_${new Date().getTime()}.txt`;
                    fs.writeFile(fname, o.logs.join(''));

                    var r = o.usages.cpu.history(1);
                    fs.appendFile(fname, "\n\n" + stat_chart("cpu", r.type, r.tm, r.usage, 1));

                    var r = o.usages.rss.history(1);
                    fs.appendFile(fname, "\n\n" + stat_chart("rss", r.type, r.tm, r.usage, 1));
                }
            } catch (e) { }

        delete o.proc;

        o.retries++;

        if (o.status == 'STOPPING') {
            o.downtime = new Date();
            o.status = 'STOPPED';
        }
        else if (o.retries == 0)
            start_app(o);
        else if (!o.opt.autorestart || (o.opt.startretries > 0 && o.retries >= o.opt.startretries)) {
            act_log(o, 'process failed to start.');
            o.downtime = new Date();
            o.status = 'FAILED';
        }
        else o.timer = setTimeout(() => {
            delete o.timer;
            start_app(o);
        }, o.opt.startsecs * 1000);
    }

    function send_out(stm) {
        function on_out(e, d) {
            if (!e && d) {
                put_log(o, d.toString());
                stm.read(on_out);
            }
        };

        if (stm)
            stm.read(on_out);
    }

    var opt = {
        stdio: process.platform != 'win32' ? 'pty' : 'pipe',
        cwd: o.opt.cwd,
        env: o.opt.env,
        windowsHide: true
    }

    try {
        act_log(o, 'trying to start.');
        o.proc = o.opt.exec
            ? child_process.spawn(o.opt.exec, o.opt.arg, opt)
            : child_process.fork(o.opt.script, o.opt.arg, opt);
        act_log(o, 'process is running.');

        send_out(o.proc.stdout);
        send_out(o.proc.stderr);

        o.uptime = new Date();
        o.proc.last_usage = {
            user: 0,
            system: 0,
            cpu: 0,
            rss: 0,
            tm: new Date()
        };

        o.proc.interval_usage = {
            user: 0,
            sys: 0,
            cpu: 0,
            rss: 0
        };

        o.proc.on("exit", shutdown);
    } catch (e) {
        act_log(o, e.message);
        shutdown();
    }
}

class App {
    constructor(opt) {
        this.opt = bind_opt(opt);

        this.retries = 0;
        this.uptime = new Date();
        this.logs = [];
        this.socks = [];
        this.usages = {
            user: new Usage('percent'),
            sys: new Usage('percent'),
            cpu: new Usage('percent'),
            rss: new Usage('number')
        }

        if (this.opt.autostart) {
            this.status = 'RUNNING';
            start_app(this);
        }
        else
            this.status = 'STOPPED';
    }

    check_state() {
        var user_interval = 0;
        var sys_interval = 0;
        var rss_interval = 0;

        if (this.proc) {
            try {
                var usage = this.proc.usage();
                usage.tm = new Date();

                var last_usage = this.proc.last_usage;
                this.proc.last_usage = usage;

                var interval = (usage.tm - last_usage.tm) * 1000;
                user_interval = (usage.user - last_usage.user) / interval;
                sys_interval = (usage.system - last_usage.system) / interval;
                rss_interval = usage.rss;

                this.proc.interval_usage = {
                    user: user_interval,
                    sys: sys_interval,
                    cpu: user_interval + sys_interval,
                    rss: rss_interval
                };
            } catch (e) {
                console.log(e);
            }
        }

        this.usages['user'].append(user_interval);
        this.usages['sys'].append(sys_interval);
        this.usages['cpu'].append(user_interval + sys_interval);
        this.usages['rss'].append(rss_interval);
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
            cwd: opt.cwd,
            arg: opt.arg,
            env: opt.env
        }, {
            exec: this.opt.exec,
            script: this.opt.script,
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

    stat(stat, interval) {
        var usage = this.usages[stat];
        if (!usage)
            throw new Error(`stat must be ${Object.keys(this.usages).join('|')}.`);

        return usage.history(interval);
    }

    log(length) {
        return this.logs.slice(Math.max(0, this.logs.length - Math.min(length, log_history_size))).join('');
    }

    attach(sock, length) {
        this.socks.push(sock);
        sock.send(this.logs.slice(Math.max(0, this.logs.length - Math.min(length, log_history_size))).join(''));
        sock.onmessage = msg => this.proc ? this.proc.stdout.write(msg.data) : 0;
        sock.onclose = () => this.socks = util.without(this.socks, sock);
    }
};

module.exports = App;