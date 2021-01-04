/*

--- Day 2: 1202 Program Alarm ---

Answers:
    Part 1: 4462686
    Part 2: 5936

=================================

instruction:
    op,from1,from2,dest

opcodes:
    1    = [dest] = [from1] + [from2]
    2    = [dest] = [from1] * [from2]
    99   = normal termination
    else = abnormal termination

code and data share the same memory

*/

const { readFileSync } = require('fs');

(function(){
    const data = readFileSync('./input.txt', 'utf-8');
    const originalMemory = data.split(/\r?\n/)[0].split(',').map(v=>Number(v));

    console.log('Part 1: ' + intcode(originalMemory, 12, 2));
    console.log('Part 2: ' + findNounVerb(originalMemory, 19690720));
})();

function intcode(inputMemory, noun, verb)
{
    let memory = [...inputMemory];

    memory[1] = noun; memory[2] = verb;

    let ip = 0;
    let halt = 0;
    while (halt === 0)
        switch (memory[ip])
        {
            case  1: memory[memory[ip + 3]] = memory[memory[ip + 1]] + memory[memory[ip + 2]]; ip += 4; break;
            case  2: memory[memory[ip + 3]] = memory[memory[ip + 1]] * memory[memory[ip + 2]]; ip += 4; break;
            case 99: halt = 1; break;
            default: halt = 2; break;
        }

    return memory[0];
}

function findNounVerb(inputMemory, targetOutput)
{
    for (let noun = 0; noun <= 99; noun++)
        for (let verb = 0; verb <= 99; verb++)
            if (targetOutput === intcode(inputMemory, noun, verb))
                return 100 * noun + verb;
}
