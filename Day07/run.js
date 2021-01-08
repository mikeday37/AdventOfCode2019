const { assert } = require('console');
const { readFileSync } = require('fs');
const common = require('../common.js');
const { getIntcodeService } = require('../intcode.js');

(function(){
    common.day(7, 'Amplification Circuit',
        255840

    );
    
    common.benchmark((time, doPart) => {
        const intcode = time('get service', ()=>getIntcodeService());
        const program = time('read and parse', ()=>intcode.parse(readFileSync('./input.txt', 'utf-8')));

        checkExamples(intcode);

        doPart(1, ()=>getMaxThrusterSignal(intcode, program));
    });
})();

function permute(a, fn)
{
    if (a.length === 1)
        fn(a);
    else
        if (a.length > 1)
            for (let i = 0; i < a.length; i++)
                permute([...a.slice(0, i), ...a.slice(i + 1)], (r) => fn([a[i], ...r]));
}

function getMaxThrusterSignal(intcode, program)
{
    let max = 0;
    permute([0,1,2,3,4], phaseArray => {
        let signal = getThrusterSignal(intcode, program, phaseArray);
        if (signal > max)
            max = signal;
    });
    return max;
}

function getThrusterSignal(intcode, program, phaseArray)
{
    let signal = 0;
    for (let phase of phaseArray)
        signal = intcode.run(program, [phase, signal]).output[0];
    return signal;
}

function checkExamples(intcode)
{
    let allPass = true;
    let checkCount = 0;

    function check(expected, checkMethod, input)
    {
        ++checkCount;
        const program = intcode.parse(input);
        const result = checkMethod(program);
        const pass = result === expected;
        assert(pass, `check # ${checkCount} failed:  expected = ${expected}, returned = ${result}`);
        if (!pass) allPass = false;
    }

    function check1(expected, input) {check(expected, (program) => getMaxThrusterSignal(intcode, program), input);}

    doChecks();

    if (allPass)
        console.log(`--- All ${checkCount} Checks PASSED ---`);
    else
        console.log('--- !! At least one check FAILED !! ---');

    function doChecks()
    {
        check1(43210, `
            3,15,3,16,1002,16,10,16,1,16,15,15,4,15,99,0,0
        `);
        check1(54321, `
            3,23,3,24,1002,24,10,24,1002,23,-1,23,
            101,5,23,23,1,24,23,23,4,23,99,0,0
        `);
        check1(65210, `
            3,31,3,32,1002,32,10,32,1001,31,-2,31,1007,31,0,33,
            1002,33,7,33,1,33,31,31,1,32,31,31,4,31,99,0,0,0
        `);
        // official examples above
    }
}
