const { hrtime } = require('process');

exports.benchmark = benchmark;
exports.addExtensions = addExtensions;


// use like this:
//
// common.benchmark(time =>{
//     const result = time('label', ()=>doStuffThatNeedsToBeTimed()); // time() returns whatever the inner function returns
//     const result2 = time('another', ()=>youCanTimeAsManyThingsAsYouWant()); // just don't use time() in a loop unless you give it separate labels
// })
function benchmark(body, maxRuns = null)
{
    const runLimit = maxRuns || 100, maxSeconds = 1;

    let timings = new Map();
    function time(label, action)
    {
        timings.set(label, []);
        let result = null, run = 1, start = hrtime();
        do
        {
            const before = hrtime();
            result = action();
            const duration = hrtime(before);

            timings.get(label).push(duration);

            run++;
        }
        while (hrtime(start)[0] < maxSeconds && run <= runLimit);

        return result;
    }

    body(time);

    console.log('\n--- timing info: ---')

    function toPrettyDuration(nanoseconds) {
        const v = BigInt(nanoseconds);
        let u = 0;
        let divisor = 1n;
        let threshold = 1000n;
        while (u < 3 && v >= threshold)
        {
            u++;
            divisor *= 1000n;
            threshold *= 1000n;
        }
        const number = u === 0 ? String(v) : ((Number(v) / Number(divisor)).toFixed(3));
        return `${number}${['ns','μs','ms','s'][u]}`;
    };

    console.log('                        average:       median:        min:           max:           runs:');
    console.log('                      +--------------+--------------+--------------+--------------+--------+');

    timings.forEach((rawDurations, label) => {
        const runs = rawDurations.length;
        let durations = rawDurations.map(x => BigInt(x[0]) * 1_000_000_000n + BigInt(x[1])); // in nanoseconds
        durations.sort((a, b) => a > b ? 1 : -1);
        const [min, max] = [durations[0], durations[runs - 1]].map(x => toPrettyDuration(x));
        const average = toPrettyDuration(durations.reduce((a,b) => a + b) / BigInt(runs));
        const middleIndex = Math.floor(runs / 2);
        const median = toPrettyDuration((runs % 2 !== 0) ? durations[middleIndex] : ((durations[middleIndex] + durations[middleIndex - 1]) / 2n));
        console.log(`${label.padStart(20, ' ')}  |${average.padStart(12, ' ')}  |${median.padStart(12, ' ')}  |`
            + `${min.padStart(12, ' ')}  |${max.padStart(12, ' ')}  |${String(runs).padStart(6, ' ')}  |`);
    });

    console.log('                      +--------------+--------------+--------------+--------------+--------+');
    console.log('--- end ---');
}

function addExtensions()
{
    // decided to play with technique for extending existing types "safely."
    // this seems to be the closest you can get to C# extension methods in JS,
    // and is not without serious caveats.
    //
    // of particular note, this affects the entire "realm" it is executed in, so
    // this is not an appropriate technique to use in published/shared library
    // code, where you don't have control over other code executed in the realm.
    //
    // see: https://stackoverflow.com/a/9354310/4730748
    //

    Object.defineProperty(Array.prototype, "withIndex", {
        value: function withIndex(){
            let result = [];
            for (let i = 0; i < this.length; i++)
                result.push({item: this[i], index: i});
            return result;
        },
        writable: true,
        configurable: true
    });

    Object.defineProperty(String.prototype, "toNumberArray", {
        value: function toNumberArray(){
            return [...this].map(x => Number(x));
        },
        writable: true,
        configurable: true
    });
}
