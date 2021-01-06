const { hrtime } = require('process');

exports.doWithBenchmarking = doWithBenchmarking;

// use like this:
// doWithBenchmarking(time =>{
//     let result = time('label', ()=>doStuffThatNeedsToBeTimed()); // time() returns whatever the inner function returns
//     let result = time('another', ()=>youCanTimeAsManyThingsAsYouWant()); // just don't use time() in a loop unless you give it separate labels
// })
function doWithBenchmarking(body)
{
    const maxRuns = 100, maxSeconds = 1;

    let timings = new Map();
    function time(label, action)
    {
        let result = null, run = 1, start = hrtime();
        while (run < 2 || (hrtime(start)[0] <= maxSeconds && run <= maxRuns))
        {
            const before = hrtime();
            result = action();
            const duration = hrtime(before);
            if (!timings.has(label))
                timings.set(label, []);
            timings.get(label).push(duration);
            run++;
        }
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