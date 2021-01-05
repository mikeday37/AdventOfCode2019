/*

--- Day 5: Sunny with a Chance of Asteroids ---

Answers:
    Part 1: 15386262
    Part 2: 

*/

const { assert } = require('console');
const { readFileSync } = require('fs');

(function(){
    const ops = getKnownIntcodeOperations();

    checkExamples(ops);
    doPart1(ops);
})();

function doPart1(ops)
{
    const program = parseProgram(readFileSync('./input.txt', 'utf-8').trim());
    const result = runIntcodeProgram(ops, program, [1]);
    let nonZeros = 0, last = null;
    for (let o of result.output)
    {
        if (o !== 0) nonZeros++;
        last = o;
    }
    const valid = nonZeros === 1 && last !== 0;
    assert(valid, "computer invalid");
    console.log(`Part 1: ${last}`);
}

function parseProgram(programString)
{
    return programString.trim().split(',').map(v=>Number(v.trim()));
}

function checkExamples(ops)
{
    let index = 0;
    let pass = true;

    function check(rawProgram, input = [], expectedOutput = []) {
        const checkNum = ++index;
        const program = parseProgram(rawProgram);
        const result = runIntcodeProgram(ops, program, input);
        const isValid = result.haltCode === 1 && expectedOutput.join(',') === result.output.join(',');
        assert(isValid, `example ${checkNum} failed`);
        if (!isValid)
            pass = false;
    }

    check('3,0,4,0,99', [37], [37]);
    check('1002,4,3,4,33');
    check('1101,100,-1,4,0')
    // official above, manual below
    check('4,1,99', [], [1]);
    check('1102,7,12,5,104,-999,104,-1,99', [], [84, -1]);
    check('3,0,3,1,1,0,1,0,4,0,99', [1010,303], [1313]);

    if (pass) console.log(`--- All ${index} Examples PASSED ---`);
}

function getKnownIntcodeOperations()
{
    let ops = new Map();

    const operation =   (opcode, name, paramCount, impl) =>
        ops.set(opcode, {opcode, name, paramCount, impl});

    operation( 1,   'add',   3,  c => c.write(3, c.read(1) + c.read(2)) );
    operation( 2,   'mul',   3,  c => c.write(3, c.read(1) * c.read(2)) );

    operation( 3,   'in',    1,  c => c.write(1, c.ioRead())            );
    operation( 4,   'out',   1,  c => c.ioWrite(c.read(1))              );

    operation( 99,  'halt',  0,  c => c.halt()                          );

    return ops;
}

function runIntcodeProgram(ops, initialMemory, input = [])
{
    let memory = [...initialMemory];
    let output = [];
    let inputPointer = 0;
    let instructionPointer = 0;
    let haltCode = 0;
    let haltReason = null;
    const doHalt = (code, reason) => [haltCode, haltReason] = [code, reason];
    while (haltCode === 0)
    {
        if (instructionPointer < 0)
        {
            doHalt(-1, `instruction pointer too low: ${instructionPointer}`);
            break;
        }
        if (instructionPointer >= memory.length)
        {
            doHalt(-2, `instruction pointer too high: ${instructionPointer}`);
            break;
        }

        const opcodeValue = memory[instructionPointer];
        const opcode = Number(String(opcodeValue).slice(-2));

        if (!ops.has(opcode))
        {
            doHalt(-3, `unknown opcode: ${opcode}`);
            break;
        }

        const op = ops.get(opcode);

        if (instructionPointer + op.paramCount >= memory.length)
        {
            doHalt(-4, `instruction ${op.name} requires ${op.paramCount} parameters, requiring memory read out of range.`);
            break;
        }

        const modeString = String(Number(opcodeValue) + 10 ** (2 + op.paramCount)).slice(1, op.paramCount + 1);
        const parameterModes = [...modeString].reverse().map(x => Number(x));
        const parameterValues = memory.slice(instructionPointer + 1, instructionPointer + 1 + op.paramCount);
        const paramRead = a => parameterModes[a - 1] == 0 ? memory[parameterValues[a - 1]] : parameterValues[a - 1];
        const paramWrite = (a, v) => {assert(parameterModes[a - 1] == 0); memory[parameterValues[a - 1]] = v;}

        let nextInstructionPointer = null;

        op.impl({
            read: a => paramRead(a),
            write: (a, v) => paramWrite(a, v),
            ioRead: () => {assert(inputPointer < input.length, 'input overrun'); return input[inputPointer++];},
            ioWrite: v => output.push(v),
            halt: () => doHalt(1, 'normal termination')
        });

        if (nextInstructionPointer !== null)
            instructionPointer = nextInstructionPointer;
        else if (haltCode === 0)
            instructionPointer += 1 + op.paramCount;
    }
    return {
        memory,
        output,
        instructionPointer,
        inputPointer,
        haltCode,
        haltReason
    }
}