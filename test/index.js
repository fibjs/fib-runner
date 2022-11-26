var test = require('test');
test.setup();

var http = require('http');
var path = require('path');
var coroutine = require('coroutine');

var Runner = require('..');

describe('runner', () => {
    var svr;
    var sem;
    var data;
    var runner;

    before(() => {
        sem = new coroutine.Semaphore(0);
        svr = new http.Server(18922, r => {
            data = r.json();
            sem.post();
        });

        svr.start();
    });

    after(() => {
        svr.stop();
    });

    beforeEach(() => {
        runner = new Runner();
    });

    afterEach(() => {
        runner.shutdown();
    });

    function wait_data() {
        data = undefined;
        sem.wait();
        return data;
    }

    it("add app", () => {
        runner.add({
            name: 'app1',
            script: path.join(__dirname, "apps/app1.js")
        });

        assert.equal(runner.apps["app1"].status, "RUNNING");
        wait_data();
        assert.equal(runner.apps["app1"].status, "RUNNING");
    });

    it("not auto start", () => {
        runner.add({
            name: 'app2',
            autostart: false,
            script: path.join(__dirname, "apps/app2.js")
        });

        assert.equal(runner.apps["app2"].status, "STOPPED");
    });

    it("auto restart", () => {
        runner.add({
            name: 'app1',
            script: path.join(__dirname, "apps/app1.js")
        });

        assert.equal(runner.apps["app1"].status, "RUNNING");
        wait_data();
        assert.equal(runner.apps["app1"].status, "RUNNING");

        var t = new Date();
        wait_data();
        assert.greaterThan(new Date() - t, 900);
        wait_data();
        assert.greaterThan(new Date() - t, 1900);
        assert.equal(runner.apps["app1"].status, "RUNNING");

        for (var i = 0; i < 10 && runner.apps["app1"].proc; i++)
            coroutine.sleep(300);

        assert.isUndefined(runner.apps["app1"].proc);
        assert.equal(runner.apps["app1"].status, "FAILED");
    });

    it("stop", () => {
        runner.add({
            name: 'app2',
            script: path.join(__dirname, "apps/app2.js")
        });

        assert.equal(runner.apps["app2"].status, "RUNNING");
        wait_data();
        assert.equal(runner.apps["app2"].status, "RUNNING");

        runner.stop('app2');
        assert.equal(runner.apps["app2"].status, "STOPPING");

        for (var i = 0; i < 10 && runner.apps["app2"].proc; i++)
            coroutine.sleep(300);

        assert.isUndefined(runner.apps["app2"].proc);
        assert.equal(runner.apps["app2"].status, "STOPPED");
    });

    it("stop/start", () => {
        runner.add({
            name: 'app2',
            script: path.join(__dirname, "apps/app2.js")
        });

        assert.equal(runner.apps["app2"].status, "RUNNING");
        wait_data();
        assert.equal(runner.apps["app2"].status, "RUNNING");

        runner.stop('app2');
        assert.equal(runner.apps["app2"].status, "STOPPING");
        runner.start('app2');
        assert.equal(runner.apps["app2"].status, "RUNNING");

        wait_data();

        assert.equal(runner.apps["app2"].retries, 0);
    });

    it("stop/start/stop", () => {
        runner.add({
            name: 'app2',
            script: path.join(__dirname, "apps/app2.js")
        });

        assert.equal(runner.apps["app2"].status, "RUNNING");
        wait_data();
        assert.equal(runner.apps["app2"].status, "RUNNING");

        runner.stop('app2');
        assert.equal(runner.apps["app2"].status, "STOPPING");
        runner.start('app2');
        assert.equal(runner.apps["app2"].status, "RUNNING");
        wait_data();
        runner.stop('app2');
        assert.equal(runner.apps["app2"].status, "STOPPING");

        for (var i = 0; i < 10 && runner.apps["app2"].proc; i++)
            coroutine.sleep(300);

        assert.isUndefined(runner.apps["app2"].proc);
        assert.equal(runner.apps["app2"].status, "STOPPED");
    });

    it("not auto restart", () => {
        runner.add({
            name: 'app1',
            autorestart: false,
            script: path.join(__dirname, "apps/app1.js")
        });

        assert.equal(runner.apps["app1"].status, "RUNNING");
        wait_data();
        assert.equal(runner.apps["app1"].status, "RUNNING");

        for (var i = 0; i < 10 && runner.apps["app1"].proc; i++)
            coroutine.sleep(300);

        assert.isUndefined(runner.apps["app1"].proc);
        assert.equal(runner.apps["app1"].status, "FAILED");
    });

    it("stop/start not auto restart", () => {
        runner.add({
            name: 'app2',
            autorestart: false,
            script: path.join(__dirname, "apps/app2.js")
        });

        assert.equal(runner.apps["app2"].status, "RUNNING");
        wait_data();
        assert.equal(runner.apps["app2"].status, "RUNNING");

        runner.stop('app2');
        assert.equal(runner.apps["app2"].status, "STOPPING");
        runner.start('app2');
        assert.equal(runner.apps["app2"].status, "RUNNING");
        wait_data();
        runner.stop('app2');
        assert.equal(runner.apps["app2"].status, "STOPPING");

        for (var i = 0; i < 10 && runner.apps["app2"].proc; i++)
            coroutine.sleep(300);

        assert.isUndefined(runner.apps["app2"].proc);
        assert.equal(runner.apps["app2"].status, "STOPPED");
    });

    it("update option", () => {
        runner.add({
            name: 'app2',
            script: path.join(__dirname, "apps/app2.js")
        });

        assert.equal(runner.apps["app2"].status, "RUNNING");
        wait_data();
        assert.equal(runner.apps["app2"].status, "RUNNING");

        var reload = runner.update({
            name: 'app2',
            script: path.join(__dirname, "apps/app2.js"),
            startretries: 10
        });
        assert.isFalse(reload);
        assert.equal(runner.apps["app2"].status, "RUNNING");

        var reload = runner.update({
            name: 'app2',
            script: path.join(__dirname, "apps/app2.js"),
            arg: ['newarg']
        });
        assert.isTrue(reload);

        assert.equal(runner.apps["app2"].status, "RUNNING");
        wait_data();
        assert.equal(runner.apps["app2"].status, "RUNNING");
    });

    it("reload", () => {
        runner.add({
            name: 'app2',
            script: path.join(__dirname, "apps/app2.js")
        });

        wait_data();
        assert.equal(runner.apps["app2"].status, "RUNNING");

        runner.add({
            name: 'app3',
            script: path.join(__dirname, "apps/app2.js")
        });

        wait_data();
        assert.equal(runner.apps["app3"].status, "RUNNING");

        runner.reload({
            apps: [
                {
                    name: 'app2',
                    script: path.join(__dirname, "apps/app2.js")
                },
                {
                    name: 'app4',
                    script: path.join(__dirname, "apps/app2.js")
                }
            ]
        })

        wait_data();
        assert.equal(runner.apps["app4"].status, "RUNNING");
    });
});

test.run();