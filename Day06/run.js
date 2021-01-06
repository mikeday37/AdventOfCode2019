/*

--- Day 6: Universal Orbit Map ---

Answers:
    Part 1: 308790
    Part 2: 472

*/

const { assert } = require('console');
const { readFileSync } = require('fs');
const { hrtime } = require('process');

(function(){
    checkExamples();

    doWithBenchmarking(time =>
    {
        const tree = time('read and parse', ()=>parseOrbits(readFileSync('./input.txt', 'utf-8')));
        console.log(`Part 1: ${time('Part 1', ()=>getTotalOrbits(tree))}`);
        console.log(`Part 2: ${time('Part 2', ()=>getTransferCount(tree))}`);
    });
})();

function parseOrbits(input)
{
    const lines = input.trim().split(/\r?\n/).map(x => x.trim());
    const tree = new Map(); // orbiter -> what it orbits | equivalently: represents A)B as B -> A
    for (let l of lines)
    {
        const a = l.split(')');
        tree.set(a[1], a[0]);
    }
    return tree;
}

function getTotalOrbits(tree)
{
    let total = 0;
    tree.forEach(b => total += 1 + getPathToCenter(tree, b).length); // A)B as B -> A
    return total;
}

function getPathToCenter(tree, start)
{
    let path = [];
    let current = start;
    while (tree.has(current)) // A)B as B -> A
    {
        current = tree.get(current);
        path.push(current);
    }
    assert(current === 'COM', `unexpected center of mass: ${current}`);
    return path;
}

function getTransferCount(tree, x = 'YOU', y = 'SAN')
{
    const [xPath, yPath] = [x,y].map(v => getPathToCenter(tree, v).reverse());
    
    let i = 0;
    while (xPath[i] === yPath[i])
        i++;

    return xPath.length + yPath.length - i - i;
}

function checkExamples()
{
    let allPass = true;
    let checkCount = 0;

    function check(expected, checkMethod, input)
    {
        ++checkCount;
        const tree = parseOrbits(input);
        const result = checkMethod(tree);
        const pass = result === expected;
        assert(pass, `check # ${checkCount} failed:  expected = ${expected}, returned = ${result}`);
        if (!pass) allPass = false;
    }

    function check1(expected, input) {check(expected, getTotalOrbits, input);}
    function check2(expected, input) {check(expected, getTransferCount, input);}

    doChecks();

    if (allPass)
        console.log(`--- All ${checkCount} Checks PASSED ---`);
    else
        console.log('--- !! At least one check FAILED !! ---');

    function doChecks()
    {
        check1(3, `
            COM)A
            A)B
        `);
        check1(6, `
            COM)A
            A)B
            B)C
        `);
        check1(5, `
            COM)A
            A)B
            A)C
        `);
        // this time official examples are below, manual above
        check1(42, `
            COM)B
            B)C
            C)D
            D)E
            E)F
            B)G
            G)H
            D)I
            E)J
            J)K
            K)L
        `);
        check2(4, `
            COM)B
            B)C
            C)D
            D)E
            E)F
            B)G
            G)H
            D)I
            E)J
            J)K
            K)L
            K)YOU
            I)SAN
        `)
    }
}

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
