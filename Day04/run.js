'use strict';
const { assert } = require('console');
const { readFileSync } = require('fs');
const common = require('../common.js');

(function(){
    common.day(4, 'Secure Container',
        889,
        589
    );    
    common.addExtensions();

    doTests();

    const range = readFileSync('./input.txt', 'utf-8').trim().split('-').map(x => Number(x.trim()));
    const [min, max] = [range[0], range[1]]

    common.benchmark((time, doPart) =>
    {
        doPart(1, ()=>getPart(min, max, 1));
        doPart(2, ()=>getPart(min, max, 2));
    });
})();

function doTests()
{
    let examples = [
        {value: '111111', part1valid: true, part2valid: false},
        {value: '223450', part1valid: false, part2valid: false},
        {value: '123789', part1valid: false, part2valid: false},

        {value: '112233', part1valid: true, part2valid: true},
        {value: '123444', part1valid: true, part2valid: false},
        {value: '111122', part1valid: true, part2valid: true},

        // official above, manual below

        {value: '111333', part1valid: true, part2valid: false},
        {value: '307237', part1valid: false, part2valid: false},
        {value: '769058', part1valid: false, part2valid: false},
        {value: '111223', part1valid: true, part2valid: true},
        {value: '123345', part1valid: true, part2valid: true},
        {value: '122345', part1valid: true, part2valid: true},
        {value: '223456', part1valid: true, part2valid: true},
    ];

    let pass = true;
    for (let e of examples.withIndex())
        if (!doSingleTest(`example index ${e.index}`, e.item.value, e.item.part1valid, e.item.part2valid))
            pass = false;

    if (pass)
        console.log('--- All Examples PASSED ---');

    assert(pass, 'At least one example failed.');
}

function doSingleTest(logLabel, numberString, part1answer, part2answer, verbose = false)
{
    let digits = numberString.toNumberArray();
    let results = [1,2].map(x => ({
        part: x,
        valid: isValid(digits, x),
        expected: (x == 1 ? part1answer : part2answer)
    }));
    if (verbose) console.log(`${logLabel} = '${numberString}':`);
    let pass = true;
    for (let r of results)
    {
        let examplePass = r.valid === r.expected;
        if (verbose) console.log(`\tpart ${r.part}: valid = ${r.valid}, expected = ${r.expected} -- ${(examplePass ? "PASS" : "FAIL")}`);
        if (!examplePass)
            pass = false;
    }
    return pass;
}

function getPart(min, max, part)
{
    // there's tons of room to optimize, here, and in the isValid() function.
    // but as it is, it ran in under one second for each part.
    //
    // If the range was much larger, I would try optimiznig primarily by keeping the number as a digit array,
    // and incrementing only in a manner that doesn't violate the 'never decrease' rule, which would
    // make it evaluate far fewer values.
    //
    // another optimization would be to rewrite isValid() to perform both part1 and part2
    // simultaneously, and have that and this function return both, so there's only one loop
    // through the range.

    let validCount = 0;
    for (let n = min; n <= max; n++) {
        if (isValid(String(n).toNumberArray(), part))
            validCount++;
    }

    return validCount;
}

function isValid(digits, part)
{
    if (digits.length !== 6) return false;

    let sameAsLastCount = 0;
    let strictPairCount = 0;
    let lastDigit = null;

    let part2check = part == 1 ? (function(){}) : (function(){
        if (sameAsLastCount == 1)
            strictPairCount++;
        sameAsLastCount = 0;
    })

    for (let d of digits)
    {
        if (lastDigit !== null)
        {
            if (d === lastDigit)
                ++sameAsLastCount;
            else 
            {
                if (d < lastDigit)
                    return false;

                part2check();
            }
        }

        lastDigit = d;
    }
    part2check();

    if (part == 1)
        return sameAsLastCount >= 1;
    else
        return strictPairCount >= 1;
}