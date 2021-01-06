/*

--- Day 6: Universal Orbit Map ---

Answers:
    Part 1: 308790
    Part 2: 472

*/

const { assert } = require('console');
const { readFileSync } = require('fs');

(function(){
    checkExamples();

    const tree = parseOrbits(readFileSync('./input.txt', 'utf-8'));
    console.log(`Part 1: ${getTotalOrbits(tree)}`);
    console.log(`Part 2: ${getTransferCount(tree)}`);
})();

function parseOrbits(input)
{
    const lines = input.trim().split(/\r?\n/).map(x => x.trim());
    const tree = new Map(); // orbiter -> what it orbits | equivalently: represents A)B as B -> A
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
    tree.forEach(b => total += 1 + getPathToCenter(b, tree).length); // A)B as B -> A
    return total;
}

function getPathToCenter(start, tree)
{
    let path = [];
    let current = start;
    while (tree.has(current)) // A)B as B -> A
    {
        current = tree.get(current);
        path.push(current);
    }
    assert(current === 'COM', `unexpected center of mass: ${current}`);
    return path;
}

function getTransferCount(tree, x = 'YOU', y = 'SAN')
{
    const [xPath, yPath] = [x,y].map(v => getPathToCenter(v, tree).reverse());
    
    let i = 0;
    while (xPath[i] === yPath[i])
        i++;

    return xPath.length + yPath.length - i - i;
}

function checkExamples()
{
    let allPass = true;
    let checkCount = 0;

    function check(expected, checkMethod, input)
    {
        ++checkCount;
        const tree = parseOrbits(input);
        const result = checkMethod(tree);
        const pass = result === expected;
        assert(pass, `check # ${checkCount} failed:  expected = ${expected}, returned = ${result}`);
        if (!pass) allPass = false;
    }

    function check1(expected, input) {check(expected, getTotalOrbits, input);}
    function check2(expected, input) {check(expected, getTransferCount, input);}

    doChecks();

    if (allPass)
        console.log(`--- All ${checkCount} Checks PASSED ---`);
    else
        console.log('--- !! At least one check FAILED !! ---');

    function doChecks()
    {
        check1(3, `
            COM)A
            A)B
        `);
        check1(6, `
            COM)A
            A)B
            B)C
        `);
        check1(5, `
            COM)A
            A)B
            A)C
        `);
        // this time official examples are below, manual above
        check1(42, `
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
        check2(4, `
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
            K)YOU
            I)SAN
        `)
    }
}