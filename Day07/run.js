'use strict';
const { assert } = require('console');
const { readFileSync } = require('fs');
const common = require('../common.js');
const { getIntcodeService } = require('../intcode.js');

(function(){
    common.day(7, 'Amplification Circuit',
        255840,
        84088865
    );
    
    common.addExtensions();

    common.benchmark((time, doPart) => {
        const intcode = time('get service', ()=>getIntcodeService());
        const program = time('read and parse', ()=>intcode.parse(readFileSync('./input.txt', 'utf-8')));

        checkExamples(intcode);

        doPart(1, () => getMaxThrusterSignal1(intcode, program));
        doPart(2, () => getMaxThrusterSignal2(intcode, program));
    });
})();

function permute(a, fn)
{
    if (a.length === 1)
        fn(a);
    else
        for (let i = 0; i < a.length; i++)
            permute([...a.slice(0, i), ...a.slice(i + 1)], (r) => fn([a[i], ...r]));
}

function getMaxThrusterSignal1(intcode, program) {return getMaxThrusterSignal(intcode, program, [0,1,2,3,4], getThrusterSignal);}
function getMaxThrusterSignal2(intcode, program) {return getMaxThrusterSignal(intcode, program, [5,6,7,8,9], getThrusterSignalWithFeedbackLoop);}

function getMaxThrusterSignal(intcode, program, phaseSettings, signalFunction)
{
    let max = 0;
    permute(phaseSettings, phaseArray => {
        let signal = signalFunction(intcode, program, phaseArray);
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

function getThrusterSignalWithFeedbackLoop(intcode, program, phaseArray)
{
    let amps = [..."ABCDE"].withIndex().map(x => {
        let buffer = [];
        let ampState = {
            name: x.item,
            phaseSetting: phaseArray[x.index],
            buffer,
            machine: intcode.init(program, {
                hasInput: () => buffer.length > 0,
                readInput: () => buffer.shift(),
                writeOutput: v => amps[(x.index + 1) % amps.length].buffer.push(v)
            }),
            step: () => ampState.machine.step(),
            isDone: () => ampState.machine.haltCode === ampState.machine.HALTCODE_NORMAL_TERMINATION,
            isBlocked: () => ampState.machine.haltCode === ampState.machine.HALTCODE_WAITING_FOR_INPUT,
            isHalted: () => ampState.machine.haltCode !== 0,
            isFaulted: () => ampState.isHalted() && !ampState.isBlocked()
        };
        buffer.push(ampState.phaseSetting);
        return ampState;
    });
    amps[0].buffer.push(0);

    let anySteps;
    do
    {
        anySteps = false;
        for (let amp of amps)
        {
            // don't do anything with this amp if its done or blocked without input
            if (amp.isDone() || (amp.isBlocked() && amp.buffer.length === 0))
                continue;

            // if faulted, throw
            if (amp.isFaulted())
                throw Error(`amplifier ${amp.name} halted abnormally: code = ${amp.machine.haltCode}, reason = ${amp.machine.haltReason}`);

            // otherwise, we should be able to step until halted
            do
            {
                amp.step();
                anySteps = true;
            }
            while (!amp.isHalted());
        }
    }
    while (anySteps);

    return amps[0].buffer[0];
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

    function check1(expected, input) {check(expected, (program) => getMaxThrusterSignal1(intcode, program), input);}
    function check2(expected, input) {check(expected, (program) => getMaxThrusterSignal2(intcode, program,), input);}

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

        check2(139629729, `
            3,26,1001,26,-4,26,3,27,1002,27,2,27,1,27,26,
            27,4,27,1001,28,-1,28,1005,28,6,99,0,0,5
        `);
        check2(18216, `
            3,52,1001,52,-5,52,3,53,1,52,56,54,1007,54,5,55,1005,55,26,1001,54,
            -5,54,1105,1,12,1,53,54,53,1008,54,0,55,1001,55,1,55,2,53,55,53,4,
            53,1001,56,-1,56,1005,56,6,99,0,0,0,0,10
        `);
    }
}
