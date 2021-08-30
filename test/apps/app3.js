var http = require('http');
var coroutine = require('coroutine');

while (true) {
    console.log(new Date());
    coroutine.sleep(1000);
    var cnt = Math.random() * 10000;
    for (var i = 0; i < cnt; i++)
        new Buffer(100000);
}
