var http = require('http');
var coroutine = require('coroutine');

http.post("http://127.0.0.1:18922", {
    json: {
    }
})

while (true) {
    coroutine.sleep(1000);
    console.log(new Date());
    var cnt = Math.random() * 10000;
    for (var i = 0; i < cnt; i++)
        new Buffer(100000);
}
