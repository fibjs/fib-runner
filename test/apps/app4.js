var coroutine = require('coroutine');

while (true) {
    console.log(new Date());
    coroutine.sleep(10);
}