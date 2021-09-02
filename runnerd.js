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
    '/list': r => r.response.json(runner.list()),
    '/cpu/:name/:interval': (r, name, interval) => r.response.json(runner.cpu_usage(name, interval)),
    '/mem/:name/:interval': (r, name, interval) => r.response.json(runner.mem_usage(name, interval)),
    '/log/:name/:length': (r, name, length) => r.response.write(runner.log(name, length)),
    '/attach/:name/:length': ws.upgrade((sock, r) => runner.attach(r.params[0], sock, r.params[1])),
    '/stop/:name': (r, name) => runner.stop(name),
    '/start/:name': (r, name) => runner.start(name),
    '/restart/:name': (r, name) => runner.restart(name),
    '*': r => { }
});

svr.start();