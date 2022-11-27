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
var ssl = require('ssl');

var load_config = require('./lib/config');

var Runner = require('.');
var cfg = load_config();
var runner = new Runner();

function reload() {
    cfg = load_config();
    runner.reload(cfg);
}

function json_call(r, func) {
    try {
        r.response.json(runner[func].apply(runner, r.params));
    } catch (e) {
        r.response.json({ error: e.message });
    }
}

var handler = new http.Handler({
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

var svr = new ssl.Server(cfg.crt.crt, cfg.crt.key, cfg.listen.address, cfg.listen.port, s => {
    if (!s.peerCert)
        return;

    var ip = s.stream.remoteAddress;
    var pub = s.peerCert.publicKey.json({ compress: true }).x;

    if (ip == '127.0.0.1') {
        if (pub != cfg.key.pub)
            return;
    } else if (pub != cfg.key.admin)
        return;

    return handler;
});
svr.verification = ssl.VERIFY_OPTIONAL;

svr.start();

reload();