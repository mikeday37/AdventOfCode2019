/*

--- Day 4: Secure Container ---

Answers:
    Part 1: 889
    Part 2: 589

*/

const { assert } = require('console');
const { readFileSync } = require('fs');

(function(){
    addExtensions();
    doTests();

    const range = readFileSync('./input.txt', 'utf-8').trim().split('-').map(x => Number(x.trim()));
    const [min, max] = [range[0], range[1]]
    doPart(min, max, 1);
    doPart(min, max, 2);
})();

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
        if (!logTest(`example index ${e.index}`, e.item.value, e.item.part1valid, e.item.part2valid))
            pass = false;

    if (pass)
        console.log('--- All Examples PASSED ---');

    assert(pass, 'At least one example failed.');
}

function logTest(logLabel, numberString, part1answer, part2answer)
{
    let digits = numberString.toNumberArray();
    let results = [1,2].map(x => ({
        part: x,
        valid: isValid(digits, x),
        expected: (x == 1 ? part1answer : part2answer)
    }));
    console.log(`${logLabel} = '${numberString}':`);
    let pass = true;
    for (let r of results)
    {
        let examplePass = r.valid === r.expected;
        console.log(`\tpart ${r.part}: valid = ${r.valid}, expected = ${r.expected} -- ${(examplePass ? "PASS" : "FAIL")}`);
        if (!examplePass)
            pass = false;
    }
    return pass;
}

function doPart(min, max, part)
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

    console.log(`Part ${part}: ${validCount}`);
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