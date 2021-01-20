'use strict';
const { assert } = require('console');
const { readFileSync } = require('fs');
const { isNull } = require('util');
const common = require('../common.js');

const manager = require('../dayManager.js');

(function(){
    manager.day(10, 'Monitoring Station',
    [
        334,
    ],
    (api) =>
    {
        common.addExtensions();

        const asteroidField = api.time('read and parse', ()=>parseAsteroidField(readFileSync('./input.txt', 'utf-8')));

        checkExamples();

        api.doPart(1, () => getBestLocationInfo(asteroidField).detectionCount);
    });
})();

function parseAsteroidField(rawAsteroidField)
{
    let field = [];
    for (let line of rawAsteroidField.trim().split(/\r?\n/).map(x => x.trim()).filter(x => x.length > 0).withIndex())
        for (let char of [...line.item].withIndex())
            if (char.item === '#')
                field.push({x: char.index, y: line.index});
    return field;
}

function getBestLocationInfo(asteroidField)
{
    let best = null;
    for (let location of asteroidField)
    {
        const info = getLocationInfo(asteroidField, location);
        if (best === null || info.detectionCount > best.detectionCount)
            best = info;
    }
    return best;
}

// conversion of xy coords to/from keys
function xyToKey(pos) {return `${pos.x},${pos.y}`;}
function xyFromKey(key) {const [x, y] = key.split(',').map(x => Number(x)); return {x, y};}

// greatest common divisor
function gcd(a, b) {return !b ? a : gcd(b, a % b);}

// get minimal slope from origin to location
function minSlope(loc) {const d = gcd(Math.abs(loc.x), Math.abs(loc.y)); return {x: loc.x / d, y: loc.y / d};}

// function to get all location keys up to a target asteroid from the candidate
function getOccultingLocationKeys(candidate, target)
{
    let keys = [];

    // function to add min slope to a location
    const slope = minSlope({x: target.x - candidate.x, y: target.y - candidate.y});
    function next(prev) {return {x: prev.x + slope.x, y: prev.y + slope.y};}

    // add slope to candidate, adding the keyed result, until we reach target
    let pos = next(candidate);
    while (!(pos.x === target.x && pos.y === target.y))
    {
        keys.push(xyToKey(pos));
        pos = next(pos);
    }
    
    return keys;
}

function getLocationInfo(asteroidField, candidate)
{
    // put all but the candidate into a set
    let asteroids = new Set();
    for (let loc of asteroidField)
        asteroids.add(xyToKey({x: loc.x, y: loc.y}));
    asteroids.delete(xyToKey({x: candidate.x, y: candidate.y}));

    // for each such asteroid, add detection count if no occulting locations are also in the set
    let detectionCount = 0;
    for (let key of asteroids)
    {
        let target = xyFromKey(key);
        let hidden = false;
        for (let occultingKey of getOccultingLocationKeys(candidate, target))
            if (asteroids.has(occultingKey))
            {
                hidden = true;
                break;
            }
        if (!hidden)
            detectionCount++;
    }

    return {x: candidate.x, y: candidate.y, detectionCount};
}

function checkExamples()
{
    assert(gcd(15, 12) === 3, 'gcd broken (1)');
    assert(gcd(15, 13) === 1, 'gcd broken (2)');
    assert(gcd(4, 64) === 4, 'gcd broken(3)');

    assert(getOccultingLocationKeys({x:0, y:0}, {x:2, y:2}).join('-') === '1,1', 'golk broken (1)');
    assert(getOccultingLocationKeys({x:0, y:0}, {x:3, y:6}).join('-') === '1,2-2,4', 'golk broken (2)');
    assert(getOccultingLocationKeys({x:0, y:0}, {x:3, y:5}).join('-') === '', 'golk broken (3)');
    assert(getOccultingLocationKeys({x:13, y:11}, {x:1, y:7}).join('-') === '10,10-7,9-4,8', 'golk broken (4)');

    let index = 0;
    function check(rawAsteroidField, expectedX, expectedY, expectedDetectionCount)
    {
        ++index;
        const asteroidField = parseAsteroidField(rawAsteroidField);
        const bestLocationInfo = getBestLocationInfo(asteroidField);
        assert(bestLocationInfo.x === expectedX, `example ${index} X mismatch`);
        assert(bestLocationInfo.y === expectedY, `example ${index} Y mismatch`);
        assert(bestLocationInfo.detectionCount === expectedDetectionCount, `example ${index} detectionCount mismatch`);
    }

    check(`
        .#..#
        .....
        #####
        ....#
        ...##
        `,
        3, 4, 8);

    check(`
        ......#.#.
        #..#.#....
        ..#######.
        .#.#.###..
        .#..#.....
        ..#....#.#
        #..#....#.
        .##.#..###
        ##...#..#.
        .#....####
        `,
        5, 8, 33);
        
    check(`
        #.#...#.#.
        .###....#.
        .#....#...
        ##.#.#.#.#
        ....#.#.#.
        .##..###.#
        ..#...##..
        ..##....##
        ......#...
        .####.###.
        `,
        1, 2, 35);

    check(`
        .#..#..###
        ####.###.#
        ....###.#.
        ..###.##.#
        ##.##.#.#.
        ....###..#
        ..#.#..#.#
        #..#.#.###
        .##...##.#
        .....#.#..
        `,
        6, 3, 41);

    check(`
        .#..##.###...#######
        ##.############..##.
        .#.######.########.#
        .###.#######.####.#.
        #####.##.#.##.###.##
        ..#####..#.#########
        ####################
        #.####....###.#.#.##
        ##.#################
        #####.##.###..####..
        ..######..##.#######
        ####.##.####...##..#
        .#####..#.######.###
        ##...#.##########...
        #.##########.#######
        .####.#.###.###.#.##
        ....##.##.###..#####
        .#.#.###########.###
        #.#.#.#####.####.###
        ###.##.####.##.#..##
        `,
        11, 13, 210);
}