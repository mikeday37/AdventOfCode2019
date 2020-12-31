/*

--- Day 1: The Tyranny of the Rocket Equation ---

Answers:
    Part 1: 3210097
    Part 2: 4812287
    
*/

let fs = require('fs');
const data = fs.readFileSync('./input.txt', 'utf-8');
const lines = data.split(/\r?\n/);

function getFuel(input){
    return Math.floor(input / 3) - 2;
}

function doPart(part, fuelMethod)
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

doPart(1, getFuel);
doPart(2, getFuel2);
