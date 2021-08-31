var http = require('http');
var ws = require('ws');
var util = require('util');
var stringArgv = require('string-argv').default;
var asciichart = require('asciichart');

function list() {
    var apps = http.get('http://127.0.0.1:13828/list').json();

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
        app.system = (app.system * 100).toFixed(2) + '%';

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

function list_usage(name, interval, type) {
    var padding = '       ';

    function format_cpu(x) {
        return (padding + (x * 100).toFixed(2)).slice(-padding.length) + '%';
    }

    function format_mem(x) {
        return (padding + (x / (1024 * 1024)).toFixed(2)).slice(-padding.length) + ' MB';
    }

    interval = interval || 1;
    if (interval != 1 && interval != 5 && interval != 15 && interval != 60 && interval != 240 && interval != 720) {
        console.error(`interval must be 1|5|15|60｜240｜720.`);
        return;
    }

    var r = http.get(`http://127.0.0.1:13828/${type}/${name}/${interval}`).json();
    console.log(asciichart.plot(r.usage, {
        height: 10,
        format: type == 'cpu' ? format_cpu : format_mem
    }));
}

function log(name, length) {
    length = length || 80;
    var r = http.get(`http://127.0.0.1:13828/log/${name}/${length}`).data;
    process.stdout.write(r);
}

function attach(name, length) {
    length = length || 80;
    var sock = new ws.Socket(`ws://127.0.0.1:13828/attach/${name}/${length}`);
    sock.onmessage = msg => process.stdout.write(msg.data);
    console.readLine();
    sock.close();
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
                break;
            case 'restart':
                http.get(`http://127.0.0.1:13828/restart/${args[1]}`);
                break;
            case 'cpu':
                list_usage(args[1], args[2], 'cpu');
                break;
            case 'mem':
                list_usage(args[1], args[2], 'mem');
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
                console.error(`unknown command ${args[0]}.`);
            case 'help':
                console.log(`
help              Print this help message

list              Display all processes status
reload            Reload runnerd.json

stop name         Stop specific process name
start name        Start specific process name
restart name      Restart specific process name

cpu name [1]      Monitor cpu usage of specific process name
mem name [1]      Monitor mem usage of specific process name

log name [80]     Monitor output log of specific process name
attach name [80]  Attach output log of specific process name

exit              Exit the REPL
`);
                break;
        }
}