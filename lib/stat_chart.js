var asciichart = require('asciichart');

exports.stat_chart = function (name, type, tm, stats, interval) {
    var title;
    var line = '    ─────┼';
    var rule;
    var _date = interval >= 60;
    var mark_interval;
    var base_tm = tm - stats.length + 1;
    var padding = '        ';

    function format_pc(x) {
        return (padding + (x * 100).toFixed(2) + '%').slice(-padding.length);
    }

    function format_num(x) {
        var s;

        if (x < 1024)
            s = x;
        else if (x < 1024 * 1024)
            s = (x / 1024).toFixed(1) + 'K';
        else if (x < 1024 * 1024 * 1024)
            s = (x / (1024 * 1024)).toFixed(1) + 'M';
        else if (x < 1024 * 1024 * 1024 * 1024)
            s = (x / (1024 * 1024 * 1024)).toFixed(1) + 'T';
        else if (x < 1024 * 1024 * 1024 * 1024 * 1024)
            s = (x / (1024 * 1024 * 1024 * 1024)).toFixed(1) + 'P';
        else
            s = (x / (1024 * 1024 * 1024 * 1024 * 1024)).toFixed(1) + 'E';

        return (padding + s).slice(-padding.length);
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

    var left = Math.round(Math.max(0, (stats.length + 10 - name.length - 2) / 2));
    title = ' '.repeat(left) + ` ${name} ` + ' '.repeat(Math.max(0, stats.length - left));

    line = line + '─'.repeat(stats.length + 1);
    rule = ' '.repeat(stats.length + 11);

    put_mark(0);
    if (stats.length > 6) {
        put_mark(stats.length - 1);

        var pos = (Math.floor((base_tm + 7) * interval / mark_interval) + 1) * mark_interval / interval - base_tm;

        while (pos < stats.length - 7) {
            put_mark(pos);
            pos += mark_interval / interval;
        }
    }

    var pc = type == 'percent';

    return title + '\n' + asciichart.plot(stats, {
        height: 10,
        format: pc ? format_pc : format_num
    }) + '\n' + line + '\n' + rule;
};

const pots = "⠀⡀⡄⡆⡇⢀⣀⣄⣆⣇⢠⣠⣤⣦⣧⢰⣰⣴⣶⣷⢸⣸⣼⣾⣿";
exports.cpu_chart = function (stats) {
    var usage = stats.usage;
    if (!usage)
        return "";

    if (usage.length > 30)
        usage = usage.slice(-30);
    else
        if (usage.length % 2)
            usage.push(0);

    usage = usage.map(x => Math.ceil(x * 4));

    var chs = [];
    for (var i = 0; i < usage.length; i += 2) {
        var idx = usage[i] + usage[i + 1] * 5;
        chs.push(pots[idx]);
    }

    return "\033[36m" + chs.join("") + "\033[0m";
};
