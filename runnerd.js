var child_process = require('child_process');

if (process.argv[2] !== '--daemon') {
    child_process.fork(__filename, ['--daemon'], {
        stdio: "inherit",
        detached: true
    });

    console.notice(`runnerd.js is running in the background.
use runnerctrl.js to control the service process.`);

    process.exit();
}

var fs = require('fs');
var os = require('os');
var path = require('path');
var http = require('http');
var ws = require('ws');

var cfg = require('./lib/config');

var Runner = require('.');

var cpus = os.cpus().length;

function reload() {
    var txt = fs.readTextFile("runner.json");
    runner.reload(JSON.parse(txt));
}

var runner = new Runner();
reload();

function json_call(r, func) {
    try {
        r.response.json(runner[func].apply(runner, r.params));
    } catch (e) {
        r.response.json({ error: e.message });
    }
}

var svr = new http.Server(cfg.listen.address, cfg.listen.port, {
    '/reload': reload,
    '/list': r => json_call(r, 'list'),
    '/stat/:name/:stat/:interval': r => json_call(r, 'stat'),
    '/log/:name/:length': r => json_call(r, 'log'),
    '/attach/:name/:length': ws.upgrade((sock, r) => runner.attach(r.params[0], sock, r.params[1])),
    '/stop/:name': r => json_call(r, 'stop'),
    '/start/:name': r => json_call(r, 'start'),
    '/restart/:name': r => json_call(r, 'restart'),
    '*': r => { }
});

svr.start();