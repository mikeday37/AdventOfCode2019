/*

--- Day 3: Crossed Wires ---

Answers:
    Part 1: 227
    Part 2: 20286

*/

const { assert } = require('console');
const { readFileSync } = require('fs');

(function(){
    const fullRawInput = readFileSync('./input.txt', 'utf-8');
    const fullInput = parse(fullRawInput);
    const examples = [{
            rawInput: 'R8,U5,L5,D3\nU7,R6,D4,L4',
            part1answer: 6,
            part2answer: 30
        },{
            rawInput: 'R75,D30,R83,U83,L12,D49,R71,U7,L72\nU62,R66,U55,R34,D71,R55,D58,R83',
            part1answer: 159,
            part2answer: 610
        },{
            rawInput: 'R98,U47,R26,D63,R33,U87,L62,D20,R33,U53,R51\nU98,R91,D20,R16,D67,R40,U7,R15,U6,R7',
            part1answer: 135,
            part2answer: 410
    }]
    
    testExamples(examples);
    const info = getIntersectionMinimums(fullInput);
    console.log('Part 1: ' + info.minDist);
    console.log('Part 2: ' + info.minSignalDelay);
})();

function parse(input)
{
    return input.trimEnd().split(/\r?\n/)
        .map(line => line.trimEnd().split(',')
            .map(entry => ({
                dir: entry[0],
                n: Number(entry.slice(1))
            }))
        );
}

function testExamples(examples)
{
    let anyFailed = false;
    for (let i = 0; i < examples.length; i++)
    {
        let e = examples[i];
        let info = getIntersectionMinimums(parse(e.rawInput));
        let part1result = info.minDist;
        let part2result = info.minSignalDelay;
        let part1good = part1result === e.part1answer;
        let part2good = part2result === e.part2answer;
        let bothGood = part1good && part2good;
        assert(part1good, `example index ${i} mismatch on part 1`); // asserting to highlight problems
        assert(part2good, `example index ${i} mismatch on part 2`);
        if (bothGood)
            console.log(`example index ${i} PASSED`);
        else
        {
            if (!part1good)
                console.log(`example index ${i} FAILED on part 1 -- result = ${part1result}, expected = ${e.part1answer}`); // logging for details
            if (!part2good)
                console.log(`example index ${i} FAILED on part 2 -- result = ${part2result}, expected = ${e.part2answer}`);
            anyFailed = true;
        }
    }
    if (anyFailed)
        console.log('--- !!! TEST(s) FAILED !!! ---');
    else
        console.log('--- All Tests PASSED ---');
}

function getIntersectionMinimums(input)
{
    let wireCoordinates = input.map(directions => toCoordinates(directions));
    let intersections = findIntersections(wireCoordinates[0], wireCoordinates[1]);

    let minDist = Math.min(...intersections.map(i => Math.abs(i.x) + Math.abs(i.y)));
    let minSignalDelay = Math.min(...intersections.map(i => i.steps));
    
    return {minDist, minSignalDelay};
}

function toCoordinates(directions)
{
    let x = 0, y = 0, o = null;
    let coordinates = [{x, y, o}];
    for (let direction of directions)
    {
        switch (direction.dir) {
            case 'U': y -= direction.n; o = 'v'; break;
            case 'D': y += direction.n; o = 'v'; break;
            case 'L': x -= direction.n; o = 'h'; break;
            case 'R': x += direction.n; o = 'h'; break;
        }
        coordinates.push({x, y, o});
    }
    return coordinates;
}

function getStepsTo(px, py, a)
{
    return a.o === 'h' ? Math.abs(a.x - px) : Math.abs(a.y - py);
}

function findIntersections(aCoords, bCoords)
{
    // we'll be pushing onto an array to return all intersections found
    let intersections = [];

    // loop through all a coords
    let a = aCoords[0];
    let apx = a.x, apy = a.y; // prev a coords
    let aSteps = 0;
    for (let aIndex = 1; aIndex < aCoords.length; ++aIndex, apx = a.x, apy = a.y)
    {
        a = aCoords[aIndex];
        aSteps += getStepsTo(apx, apy, a);

        // loop through all b coords
        let b = bCoords[0];
        let bpx = b.x, bpy = b.y; // prev b coords
        let bSteps = 0;
        for (let bIndex = 1; bIndex < bCoords.length; ++bIndex, bpx = b.x, bpy = b.y)
        {
            b = bCoords[bIndex];
            bSteps += getStepsTo(bpx, bpy, b);

            // omit intersection with the first line segment from both wires
            if (aIndex === 1 && bIndex === 1) continue;

            // get intersection, or continue if none
            let i = getIntersection(apx, apy, a, bpx, bpy, b);
            if (i === null) continue;

            // determine the signal length to the intersection
            i.steps = aSteps + bSteps - getStepsTo(i.x, i.y, a) - getStepsTo(i.x, i.y, b);

            // push intersection to return it with the rest
            intersections.push(i);
       }
    }

    return intersections;
}

function getIntersection(apx, apy, a, bpx, bpy, b)
{
    // if they have the same orientation...
    if (a.o === b.o)
    {
        // then I assume Eric did not have us handle any overlapping segments of same orientation,
        // otherwise the number of cases to handle is much higher, including infinite intersections
        // for same-oriented segments that overlap at more than just an end point.
        //
        // so let's assume they don't overlap, check that assumption, and throw if wrong.
        // if right, we can safely ignore the pair as non-intersecting.
        if (a.o === 'h')
        {
            if (a.y !== b.y) return null; // can't overlap if horizontal at different y coords
            if (Math.max(apx, a.x) < Math.min(bpx, b.x)) return null; // a is entirely left of b
            if (Math.max(bpx, b.x) < Math.min(apx, a.x)) return null; // b is entirely left of a
            throw new Error("unhandled case - a and b are both horizontal and intersect");
        }
        else
        {
            if (a.x !== b.x) return null; // can't overlap if vertical at different x coords
            if (Math.max(apy, a.y) < Math.min(bpy, b.y)) return null; // a is entirely above of b
            if (Math.max(bpy, b.y) < Math.min(apy, a.y)) return null; // b is entirely above of a
            throw new Error("unhandled case - a and b are both vertical and intersect");
        }
    }

    // otherwise...
    // neither the existence nor location of any intersection depends on whether a and b are swapped,
    // so we're going to use h and v instead, where [h,v] are [a,b] sorted by horizontal first,
    // so we only have to handle one case
    let w = [{px: apx, py: apy, x: a.x, y: a.y},
                {px: bpx, py: bpy, x: b.x, y: b.y}];
    let h = a.o === 'h' ? w[0] : w[1];
    let v = a.o === 'h' ? w[1] : w[0];
    assert(h.py == h.y, 'horizontal y mismatch');
    assert(v.px == v.x, 'vertical x mismatch');

    // so h is the horizontal segment, and v is vertical, now sort them so 1 < 2
    let h1 = h.px, h2 = h.x;
    if (h1 > h2) [h1, h2] = [h2, h1];
    let v1 = v.py, v2 = v.y;
    if (v1 > v2) [v1, v2] = [v2, v1];
    
    // we can now do 4 easy tests to throw out all non-intersections
    if (v.x < h1 ||
        v.x > h2 ||
        h.y < v1 ||
        h.y > v2) return null;

    // for what's left, the intersection is simply vertical's x and horizontal's y
    return {x: v.x, y: h.y};
}
