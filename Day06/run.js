/*

--- Day 6: Universal Orbit Map ---

Answers:
    Part 1: 
    Part 2: 

*/

const { assert } = require('console');
const { readFileSync } = require('fs');

(function(){
    checkExamples();

    const tree = parseOrbits(readFileSync('./input.txt', 'utf-8'));
    doPart1(tree);
    doPart2(tree);
})();

function doPart1(tree)
{
    const totalOrbits = getTotalOrbits(tree);
    console.log(`Part 1: ${totalOrbits}`);
}

function doPart2(tree)
{
    //todo
}

function parseOrbits(input)
{
    const lines = input.trim().split(/\r?\n/).map(x => x.trim());
    const tree = new Map(); // orbiter -> what it orbits | equivalently:  represents A)B as B -> A
    for (let l of lines)
    {
        const a = l.split(')');
        tree.set(a[1], a[0]);
    }
    return tree;
}

function getTotalOrbits(tree)
{
    let total = 0;
    tree.forEach((b, a, m) => { // A)B
        let current = a;
        while (m.has(current))
        {
            total++;
            current = m.get(current);
        };
        assert(current === 'COM', `unexpected center of mass: ${current}`);
    });
    return total;
}

function checkExamples()
{
    let allPass = true;
    let checkCount = 0;

    function check(expectedTotalOrbits, input)
    {
        ++checkCount;
        const tree = parseOrbits(input);
        const totalOrbits = getTotalOrbits(tree);
        const pass = totalOrbits === expectedTotalOrbits;
        assert(pass, `check # ${checkCount} failed:  expected = ${expectedTotalOrbits}, returned = ${totalOrbits}`);
        if (!pass) allPass = false;
    }

    doChecks();

    if (allPass)
        console.log(`--- All ${checkCount} Checks PASSED ---`);
    else
        console.log('--- !! At least one check FAILED !! ---');

    function doChecks()
    {
        check(3, `
            COM)A
            A)B
        `);
        check(6, `
            COM)A
            A)B
            B)C
        `);
        check(5, `
            COM)A
            A)B
            A)C
        `);
        // this time official examples are below, manual above
        check(42, `
            COM)B
            B)C
            C)D
            D)E
            E)F
            B)G
            G)H
            D)I
            E)J
            J)K
            K)L
        `);
    }
}