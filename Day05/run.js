/*

--- Day 5: Sunny with a Chance of Asteroids ---

Answers:
    Part 1: 15386262
    Part 2: 10376124

*/

const { assert } = require('console');
const { readFileSync } = require('fs');

(function(){
    const ops = getKnownIntcodeOperations();

    checkExamples(ops);

    const program = parseProgram(readFileSync('./input.txt', 'utf-8').trim());
    doPart1(ops, program);
    doPart2(ops, program);
})();

function doPart1(ops, program)
{
    const result = runIntcodeProgram(ops, program, [1]);
    let nonZeros = 0, last = null;
    for (let o of result.output)
    {
        if (o !== 0) nonZeros++;
        last = o;
    }
    const valid = result.haltCode === 1 && nonZeros === 1 && last !== 0;
    assert(valid, "computer invalid");
    console.log(`Part 1: ${last}`);
}

function doPart2(ops, program)
{
    const result = runIntcodeProgram(ops, program, [5]);
    const valid = result.haltCode === 1 && result.output.length === 1;
    assert(valid, "part 2 computer invalid");
    console.log(`Part 2: ${result.output[0]}`);
}

function parseProgram(programString)
{
    return programString.trim().split(',').map(v=>Number(v.trim()));
}

function checkExamples(ops)
{
    let index = 0;
    let pass = true;

    function check(rawProgram, input = [], expectedOutput = [], logSteps = false) {
        const checkNum = ++index;
        const program = parseProgram(rawProgram);
        const result = runIntcodeProgram(ops, program, input, logSteps);
        const isValid = result.haltCode === 1 && expectedOutput.join(',') === result.output.join(',');
        assert(isValid, `example ${checkNum} failed`);
        if (!isValid)
            pass = false;
    }

    check('3,0,4,0,99', [37], [37]);
    check('1002,4,3,4,33');
    check('1101,100,-1,4,0')

    check('3,9,8,9,10,9,4,9,99,-1,8', [8], [1]);
    check('3,9,8,9,10,9,4,9,99,-1,8', [7], [0]);
    check('3,9,8,9,10,9,4,9,99,-1,8', [9], [0]);

    check('3,9,7,9,10,9,4,9,99,-1,8', [7], [1]);
    check('3,9,7,9,10,9,4,9,99,-1,8', [8], [0]);
    check('3,9,7,9,10,9,4,9,99,-1,8', [9], [0]);

    check('3,3,1108,-1,8,3,4,3,99', [8], [1]);
    check('3,3,1108,-1,8,3,4,3,99', [7], [0]);
    check('3,3,1108,-1,8,3,4,3,99', [9], [0]);

    check('3,3,1107,-1,8,3,4,3,99', [7], [1]);
    check('3,3,1107,-1,8,3,4,3,99', [8], [0]);
    check('3,3,1107,-1,8,3,4,3,99', [9], [0]);

    check('3,12,6,12,15,1,13,14,13,4,13,99,-1,0,1,9', [0], [0]);
    check('3,12,6,12,15,1,13,14,13,4,13,99,-1,0,1,9', [-1], [1]);
    check('3,12,6,12,15,1,13,14,13,4,13,99,-1,0,1,9', [1], [1]);
    check('3,12,6,12,15,1,13,14,13,4,13,99,-1,0,1,9', [999], [1]);
    
    check('3,3,1105,-1,9,1101,0,0,12,4,12,99,1', [0], [0]);
    check('3,3,1105,-1,9,1101,0,0,12,4,12,99,1', [-1], [1]);
    check('3,3,1105,-1,9,1101,0,0,12,4,12,99,1', [1], [1]);
    check('3,3,1105,-1,9,1101,0,0,12,4,12,99,1', [999], [1]);
    
    const largerExample = `
        3,21,1008,21,8,20,1005,20,22,107,8,21,20,1006,20,31,
        1106,0,36,98,0,0,1002,21,125,20,4,20,1105,1,46,104,
        999,1105,1,46,1101,1000,1,20,4,20,1105,1,46,98,99`;

    check(largerExample, [0], [999]);
    check(largerExample, [7], [999]);
    check(largerExample, [8], [1000]);
    check(largerExample, [9], [1001]);
    check(largerExample, [99], [1001]);
    
    // official above, manual below

    check('4,1,99', [], [1]);
    check('1102,7,12,5,104,-999,104,-1,99', [], [84, -1]);
    check('3,0,3,1,1,0,1,0,4,0,99', [1010,303], [1313]);

    // heh...
    let fibonacciIntcodeProgram =

        // @ 00:  skip variable area

          '1105,1,5'   // jump past convenient variable area
        +',0'          // placeholder, which will receive "limit" input variable
        +',0'          // placeholder, for testing the loop condition

        // @ 05:  initialize variables

        +',3,3'        // save limit from input -> [3]
        +',1101,0,0,0' // [0] = 0
        +',1101,0,1,1' // [1] = 1

        // @ 15:  loop beginning

        +',1,0,1,2'    // [2] = [1] + [0], get next in sequence
        +',4,0'        // output [0], oldest in sequence

        // @ 21:  stop if we would output over the limit next time

        +',7,1,3,4'    // [1] is next for output, write 1 to [4] if [1] < [3]
        +',1005,4,29'  // skip the next instruction (halt) if [4] === 1
        +',99'         // if we hit this we're done

        // @ 29: otherwise, continue

        +',101,0,1,0'  // [0] = [1], roll left part 1
        +',101,0,2,1'  // [1] = [2], roll left part 2
        +',1105,1,15';  // jump back to loop beginning

    check(fibonacciIntcodeProgram
        ,[145]
        ,[0,1,1,2,3,5,8,13,21,34,55,89,144]
    );
    check(fibonacciIntcodeProgram
        ,[700]
        ,[0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610]
    );

    if (pass) console.log(`--- All ${index} Examples PASSED ---`);
}

function getKnownIntcodeOperations()
{
    let ops = new Map();

    const operation =   (opcode, name, paramCount, impl) =>
        ops.set(opcode, {opcode, name, paramCount, impl});

    operation( 1,   'add',   3,  c => c.write(3, c.read(1) + c.read(2))           );
    operation( 2,   'mul',   3,  c => c.write(3, c.read(1) * c.read(2))           );

    operation( 3,   'in',    1,  c => c.write(1, c.ioRead())                      );
    operation( 4,   'out',   1,  c => c.ioWrite(c.read(1))                        );

    operation( 5,   'jit',   2,  c => {if (c.read(1) !== 0) c.jump(2);}           );
    operation( 6,   'jif',   2,  c => {if (c.read(1) === 0) c.jump(2);}           );

    operation( 7,   'lt',    3,  c => c.write(3, c.read(1)  <  c.read(2) ? 1 : 0) );
    operation( 8,   'eq',    3,  c => c.write(3, c.read(1) === c.read(2) ? 1 : 0) );

    operation( 99,  'halt',  0,  c => c.halt()                                    );

    return ops;
}

function runIntcodeProgram(ops, initialMemory, input = [], logSteps = false)
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

        if (logSteps)
        {
            console.log(`@ ${String(instructionPointer).padStart(4,'0')}:  ${op.name.padStart(4,' ')}`);
            // lol, that was enough to debug the fibonacci program :D
        }

        op.impl({
            read: a => paramRead(a),
            write: (a, v) => paramWrite(a, v),
            ioRead: () => {assert(inputPointer < input.length, 'input overrun'); return input[inputPointer++];},
            ioWrite: v => output.push(v),
            jump: a => nextInstructionPointer = paramRead(a),
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