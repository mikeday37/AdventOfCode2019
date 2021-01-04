/*

--- Day 1: The Tyranny of the Rocket Equation ---

Answers:
    Part 1: 3210097
    Part 2: 4812287
    
*/

const { readFileSync } = require('fs');

(function(){
    const data = readFileSync('./input.txt', 'utf-8');
    const lines = data.split(/\r?\n/);

    doPart(lines, 1, getFuel);
    doPart(lines, 2, getFuel2);
})();

function getFuel(input){
    return Math.floor(input / 3) - 2;
}

function doPart(lines, part, fuelMethod)
{
    let sum = 0;
    lines.forEach((line)=>{
        if (line.trim().length > 0)
            sum += fuelMethod(line);
    });
    console.log('Part ' + part + ': ' + sum);
}

function getFuel2(input){
    let totalFuel = 0;
    let toAdd = getFuel(input);
    while (toAdd > 0)
    {
        totalFuel += toAdd;
        toAdd = getFuel(toAdd);
    }
    return totalFuel;
}
