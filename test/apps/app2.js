var http = require('http');
var coroutine = require('coroutine');

http.post("http://127.0.0.1:18922", {
    json: {
    }
})

while (true) {
    coroutine.sleep(1500);
    for (var i = 0; i > 10000; i++)
        new Buffer();
}
