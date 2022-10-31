var http = require('http');
var ws = require('ws');
var util = require('util');
var coroutine = require('coroutine');
var stringArgv = require('string-argv').default;
var usage_chart = require('./lib/usage_chart');

function json_call(u) {
    var r = http.get(u).json();
    if (r.error) {
        console.error(r.error);
        return;
    }

    return r;
}

function list() {
    var apps = json_call('http://127.0.0.1:13828/list');

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

        app.user = (app.user * 100).toFixed(2) + '%';
        app.sys = (app.sys * 100).toFixed(2) + '%';

        var rss = app.rss;
        if (rss > 1024 * 1024 * 1024)
            app.rss = (rss / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        else if (rss > 1024 * 1024)
            app.rss = (rss / (1024 * 1024)).toFixed(2) + ' MB';
        else
            app.rss = (rss / 1024).toFixed(2) + ' KB';
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

    var r = json_call(`http://127.0.0.1:13828/stat/${name}/${type}/${interval}`);
    if (r)
        console.log(usage_chart(type, r.tm, r.usage, interval));
}

function log(name, length) {
    length = length || 80;
    var r = json_call(`http://127.0.0.1:13828/log/${name}/${length}`);
    if (r) {
        process.stdout.write(r);
        console.log();
    }
}

function attach(name, length) {
    var ev = new coroutine.Event();
    var first = true;
    length = length || 80;
    var sock = new ws.Socket(`ws://127.0.0.1:13828/attach/${name}/${length}`);
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

while (true) {
    var line = console.readLine("runner> ");
    const args = stringArgv(line);
    if (args[0])
        switch (args[0]) {
            case 'list':
                list();
                break;
            case 'reload':
                http.get('http://127.0.0.1:13828/reload');
                break;
            case 'stop':
                http.get(`http://127.0.0.1:13828/stop/${args[1]}`);
                break;
            case 'start':
                http.get(`http://127.0.0.1:13828/start/${args[1]}`);
                attach(args[1]);
                break;
            case 'restart':
                http.get(`http://127.0.0.1:13828/restart/${args[1]}`);
                attach(args[1]);
                break;
            case 'log':
                log(args[1], args[2]);
                break;
            case 'attach':
                attach(args[1], args[2]);
                break;
            case 'exit':
                process.exit();
            default:
                if (args[0][0] == '.') {
                    stat(args[1], args[2], args[0].substring(1));
                    break;
                }

                console.error(`unknown command ${args[0]}.`);
            case 'help':
                console.log(`
help              Print this help message

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
}