/*

--- Day 3: Crossed Wires ---

Answers:
    Part 1: 227
    Part 2: 

*/

const { assert } = require('console');
const { readFileSync } = require('fs');
let fullRawInput = readFileSync('./input.txt', 'utf-8');
let fullInput = parse(fullRawInput);
let examples = [{
        rawInput: 'R8,U5,L5,D3\nU7,R6,D4,L4',
        answer: 6
    },{
        rawInput: 'R75,D30,R83,U83,L12,D49,R71,U7,L72\nU62,R66,U55,R34,D71,R55,D58,R83',
        answer: 159
    },{
        rawInput: 'R98,U47,R26,D63,R33,U87,L62,D20,R33,U53,R51\nU98,R91,D20,R16,D67,R40,U7,R15,U6,R7',
        answer: 135
    },{
        rawInput: 'R1,U2,R2\nU1,R2,U2',
        answer: 2
    },{
        rawInput: 'R2\nL1,U1,R2,D1',
        answer: 1
}]

function parse(input)
{
    return input.trimEnd().split(/\r?\n/)
        .map(line => line.trimEnd().split(',')
            .map(entry => {return{
                dir: entry[0],
                n: Number(entry.slice(1))
            }})
        );
}

function testExamples(){
    let anyFailed = false;
    for (let i = 0; i < examples.length; i++) {
        let e = examples[i];
        let result = getManhattanDistanceOfClosestWireCrossing(parse(e.rawInput));
        assert(result === e.answer, `example index ${i} mismatch`);
        if (result === e.answer)
            console.log(`example index ${i} PASSED`);
        else {
            console.log(`example index ${i} FAILED -- result = ${result}, expected = ${e.answer}`);
            anyFailed = true;
        }
    }
    if (anyFailed)
        console.log('--- TEST(s) FAILED ---');
    else
        console.log('--- ALL TESTS PASSED ---');
}

testExamples();
console.log('Part 1: ' + getManhattanDistanceOfClosestWireCrossing(fullInput));


function getManhattanDistanceOfClosestWireCrossing(input)
{
    let wireCoordinates = input.map(directions => toCoordinates(directions));
    let intersections = findIntersections(wireCoordinates[0], wireCoordinates[1]);
    let mindist = null;
    for (let i of intersections)
    {
        let dist = Math.abs(i.x) + Math.abs(i.y);
        //console.log(`\tmd(${i.x},${i.y}) = ${dist}`);
        if (mindist === null || dist < mindist)
            mindist = dist;
    }
    return mindist;
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

function findIntersections(aCoords, bCoords) {
    let intersections = [];

    // loop through all a coords
    let a = aCoords[0];
    let apx = a.x, apy = a.y; // prev a coords
    for (let aIndex = 1; aIndex < aCoords.length; aIndex++, apx = a.x, apy = a.y) {
        a = aCoords[aIndex];

        // loop through all b coords
        let b = bCoords[0];
        let bpx = b.x, bpy = b.y; // prev b coords
        for (let bIndex = 1; bIndex < bCoords.length; bIndex++, bpx = b.x, bpy = b.y) {
            b = bCoords[bIndex];

            // omit intersection with the first line segment from both wires
            if (aIndex === 1 && bIndex === 1) continue;

            // we'd have to do something special and icky if they have the same orientation,
            // so let's see if we can safely ignore that case
            if (a.o === b.o)
            {
                if (a.o === 'h')
                {
                    if (a.y !== b.y) continue;
                    assert(false, "yuck, h");
                }
                else
                {
                    if (a.x !== b.x) continue;
                    assert(false, "yuck, v");
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
            //assert(h.py == h.y, 'horizontal y mismatch');
            //assert(v.px == v.x, 'vertical x mismatch');

            // so h is the horizontal segment, and v is vertical, now sort them so 1 < 2
            let h1 = h.px, h2 = h.x;
            if (h1 > h2) [h1, h2] = [h2, h1];
            let v1 = v.py, v2 = v.y;
            if (v1 > v2) [v1, v2] = [v2, v1];
            
            // we can now do 4 easy tests to throw out all non-intersections
            if (v.x < h1 ||
                v.x > h2 ||
                h.y < v1 ||
                h.y > v2) continue;

            // for what's left, the intersection is simply vertical's x and horizontal's y
            var i = {x: v.x, y: h.y};

            // push true intersections
            intersections.push(i);
       }
    }

    return intersections;
}
