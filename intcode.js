const { assert } = require('console');

exports.getIntcodeService = getIntcodeService;

function getIntcodeService()
{
	let knownOperations = getKnownIntcodeOperations();
	return {
		parse: (programString) => programString.trim().split(',').map(v=>Number(v.trim())),
		run: (initialMemory, input = [], logSteps = false) => runIntcodeProgram(knownOperations, initialMemory, input, logSteps),
		init: (initialMemory, io) => initializeIntcodeMachine(knownOperations, initialMemory, io)
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

function initializeIntcodeMachine(ops, initialMemory, io)
{
	let state = {
		ops,
		memory: [...initialMemory],
		io: { // we're doing this instead of just "io," to force the structure
			hasInput: io.hasInput,
			readInput: io.readInput,
			writeOutput: io.writeOutput
		},
		instructionPointer: 0,
		haltCode: 0,
		haltReason: null,
		HALTCODE_NORMAL_TERMINATION: 1,
		HALTCODE_WAITING_FOR_INPUT: -71
	};
	state.step = () => iterateIntecodeMachine(state);
	return state;
}

function runIntcodeProgram(ops, initialMemory, input = [], logSteps = false)
{
	let inputPointer = 0;
	let output = [];
	let state = initializeIntcodeMachine(ops, initialMemory, {
		hasInput: () => true,
		readInput: () => {
			if (inputPointer >= input.length)
				throw Error(`static input length exceeded at inputPointer = ${inputPointer}`);
			else
				return input[inputPointer++];
		},
		writeOutput: v => output.push(v)
	});

	while (!state.haltCode)
		state.step();

    return {
        memory: state.memory,
        output,
        instructionPointer: state.instructionPointer,
        inputPointer,
        haltCode: state.haltCode,
        haltReason: state.haltReason
	};
}

function iterateIntecodeMachine(state, logSteps = false)
{
	let ops = state.ops;
	let memory = state.memory;
    let instructionPointer = state.instructionPointer;

	const doHalt = (code, reason) => [state.haltCode, state.haltReason] = [code, reason];

	// TODO: add check, only allow stepping if haltCode is zero or awaiting input

	try {
		inner();
	} catch (error) {
		doHalt(-99, `exception, message = ${error.message}`);
	}

	state.instructionPointer = instructionPointer;

	function inner()
    {
        if (instructionPointer < 0)
        {
            doHalt(-1, `instruction pointer too low: ${instructionPointer}`);
            return;
        }
        if (instructionPointer >= memory.length)
        {
            doHalt(-2, `instruction pointer too high: ${instructionPointer}`);
            return;
        }

        const opcodeValue = memory[instructionPointer];
        const opcode = Number(String(opcodeValue).slice(-2));

        if (!ops.has(opcode))
        {
            doHalt(-3, `unknown opcode: ${opcode}`);
            return;
        }

        const op = ops.get(opcode);

        if (instructionPointer + op.paramCount >= memory.length)
        {
            doHalt(-4, `instruction ${op.name} requires ${op.paramCount} parameters, requiring memory read out of range.`);
            return;
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

		state.haltCode = 0;
		state.haltReason = null;
		
        op.impl({
            read: a => paramRead(a),
            write: (a, v) => paramWrite(a, v),
            ioRead: () => {
				if (state.io.hasInput())
					return state.io.readInput();
				else
					doHalt(state.HALTCODE_WAITING_FOR_INPUT, 'waiting for input');
			},
            ioWrite: v => state.io.writeOutput(v),
            jump: a => nextInstructionPointer = paramRead(a),
            halt: () => doHalt(state.HALTCODE_NORMAL_TERMINATION, 'normal termination')
        });

        if (nextInstructionPointer !== null)
            instructionPointer = nextInstructionPointer;
        else if (state.haltCode === 0)
            instructionPointer += 1 + op.paramCount;
	}
}
