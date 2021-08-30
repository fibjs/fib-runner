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
    '/list': r => r.response.json(runner.list()),
    '/cpu/:name/:interval': (r, name, interval) => r.response.json(runner.cpu_usage(name, interval)),
    '/mem/:name/:interval': (r, name, interval) => r.response.json(runner.mem_usage(name, interval)),
    '/stop/:name': (r, name) => runner.stop(name),
    '/start/:name': (r, name) => runner.start(name),
    '/restart/:name': (r, name) => runner.restart(name),
    '*': r => { }
});

svr.start();