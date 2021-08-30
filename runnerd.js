var http = require('http');
var fs = require('fs');
var os = require('os');
var path = require('path');
var Runner = require('.');

var cpus = os.cpus().length;

function reload() {
    var txt = fs.readTextFile(path.join(__dirname, "runnerd.json"));
    runner.reload(JSON.parse(txt));
}

var runner = new Runner();
reload();

var svr = new http.Server(13828, {
    '/reload': reload,
    '/list': r => {
        var apps = {};

        for (var name in runner.apps) {
            var app = runner.apps[name];
            apps[name] = {
                description: app.opt.description,
                pid: app.proc ? app.proc.pid : -1,
                status: app.status,
                retries: app.retries,
                uptime: app.proc ? new Date() - app.uptime : 0,
                user: app.proc ? app.proc.interval_usage.user : 0,
                system: app.proc ? app.proc.interval_usage.system : 0,
                rss: app.proc ? app.proc.interval_usage.rss : 0,
            };
        }

        r.response.json(apps);
    },
    '/stop/:name': (r, name) => {
        runner.stop(name);
    },
    '/start/:name': (r, name) => {
        runner.start(name);
    },
    '/restart/:name': (r, name) => {
        runner.restart(name);
    },
    '*': r => { }
});
svr.start();