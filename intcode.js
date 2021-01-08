const { assert } = require('console');

exports.getIntcodeService = getIntcodeService;

function getIntcodeService()
{
	let knownOperations = getKnownIntcodeOperations();
	return {
		parse: (programString) => programString.trim().split(',').map(v=>Number(v.trim())),
		run: (initialMemory, input = [], logSteps = false) => runIntcodeProgram(knownOperations, initialMemory, input, logSteps)
	};
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
