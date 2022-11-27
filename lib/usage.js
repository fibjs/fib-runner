const usage_history_size = 120;

module.exports = class Usage {
    constructor(type) {
        this.type = type;
        this.usages = {
            1: [],
            5: [],
            15: [],
            60: [],
            240: [],
            720: []
        };
        var tm = new Date();
        this.now = {
            1: {
                tm: Math.round(tm / (1 * 60000)),
                val: 0,
                count: 0
            },
            5: {
                tm: Math.round(tm / (5 * 60000)),
                val: 0,
                count: 0
            },
            15: {
                tm: Math.round(tm / (15 * 60000)),
                val: 0,
                count: 0
            },
            60: {
                tm: Math.round(tm / (60 * 60000)),
                val: 0,
                count: 0
            },
            240: {
                tm: Math.round(tm / (240 * 60000)),
                val: 0,
                count: 0
            },
            720: {
                tm: Math.round(tm / (720 * 60000)),
                val: 0,
                count: 0
            }
        };
    }

    append(usage) {
        const intervals = [1, 5, 15, 60, 240, 720];

        for (var i = 0; i < intervals.length; i++) {
            var interval = intervals[i];
            var tm = Math.round(new Date() / (interval * 60000));
            var now = this.now[interval];

            if (tm == now.tm) {
                var count = now.count;
                now.val = (now.val * count + usage) / (count + 1);
                now.count = count + 1;
            } else {
                var usages = this.usages[interval];

                usages.push(now.val);
                var len = usages.length - usage_history_size;
                if (len >= 0)
                    delete usages[len];

                now.tm = tm;
                now.val = usage;
                now.count = 1;
            }
        }
    }

    history(interval) {
        if (interval != 1 && interval != 5 && interval != 15 && interval != 60 && interval != 240 && interval != 720)
            throw new Error(`interval must be 1|5|15|60|240|720.`);

        var now = this.now[interval];
        var usages = this.usages[interval];
        var usages = usages.slice(Math.max(usages.length - usage_history_size + 1, 0));
        usages.push(now.val);

        return {
            type: this.type,
            tm: now.tm,
            usage: usages
        };
    }
};
