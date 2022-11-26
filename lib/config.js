var fs = require('fs');
var path = require('path');

const address = '127.0.0.1';
const port = 1123;

var cwd = process.cwd();

module.exports = function config(base) {
    base = base || cwd;

    var cfg = JSON.parse(fs.readTextFile(path.join(base, 'runner.json')));
    if (!cfg.listen)
        cfg.listen = {
            address,
            port
        };
    else {
        if (!cfg.listen.address)
            cfg.listen.address = address;
        if (!cfg.listen.port)
            cfg.listen.port = port;
    }

    if (!cfg.name)
        cfg.name = "fib-runner";

    if (!cfg.description)
        cfg.description = "fibjs service runner";

    var apps = [];
    cfg.apps.forEach(app => {
        if (app.runner) {
            var runner = config(path.resolve(base, app.runner));
            if (runner.apps)
                runner.apps.forEach(ext => {
                    ext.name = `${app.name}.${ext.name}`;
                    apps.push(ext);
                });
        } else {
            app.cwd = app.cwd ? path.resolve(base, app.cwd) : base;
            apps.push(app);
        }
    });

    cfg.apps = apps;

    console.log(cfg);

    return cfg;
};