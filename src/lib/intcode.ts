export function getIntcodeService() : Intcode.Service {return Intcode.getService();}

export namespace Intcode {

export interface RunResults {
    memory: number[];
    output: number[];
    instructionPointer: number;
    inputPointer: number;
    haltCode: number;
    haltReason: string | null;
}

export interface MachineState {
    ops: Map<number, Operation>;
    memory: number[];
    io: IO;
    instructionPointer: number;
    relativeBase: number;
    haltCode: number;
    haltReason: string | null;
    
    // TODO: this is an akward place to put these constants -- review best js/ts practice and fix
    HALTCODE_NORMAL_TERMINATION: 1;
    HALTCODE_WAITING_FOR_INPUT: -71;

    step: () => void;
    runToHalt: () => void;
}

export interface IO {
    hasInput: () => boolean;
    readInput: () => number;
    writeOutput: (value: number) => void;
}

export interface Service {
    parse: (programString: string) => number[];
    run: (initialMemory: number[], input: number[], logSteps?: boolean) => RunResults;
    init: (initialMemory: number[], io: IO) => MachineState;
}

export interface OperationImplementationApi {
    read: (argument: number) => number;
    write: (argument: number, value: number | undefined) => void;
    ioRead: () => number | undefined;
    ioWrite: (value: number) => void;
    jump: (argument: number) => void;
    addToRelativeBase: (value: number) => void;
    halt: () => void;
}

export type OperationImplementor = (api: OperationImplementationApi) => void;

export interface Operation {
    opcode: number;
    name: string;
    paramCount: number;
    impl: OperationImplementor;
}


export function getService() : Service
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
    let ops: Map<number, Operation> = new Map();

    const operation: (opcode: number, name: string, paramCount: number, impl: OperationImplementor) => void
        = (opcode, name, paramCount, impl) =>
            ops.set(opcode, {opcode, name, paramCount, impl});

    operation( 1,   'add',   3,  c => c.write(3, c.read(1) + c.read(2))           );
    operation( 2,   'mul',   3,  c => c.write(3, c.read(1) * c.read(2))           );

    operation( 3,   'in',    1,  c => c.write(1, c.ioRead())                      );
    operation( 4,   'out',   1,  c => c.ioWrite(c.read(1))                        );

    operation( 5,   'jit',   2,  c => {if (c.read(1) !== 0) c.jump(2);}           );
    operation( 6,   'jif',   2,  c => {if (c.read(1) === 0) c.jump(2);}           );

    operation( 7,   'lt',    3,  c => c.write(3, c.read(1)  <  c.read(2) ? 1 : 0) );
    operation( 8,   'eq',    3,  c => c.write(3, c.read(1) === c.read(2) ? 1 : 0) );

    operation( 9,   'rel',   1,  c => c.addToRelativeBase(c.read(1))             );

    operation( 99,  'halt',  0,  c => c.halt()                                    );

    return ops;
}

function initializeIntcodeMachine(ops: Map<number, Operation>, initialMemory: number[], io: IO)
{
	let state: MachineState = {
		ops,
		memory: [...initialMemory],
		io,
        instructionPointer: 0,
        relativeBase: 0,
		haltCode: 0,
        haltReason: null,
        
        // TODO: this is an akward place to put these constants -- review best js practice and fix
		HALTCODE_NORMAL_TERMINATION: 1,
		HALTCODE_WAITING_FOR_INPUT: -71
	} as MachineState;
    state.step = () => iterateIntecodeMachine(state);
    state.runToHalt = () => {
        while (state.haltCode === 0 || (state.haltCode === state.HALTCODE_WAITING_FOR_INPUT && io.hasInput()))
            state.step();
    }
	return state;
}

function runIntcodeProgram(ops: Map<number, Operation>, initialMemory: number[], input: number[] = [], logSteps = false)
{
	let inputPointer = 0;
	let output: number[] = [];
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

	state.runToHalt();

    return {
        memory: state.memory,
        output,
        instructionPointer: state.instructionPointer,
        inputPointer,
        haltCode: state.haltCode,
        haltReason: state.haltReason
	};
}

function iterateIntecodeMachine(state: MachineState, logSteps = false)
{
	let ops = state.ops;
	let memory = state.memory;
    let instructionPointer = state.instructionPointer;

    const doHalt: (code: number, reason: string) => void
        = (code, reason) => [state.haltCode, state.haltReason] = [code, reason];

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

        const op = ops.get(opcode) as Operation;

        if (instructionPointer + op.paramCount >= memory.length)
        {
            doHalt(-4, `instruction ${op.name} requires ${op.paramCount} parameters, requiring memory read out of range.`);
            return;
        }

        const modeString = String(Number(opcodeValue) + 10 ** (2 + op.paramCount)).slice(1, op.paramCount + 1);
        const parameterModes = [...modeString].reverse().map(x => Number(x));
        const parameterValues = memory.slice(instructionPointer + 1, instructionPointer + 1 + op.paramCount);

        function resolveMemoryAccess(address: number, actionOnAddress: (addres: number) => number)
        {
            if (address < 0)
                throw Error(`address negative: ${address}`);
            
            if (address >= memory.length)
            {
                const sanityAddressLimit = 100_000_000; // 100 mB
                if (address > sanityAddressLimit)
                    throw Error(`attempted to access memory at ${address} which is beyond sanity limit ${sanityAddressLimit}`);
                const oldLength = memory.length;
                memory.length = address + 1;
                memory.fill(0, oldLength, memory.length);
            }

            return actionOnAddress(address);
        }
        function paramRead(a: number)
        {
            const mode = parameterModes[a - 1];
            switch (mode) 
            {
                case 0: return resolveMemoryAccess(parameterValues[a - 1],                      ea => memory[ea]);
                case 1: return parameterValues[a - 1];
                case 2: return resolveMemoryAccess(parameterValues[a - 1] + state.relativeBase, ea => memory[ea]);
                default: throw Error(`bad parameter mode ${mode} during read`);
            }
        }
        function paramWrite(a: number, v: number)
        {
            const mode = parameterModes[a - 1];
            switch (mode) 
            {
                case 0: resolveMemoryAccess(parameterValues[a - 1],                      ea => memory[ea] = v); break;
                case 2: resolveMemoryAccess(parameterValues[a - 1] + state.relativeBase, ea => memory[ea] = v); break;
                default: throw Error(`bad parameter mode ${mode} during write`);
            }
        }
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
            write: (a, v) => {if (v !== undefined) paramWrite(a, v)},
            ioRead: () => {
				if (state.io.hasInput())
					return state.io.readInput();
				else
					doHalt(state.HALTCODE_WAITING_FOR_INPUT, 'waiting for input');
			},
            ioWrite: v => state.io.writeOutput(v),
            jump: a => nextInstructionPointer = paramRead(a),
            addToRelativeBase: v => state.relativeBase += v,
            halt: () => doHalt(state.HALTCODE_NORMAL_TERMINATION, 'normal termination')
        });

        if (nextInstructionPointer !== null)
            instructionPointer = nextInstructionPointer;
        else if (state.haltCode === 0)
            instructionPointer += 1 + op.paramCount;
	}
}

}
