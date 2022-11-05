var fs = require('fs');

const address = '127.0.0.1';
const port = 1123;

var cfg = JSON.parse(fs.readTextFile('runner.json'));
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

module.exports = cfg;