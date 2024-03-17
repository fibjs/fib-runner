var http = require('http');
var ws = require('ws');
var ssl = require('ssl');
var util = require('util');
var coroutine = require('coroutine');
var stringArgv = require('string-argv').default;
var stat_chart = require('./lib/stat_chart');
var daemon = require('./lib/daemon');
var cfg = require('./lib/config')();

var client;

if (ssl.setClientCert) {
    client = new http.Client();
    ssl.verification = ssl.VERIFY_OPTIONAL;
    client.sslVerification = ssl.VERIFY_OPTIONAL;
    client.setClientCert(cfg.cert.cert, cfg.cert.key);
} else {
    client = new http.Client({
        cert: cfg.cert.cert,
        key: cfg.cert.key,
        requestCert: false
    });
}

if (cfg.listen.address === '0.0.0.0')
    cfg.listen.address = '127.0.0.1';

var rpc_url = `${cfg.listen.address}:${cfg.listen.port}`;

function json_call(u) {
    try {
        var r = client.get(`https://${rpc_url}/${u}`);
        if (!r.ok) {
            console.error("Server response:", r.statusMessage);
            return;
        }
        r = r.json();
    } catch (e) {
        console.error(e.message);
        return;
    }

    if (r.error) {
        console.error(r.error);
        return;
    }

    return r;
}

function list() {
    var apps = json_call(`list`);
    if (!apps)
        return;

    for (var name in apps) {
        var app = apps[name];

        delete app.description;

        var uptime = app.uptime / 1000;
        if (uptime > 24 * 60 * 60)
            app.uptime = (uptime / (24 * 60 * 60)).toFixed(1) + 'd';
        else if (uptime > 60 * 60)
            app.uptime = (uptime / (60 * 60)).toFixed(1) + 'h';
        else if (uptime > 60)
            app.uptime = (uptime / 60).toFixed(1) + 'm';
        else
            app.uptime = uptime.toFixed(1) + 's';

        var rss = app.rss;
        if (rss > 1024 * 1024 * 1024)
            app.rss = (rss / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        else if (rss > 1024 * 1024)
            app.rss = (rss / (1024 * 1024)).toFixed(2) + ' MB';
        else
            app.rss = (rss / 1024).toFixed(2) + ' KB';

        app.cpu = stat_chart.cpu_chart(app.cpu);
    }

    console.log(util.inspect(apps, {
        table: true,
        colors: true,
        encode_string: false
    }));
}

function stat(name, interval, type) {
    interval = interval || 1;
    if (interval != 1 && interval != 5 && interval != 15 && interval != 60 && interval != 240 && interval != 720) {
        console.error(`interval must be 1|5|15|60|240|720.`);
        return;
    }

    var r = json_call(`stat/${name}/${type}/${interval}`);
    if (r)
        console.log(stat_chart.stat_chart(type, r.type, r.tm, r.usage, interval));
}

function log(name, length) {
    length = length || 80;
    var r = json_call(`log/${name}/${length}`);
    if (r) {
        process.stdout.write(r);
        console.log();
    }
}

function attach(name, length) {
    var ev = new coroutine.Event();
    var first = true;
    length = length || 80;
    var sock = new ws.Socket(`wss://${rpc_url}/attach/${name}/${length}`, {
        httpClient: client
    });
    sock.onmessage = msg => {
        process.stdout.write(msg.data);

        if (first) {
            first = false;
            process.stdout.write("\n\nPress ctrl-z to exit interactive session.\n\n");

            process.stdin.setRawMode(true);
            while (true) {
                var ch = process.stdin.read();
                if (ch[0] == 0x1a)
                    break;

                sock.send(ch);
            }
            process.stdin.setRawMode(false);
            console.log();

            sock.close();

            ev.set();
        }
    };

    sock.onclose = () => ev.set();

    ev.wait();
}

var exec_args = process.argv.slice(2);
if (exec_args[0] == '--console')
    exec_args = exec_args.slice(1);

if (exec_args[0] == '-s') {
    rpc_url = exec_args[1];
    exec_args = exec_args.slice(2);
}

do {
    const args = exec_args.length ? exec_args : stringArgv(console.readLine("runner> "));
    if (args[0])
        switch (args[0]) {
            case 'install':
                daemon.install(cfg);
                break;
            case 'uninstall':
                daemon.uninstall(cfg);
                break;
            case 'list':
                list();
                break;
            case 'reload':
                json_call(`reload`);
                break;
            case 'stop':
                json_call(`stop/${args[1]}`);
                break;
            case 'start':
                if (json_call(`start/${args[1]}`))
                    attach(args[1]);
                break;
            case 'restart':
                if (json_call(`restart/${args[1]}`))
                    attach(args[1]);
                break;
            case 'log':
                log(args[1], args[2]);
                break;
            case 'attach':
                attach(args[1], args[2]);
                break;
            case 'exit':
                exec_args = ["--exit"];
                break;
            default:
                if (args[0][0] == '.') {
                    stat(args[1], args[2], args[0].substring(1));
                    break;
                }

                console.error(`unknown command ${args[0]}.`);
            case 'help':
                console.log(`
help              Print this help message

install           Install runnerd as a service
uninstall         Uninstall runnerd service 

list              Display all processes status
reload            Reload runnerd.json

stop name         Stop specific process name
start name        Start specific process name
restart name      Restart specific process name

log name [80]     Monitor output log of specific process name
attach name [80]  Attach output log of specific process name, ctrl+z to exit

.{stat} name [1]  Monitor {stat} usage of specific process name

exit              Exit runnerctl
`);
                break;
        }
} while (exec_args.length == 0);