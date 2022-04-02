var asciichart = require('asciichart');

module.exports = function (type, tm, usage, interval) {
    var title;
    var line = '    ─────┼';
    var rule;
    var _date = interval >= 60;
    var mark_interval;
    var base_tm = tm - usage.length + 1;
    var padding = '        ';

    function format_cpu(x) {
        return (padding + (x * 100).toFixed(2) + '%').slice(-padding.length);
    }

    function format_mem(x) {
        return (padding + (x / (1024 * 1024)).toFixed(1) + 'M').slice(-padding.length);
    }

    function put_mark(pos) {
        var d = new Date((base_tm + pos) * interval * 60000);
        var _mark = _date ? (' ' + d.getDate()).slice(-2) + '/' + ((d.getMonth() + 1) + ' ').slice(0, 2)
            : (' ' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);

        if (pos > 0)
            line = line.substr(0, pos + 9) + '┬' + line.substr(pos + 10);
        rule = rule.substr(0, pos + 7) + _mark + rule.substr(pos + 12);
    }

    switch (Number(interval)) {
        case 1:
            mark_interval = 15;
            break;
        case 5:
            mark_interval = 60;
            break;
        case 15:
            mark_interval = 180;
            break;
        case 60:
            mark_interval = 1440;
            break;
        case 240:
            mark_interval = 5760;
            break;
        case 720:
            mark_interval = 17280;
            break;
    }

    var left = Math.floor((usage.length+ 10) / 2 - 5);
    title = ' '.repeat(left) + ` ${type} usage ` + ' '.repeat(Math.max(0, usage.length - left));

    line = line + '─'.repeat(usage.length + 1);
    rule = ' '.repeat(usage.length + 11);

    put_mark(0);
    if (usage.length > 6) {
        put_mark(usage.length - 1);

        var pos = (Math.floor((base_tm + 7) * interval / mark_interval) + 1) * mark_interval / interval - base_tm;

        while (pos < usage.length - 7) {
            put_mark(pos);
            pos += mark_interval / interval;
        }
    }

    return title + '\n' + asciichart.plot(usage, {
        height: 10,
        format: type == 'cpu' ? format_cpu : format_mem
    }) + '\n' + line + '\n' + rule;
};