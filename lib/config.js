var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

const address = '127.0.0.1';
const port = 1123;

var cwd = process.cwd();

module.exports = function config(base) {
    base = base || cwd;
    var cfg_file = path.join(base, 'runner.json');
    var cfg = fs.exists(cfg_file) ? JSON.parse(fs.readTextFile(cfg_file)) : {};
    var cfg_changed = false;

    if (!cfg.name) {
        cfg_changed = true;
        cfg.name = "fib-runner";
    }

    if (!cfg.description) {
        cfg_changed = true;
        cfg.description = "fibjs service runner";
    }

    if (!cfg.listen) {
        cfg_changed = true;
        cfg.listen = {
            address,
            port
        };
    }
    else {
        if (!cfg.listen.address) {
            cfg_changed = true;
            cfg.listen.address = address;
        }

        if (!cfg.listen.port) {
            cfg_changed = true;
            cfg.listen.port = port;
        }
    }

    if (!cfg.key) {
        cfg_changed = true;

        var k = crypto.generateKey('P-256K').json({
            compress: true
        });

        cfg.key = {
            pub: k.x,
            key: k.d,
            admin: ""
        }
    }

    if (!cfg.apps) {
        cfg_changed = true;
        cfg.apps = [];
    }

    if (cfg_changed)
        fs.writeTextFile(cfg_file, JSON.stringify({
            name: cfg.name,
            description: cfg.description,
            listen: cfg.listen,
            key: cfg.key,
            apps: cfg.apps
        }, null, 2));

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

    var key = new crypto.PKey({
        kty: "EC",
        crv: "P-256K",
        d: cfg.key.key
    });
    var crt = new crypto.X509Req(`CN=runner`, key).sign(`CN=runner`, key);

    cfg.crt = {
        key,
        crt
    };

    return cfg;
};