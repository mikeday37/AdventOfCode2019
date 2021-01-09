'use strict';
const { readFileSync } = require('fs');
const common = require('../common.js');

(function(){
    common.day(1, 'The Tyranny of the Rocket Equation',
        3210097,
        4812287
    );

    const data = readFileSync('./input.txt', 'utf-8');
    const lines = data.split(/\r?\n/);

    common.benchmark((time, doPart) =>
    {
        doPart(1, ()=>getPart(lines, getFuel));
        doPart(2, ()=>getPart(lines, getFuel2));
    })
})();

function getFuel(input){
    return Math.floor(input / 3) - 2;
}

function getPart(lines, fuelMethod)
{
    let sum = 0;
    lines.forEach(line => {
        if (line.trim().length > 0)
            sum += fuelMethod(line);
    });
    return sum;
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
