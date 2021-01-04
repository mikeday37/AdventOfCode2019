/*

--- Day 4: Secure Container ---

Answers:
    Part 1: 889
    Part 2: 

*/

const { assert } = require('console');
const { readFileSync } = require('fs');

(function(){
    addExtensions();
    doTests();
    doPart1();
})();

function addExtensions()
{
    // decided to play with technique for extending existing types "safely."
    // this seems to be the closest you can get to C# extension methods in JS,
    // and is not without serious caveats.
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

};

function doTests()
{
    let passExamples = ['111111',           /* <- official, manual -> */ '122345', '111333'];
    let failExamples = ['223450', '123789', /* <- official, manual -> */ '307237', '769058'];

    let pass = true;
    console.log('- passing examples -');
    for (let pe of passExamples.withIndex())
        pass = logTest(`must pass example index ${pe.index}`, pe.item, true) && pass;
    console.log('- failing examples -');
    for (let pe of failExamples.withIndex())
        pass = logTest(`must fail example index ${pe.index}`, pe.item, false) && pass;

    if (pass)
        console.log('--- Examples PASSED ---');
    else
        console.log('--- !! EXAMPLE(s) FAILED !! ---')

    assert(pass, 'At least one example failed.'); // again, I like to assert in addition to log, to raise more attention if we're not a full pass.
}

function doPart1()
{
    let range = readFileSync('./input.txt', 'utf-8').trim().split('-').map(x => Number(x.trim()));
    let [min, max] = [range[0], range[1]];

    let validCount = 0;
    for (let n = min; n <= max; n++) {
        if (isValid(String(n).toNumberArray()))
            validCount++;
    }

    console.log(`Part 1: ${validCount}`);
}

function logTest(logLabel, numberString, expectedResult)
{
    let digits = numberString.toNumberArray();
    let valid = isValid(digits);
    let pass = expectedResult === valid;
    console.log(`${logLabel} = '${numberString}':  valid = ${valid}, expected = ${expectedResult} -- ${pass ? "PASS" : "FAIL"}`);
    return pass;
}

function isValid(digits)
{
    if (digits.length !== 6) return false;
    let sameAsLastCount = 0;
    let lastDigit = null;
    for (let d of digits)
    {
        if (lastDigit !== null)
        {
            if (d === lastDigit)
                ++sameAsLastCount;
            else if (d < lastDigit)
                return false;
        }

        lastDigit = d;
    }
    return sameAsLastCount >= 1;
}