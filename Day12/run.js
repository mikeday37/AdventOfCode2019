'use strict';
const { assert } = require('console');
const { readFileSync } = require('fs');

const manager = require('../dayManager.js');

(function(){
    manager.dayAsync(12, 'The N-Body Problem',
    [
        6678,
        496734501382552
    ],
    async (api) =>
    {
        const input = api.time('read and parse', ()=>parsePositions(readFileSync('./input.txt', 'utf-8')));

        api.time('check examples', () => checkExamples());

        api.doPart(1, () => simulateSystem(input, 1000).getTotalEngery());

        api.doPart(2, () => getSystemPeriod(input));
    });
})();

function parsePositions(rawInput)
{
    return rawInput
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(x => x.length > 0)
        .map(line => {
            const [x,y,z] = line
                .slice(1,-1)
                .split(', ')
                .map(x => Number(x.slice(2)));
            return {x,y,z};
        });
}

function simulateSystem(initialPositions, steps, initialState = null)
{
    // use provided state, or init from input
    let state = initialState ?? 
    {
        bodies: initialPositions.map(pos => ({
                initialPos: {x: pos.x, y: pos.y, z: pos.z},
                pos: {x: pos.x, y: pos.y, z: pos.z},
                vel: {x: 0, y: 0, z: 0},
            })),

        steps: 0,

        loopSize: {x: null, y: null, z: null},

        // helpful toString function for logging and testing
        toString: () => {
            const vec2string = v => [...'xyz'].map(o => `${o}=${String(v[o]).padStart(3, ' ')}`).join(', ');
            return state.bodies.map(body => `pos=<${vec2string(body.pos)}>, vel=<${vec2string(body.vel)}>`).join('\n');
        },

        getTotalEngery: () => {
            const xyz = [...'xyz'];
            return state.bodies
                .map(body => 
                    xyz.reduce((a,v) => a + Math.abs(body.pos[v]), 0) // potential
                        *
                    xyz.reduce((a,v) => a + Math.abs(body.vel[v]), 0) // kinetic
                )
                .reduce((a,v) => a + v); // total
        }
    };

    // iterate for requested number of steps, or until all loops are detected
    let allLoopsDetected = false;
    for (let n = 1; steps !== null ? n <= steps : !allLoopsDetected; n++, state.steps++)
    {
        // gravity - loop through each distinct pair of bodies
        for (let aIndex = 0; aIndex < state.bodies.length; aIndex++)
            for (let bIndex = aIndex + 1; bIndex < state.bodies.length; bIndex++)
            {
                const a = state.bodies[aIndex], b = state.bodies[bIndex];
                
                // adjust each velocity component by one step to tend to bring closer together
                [...'xyz'].forEach(o =>
                {
                    if (a.pos[o] < b.pos[o])
                        {a.vel[o]++; b.vel[o]--;}
                    else if (a.pos[o] > b.pos[o])
                        {a.vel[o]--; b.vel[o]++;}
                });
            }

        // velocity - loop through each body and add velocity to position
        let allReturned = {x: true, y: true, z: true};
        for (let i = 0; i < state.bodies.length; i++)
            [...'xyz'].forEach(o => {
                state.bodies[i].pos[o] += state.bodies[i].vel[o]

                // set all bodies returned flag for this vector component if checking for that, not already set, and vel = 0 at initial position
                if (steps === null && allReturned[o] && !(state.bodies[i].vel[o] === 0 && state.bodies[i].pos[o] === state.bodies[i].initialPos[o]))
                    allReturned[o] = false;
            });

        // if check for loops
        if (steps === null)
        {
            // check each vector component and set all detected false if any component doesn't have loopsize detected
            allLoopsDetected = true;
            [...'xyz'].forEach(o => {
                if (allReturned[o] && state.loopSize[o] === null)
                    state.loopSize[o] = state.steps + 1; // +1 necessary because state.steps is not increased until end of loop body
                if (state.loopSize[o] === null)
                    allLoopsDetected = false;
            });
        }
    }

    return state;
}

function getSystemPeriod(initialPositions)
{
    const loopDetectedState = simulateSystem(initialPositions, null);
    const periods = [...'xyz'].map(o => loopDetectedState.loopSize[o]);
    function gcd(a, b) {return !b ? a : gcd(b, a % b);}
    function lcm(a, b) {return a * (b / gcd(a, b));}
    const period = periods.reduce((a,b) => lcm(a,b));
    return period;
}

function checkExamples()
{
    function doChecks(stepsPerResult, expectedFinalTotalEnergy, expectedPeriod, rawInput, expectedResults)
    {
        const exampleInput = parsePositions(rawInput);
        let state = simulateSystem(exampleInput, 0);
        
        let first = true;
        for (let expectedResult of expectedResults)
        {
            if (!first)
                state = simulateSystem(null, stepsPerResult, state);
            first = false;
    
            let a = state.toString().trim();
            let b = expectedResult.split(/\r?\n/).map(x => x.trim()).filter(x => x.length > 0).join('\n').trim();
            assert(a === b, `simulation mismatch at step ${state.steps}`);
        }

        const totalEnergy = state.getTotalEngery();
        assert(totalEnergy === expectedFinalTotalEnergy, `final energy mismatch: expected = ${expectedFinalTotalEnergy}, actual = ${totalEnergy}`);

        const period = getSystemPeriod(exampleInput);
        assert(period === expectedPeriod, `system period mismatch: expected = ${expectedPeriod}, actual = ${period}`);
    }

    doChecks(1, 179, 2772, `
        <x=-1, y=0, z=2>
        <x=2, y=-10, z=-7>
        <x=4, y=-8, z=8>
        <x=3, y=5, z=-1>
    `,[`
        pos=<x= -1, y=  0, z=  2>, vel=<x=  0, y=  0, z=  0>
        pos=<x=  2, y=-10, z= -7>, vel=<x=  0, y=  0, z=  0>
        pos=<x=  4, y= -8, z=  8>, vel=<x=  0, y=  0, z=  0>
        pos=<x=  3, y=  5, z= -1>, vel=<x=  0, y=  0, z=  0>
        `,`
        pos=<x=  2, y= -1, z=  1>, vel=<x=  3, y= -1, z= -1>
        pos=<x=  3, y= -7, z= -4>, vel=<x=  1, y=  3, z=  3>
        pos=<x=  1, y= -7, z=  5>, vel=<x= -3, y=  1, z= -3>
        pos=<x=  2, y=  2, z=  0>, vel=<x= -1, y= -3, z=  1>        
        `,`
        pos=<x=  5, y= -3, z= -1>, vel=<x=  3, y= -2, z= -2>
        pos=<x=  1, y= -2, z=  2>, vel=<x= -2, y=  5, z=  6>
        pos=<x=  1, y= -4, z= -1>, vel=<x=  0, y=  3, z= -6>
        pos=<x=  1, y= -4, z=  2>, vel=<x= -1, y= -6, z=  2>
        `,` 
        pos=<x=  5, y= -6, z= -1>, vel=<x=  0, y= -3, z=  0>
        pos=<x=  0, y=  0, z=  6>, vel=<x= -1, y=  2, z=  4>
        pos=<x=  2, y=  1, z= -5>, vel=<x=  1, y=  5, z= -4>
        pos=<x=  1, y= -8, z=  2>, vel=<x=  0, y= -4, z=  0>
        `,` 
        pos=<x=  2, y= -8, z=  0>, vel=<x= -3, y= -2, z=  1>
        pos=<x=  2, y=  1, z=  7>, vel=<x=  2, y=  1, z=  1>
        pos=<x=  2, y=  3, z= -6>, vel=<x=  0, y=  2, z= -1>
        pos=<x=  2, y= -9, z=  1>, vel=<x=  1, y= -1, z= -1>
        `,` 
        pos=<x= -1, y= -9, z=  2>, vel=<x= -3, y= -1, z=  2>
        pos=<x=  4, y=  1, z=  5>, vel=<x=  2, y=  0, z= -2>
        pos=<x=  2, y=  2, z= -4>, vel=<x=  0, y= -1, z=  2>
        pos=<x=  3, y= -7, z= -1>, vel=<x=  1, y=  2, z= -2>
        `,` 
        pos=<x= -1, y= -7, z=  3>, vel=<x=  0, y=  2, z=  1>
        pos=<x=  3, y=  0, z=  0>, vel=<x= -1, y= -1, z= -5>
        pos=<x=  3, y= -2, z=  1>, vel=<x=  1, y= -4, z=  5>
        pos=<x=  3, y= -4, z= -2>, vel=<x=  0, y=  3, z= -1>
        `,` 
        pos=<x=  2, y= -2, z=  1>, vel=<x=  3, y=  5, z= -2>
        pos=<x=  1, y= -4, z= -4>, vel=<x= -2, y= -4, z= -4>
        pos=<x=  3, y= -7, z=  5>, vel=<x=  0, y= -5, z=  4>
        pos=<x=  2, y=  0, z=  0>, vel=<x= -1, y=  4, z=  2>
        `,` 
        pos=<x=  5, y=  2, z= -2>, vel=<x=  3, y=  4, z= -3>
        pos=<x=  2, y= -7, z= -5>, vel=<x=  1, y= -3, z= -1>
        pos=<x=  0, y= -9, z=  6>, vel=<x= -3, y= -2, z=  1>
        pos=<x=  1, y=  1, z=  3>, vel=<x= -1, y=  1, z=  3>
        `,` 
        pos=<x=  5, y=  3, z= -4>, vel=<x=  0, y=  1, z= -2>
        pos=<x=  2, y= -9, z= -3>, vel=<x=  0, y= -2, z=  2>
        pos=<x=  0, y= -8, z=  4>, vel=<x=  0, y=  1, z= -2>
        pos=<x=  1, y=  1, z=  5>, vel=<x=  0, y=  0, z=  2>
        `,` 
        pos=<x=  2, y=  1, z= -3>, vel=<x= -3, y= -2, z=  1>
        pos=<x=  1, y= -8, z=  0>, vel=<x= -1, y=  1, z=  3>
        pos=<x=  3, y= -6, z=  1>, vel=<x=  3, y=  2, z= -3>
        pos=<x=  2, y=  0, z=  4>, vel=<x=  1, y= -1, z= -1>
    `]);

    doChecks(10, 1940, 4686774924, `
        <x=-8, y=-10, z=0>
        <x=5, y=5, z=10>
        <x=2, y=-7, z=3>
        <x=9, y=-8, z=-3>
    `,[`
        pos=<x= -8, y=-10, z=  0>, vel=<x=  0, y=  0, z=  0>
        pos=<x=  5, y=  5, z= 10>, vel=<x=  0, y=  0, z=  0>
        pos=<x=  2, y= -7, z=  3>, vel=<x=  0, y=  0, z=  0>
        pos=<x=  9, y= -8, z= -3>, vel=<x=  0, y=  0, z=  0>
        `,`
        pos=<x= -9, y=-10, z=  1>, vel=<x= -2, y= -2, z= -1>
        pos=<x=  4, y= 10, z=  9>, vel=<x= -3, y=  7, z= -2>
        pos=<x=  8, y=-10, z= -3>, vel=<x=  5, y= -1, z= -2>
        pos=<x=  5, y=-10, z=  3>, vel=<x=  0, y= -4, z=  5>
        `,`
        pos=<x=-10, y=  3, z= -4>, vel=<x= -5, y=  2, z=  0>
        pos=<x=  5, y=-25, z=  6>, vel=<x=  1, y=  1, z= -4>
        pos=<x= 13, y=  1, z=  1>, vel=<x=  5, y= -2, z=  2>
        pos=<x=  0, y=  1, z=  7>, vel=<x= -1, y= -1, z=  2>
        `,`
        pos=<x= 15, y= -6, z= -9>, vel=<x= -5, y=  4, z=  0>
        pos=<x= -4, y=-11, z=  3>, vel=<x= -3, y=-10, z=  0>
        pos=<x=  0, y= -1, z= 11>, vel=<x=  7, y=  4, z=  3>
        pos=<x= -3, y= -2, z=  5>, vel=<x=  1, y=  2, z= -3>
        `,`
        pos=<x= 14, y=-12, z= -4>, vel=<x= 11, y=  3, z=  0>
        pos=<x= -1, y= 18, z=  8>, vel=<x= -5, y=  2, z=  3>
        pos=<x= -5, y=-14, z=  8>, vel=<x=  1, y= -2, z=  0>
        pos=<x=  0, y=-12, z= -2>, vel=<x= -7, y= -3, z= -3>
        `,`
        pos=<x=-23, y=  4, z=  1>, vel=<x= -7, y= -1, z=  2>
        pos=<x= 20, y=-31, z= 13>, vel=<x=  5, y=  3, z=  4>
        pos=<x= -4, y=  6, z=  1>, vel=<x= -1, y=  1, z= -3>
        pos=<x= 15, y=  1, z= -5>, vel=<x=  3, y= -3, z= -3>
        `,`
        pos=<x= 36, y=-10, z=  6>, vel=<x=  5, y=  0, z=  3>
        pos=<x=-18, y= 10, z=  9>, vel=<x= -3, y= -7, z=  5>
        pos=<x=  8, y=-12, z= -3>, vel=<x= -2, y=  1, z= -7>
        pos=<x=-18, y= -8, z= -2>, vel=<x=  0, y=  6, z= -1>
        `,`
        pos=<x=-33, y= -6, z=  5>, vel=<x= -5, y= -4, z=  7>
        pos=<x= 13, y= -9, z=  2>, vel=<x= -2, y= 11, z=  3>
        pos=<x= 11, y= -8, z=  2>, vel=<x=  8, y= -6, z= -7>
        pos=<x= 17, y=  3, z=  1>, vel=<x= -1, y= -1, z= -3>
        `,`
        pos=<x= 30, y= -8, z=  3>, vel=<x=  3, y=  3, z=  0>
        pos=<x= -2, y= -4, z=  0>, vel=<x=  4, y=-13, z=  2>
        pos=<x=-18, y= -7, z= 15>, vel=<x= -8, y=  2, z= -2>
        pos=<x= -2, y= -1, z= -8>, vel=<x=  1, y=  8, z=  0>
        `,`
        pos=<x=-25, y= -1, z=  4>, vel=<x=  1, y= -3, z=  4>
        pos=<x=  2, y= -9, z=  0>, vel=<x= -3, y= 13, z= -1>
        pos=<x= 32, y= -8, z= 14>, vel=<x=  5, y= -4, z=  6>
        pos=<x= -1, y= -2, z= -8>, vel=<x= -3, y= -6, z= -9>
        `,`
        pos=<x=  8, y=-12, z= -9>, vel=<x= -7, y=  3, z=  0>
        pos=<x= 13, y= 16, z= -3>, vel=<x=  3, y=-11, z= -5>
        pos=<x=-29, y=-11, z= -1>, vel=<x= -3, y=  7, z=  4>
        pos=<x= 16, y=-13, z= 23>, vel=<x=  7, y=  1, z=  1>        
    `]);
}