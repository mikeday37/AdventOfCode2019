/*

--- Day 2: 1202 Program Alarm ---

Answers:
    Part 1: 4462686
    Part 2: 

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

let fs = require('fs');
const data = fs.readFileSync('./input.txt', 'utf-8');
let memory = data.split(/\r?\n/)[0].split(',').map(function(v){return Number(v);});

memory[1] = 12; memory[2] = 2; // hey, the value of reading ALL the instructions :D

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

if (halt == 2)
    console.log('abnormal termination');
else
    console.log('memory[0] = ' + memory[0]);

