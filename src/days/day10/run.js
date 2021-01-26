'use strict';
const { assert } = require('console');
const { readFileSync } = require('fs');
const { isNull } = require('util');
const common = require('../../lib/common.js');

const manager = require('../../lib/dayManager.js');

(function(){
    manager.day(10, 'Monitoring Station',
    [
        334,
        1119
    ],
    (api) =>
    {
        common.addExtensions();

        const asteroidField = api.time('read and parse', ()=>parseAsteroidField(readFileSync('./input.txt', 'utf-8')));

        checkExamples();

        let baseLocation;
        api.doPart(1, () => {
            const info = getBestLocationInfo(asteroidField);
            baseLocation = {x: info.x, y: info.y};
            return info.detectionCount;
        });

        api.doPart(2, () => {
            const loc = getNthVaporizationLocation(200, xyToKey(baseLocation), asteroidField);
            return loc.x * 100 + loc.y;
        });
    });
})();

function parseAsteroidField(rawAsteroidField)
{
    let field = [];
    const lines = rawAsteroidField.trim().split(/\r?\n/).map(x => x.trim()).filter(x => x.length > 0).withIndex();
    for (let line of lines)
        for (let char of [...line.item].withIndex())
            if (char.item === '#')
                field.push({x: char.index, y: line.index});
    return {locations: field, width: lines[0].item.length, height: lines.length};
}

function getBestLocationInfo(asteroidField)
{
    let best = null;
    for (let location of asteroidField.locations)
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

// get min slope from candidate to target
function getMinSlopeToTarget(candidate, target)
{
    return minSlope({x: target.x - candidate.x, y: target.y - candidate.y});
}

// get angle from origin to location, with 0 degrees straight up and positive going clockwise
function getAngle(x, y)
{
    return (90 + 360 + Math.atan2(y, x) * 180 / Math.PI) % 360;
}

// function to get all location keys up to a target asteroid from the candidate
function getOccultingLocationKeys(candidate, target)
{
    let keys = [];

    // function to add min slope to a location
    const slope = getMinSlopeToTarget(candidate, target);
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

function getTargetAsteroidKeySet(asteroidField, candidate)
{
    // put all but the candidate into a set
    let asteroids = new Set();
    for (let loc of asteroidField.locations)
        asteroids.add(xyToKey({x: loc.x, y: loc.y}));
    asteroids.delete(xyToKey({x: candidate.x, y: candidate.y}));
    return asteroids;
}

function getLocationInfo(asteroidField, candidate)
{
    const asteroidKeys = getTargetAsteroidKeySet(asteroidField, candidate);

    // for each such asteroid, add detection count if no occulting locations are also in the set
    let detectionCount = 0;
    for (let key of asteroidKeys)
    {
        let target = xyFromKey(key);
        let hidden = false;
        for (let occultingKey of getOccultingLocationKeys(candidate, target))
            if (asteroidKeys.has(occultingKey))
            {
                hidden = true;
                break;
            }
        if (!hidden)
            detectionCount++;
    }

    return {x: candidate.x, y: candidate.y, detectionCount};
}

function getNthVaporizationLocation(n, baseLocationKey, asteroidField)
{
    // parse base location back from key
    const baseLocation = xyFromKey(baseLocationKey);

    // get set of all unique minimum slopes from candidate to all asteroids
    let slopeKeys = new Set();
    for (let target of asteroidField.locations)
        if (baseLocationKey !== xyToKey(target))
        slopeKeys.add(xyToKey(getMinSlopeToTarget(baseLocation, target)));

    // map the keys to slope trackers sorted by angle
    let slopes = [];
    for (let slopeKey of slopeKeys)
    {
        const slope = xyFromKey(slopeKey);
        const angle = getAngle(slope.x, slope.y);
        slopes.push({
            slope,
            angle,
            nextPos: {
                x: baseLocation.x + slope.x,
                y: baseLocation.y + slope.y
            },
            active: true
        });
    }
    slopes.sort((a,b) => a.angle - b.angle);

    // put all asteroids except base in set
    let asteroidKeys = getTargetAsteroidKeySet(asteroidField, baseLocation);

    // iterate through the slopes in order until we reach the vaporization count or run out of asteroids
    let vaporizationCount = 0;
    let lastVaporizationLocation = null;
    for (let slopeIndex = 0; vaporizationCount < n && asteroidKeys.size > 0; slopeIndex = (slopeIndex + 1) % slopes.length)
    {
        // get the current slope, and skip if no longer active (no more asteroids along slope)
        const slope = slopes[slopeIndex];
        if (!slope.active)
            continue;
        
        // repeatedly advance along the slope
        let hit = false;
        do
        {
            // if we're out of bounds, deactivate this slope (moving on to the next)
            if (slope.nextPos.x < 0 || slope.nextPos.y < 0 || slope.nextPos.x >= asteroidField.width || slope.nextPos.y >= asteroidField.height)
            {
                slope.active = false;
                break;
            }
    
            // if we hit an asteroid
            const posKey = xyToKey(slope.nextPos);
            if (asteroidKeys.has(posKey))
            {
                // remove it, set hit flag, increase vape count, and save the location
                asteroidKeys.delete(posKey);
                hit = true;
                ++vaporizationCount;
                lastVaporizationLocation = {x: slope.nextPos.x, y: slope.nextPos.y};
            }

            // regardless, advance the next position to check on this slope
            slope.nextPos.x += slope.slope.x;
            slope.nextPos.y += slope.slope.y;
        }
        while (!hit && slope.active); // keep going until we hit or this slope is exhausted
    }

    return lastVaporizationLocation;
}

function checkExamples()
{
    assert(gcd(15, 12) === 3, 'gcd broken (1)');
    assert(gcd(15, 13) === 1, 'gcd broken (2)');
    assert(gcd(4, 64) === 4, 'gcd broken (3)');

    assert(getOccultingLocationKeys({x:0, y:0}, {x:2, y:2}).join('-') === '1,1', 'golk broken (1)');
    assert(getOccultingLocationKeys({x:0, y:0}, {x:3, y:6}).join('-') === '1,2-2,4', 'golk broken (2)');
    assert(getOccultingLocationKeys({x:0, y:0}, {x:3, y:5}).join('-') === '', 'golk broken (3)');
    assert(getOccultingLocationKeys({x:13, y:11}, {x:1, y:7}).join('-') === '10,10-7,9-4,8', 'golk broken (4)');

    assert(0 == getAngle(0, -1), 'getAngle broken (1)');
    assert(45 == getAngle(1, -1), 'getAngle broken (2)');
    assert(180 == getAngle(0, 1), 'getAngle broken (3)');
    
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

    const bigExample = `
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
        `;
    check(
        bigExample,
        11, 13, 210);
    
    const bigExampleAsteroidField = parseAsteroidField(bigExample);
    for (let raw of // straight from the puzzle text, so no typos
        `The 1st asteroid to be vaporized is at 11,12.
        The 2nd asteroid to be vaporized is at 12,1.
        The 3rd asteroid to be vaporized is at 12,2.
        The 10th asteroid to be vaporized is at 12,8.
        The 20th asteroid to be vaporized is at 16,0.
        The 50th asteroid to be vaporized is at 16,9.
        The 100th asteroid to be vaporized is at 10,16.
        The 199th asteroid to be vaporized is at 9,6.
        The 200th asteroid to be vaporized is at 8,2.
        The 201st asteroid to be vaporized is at 10,9.
        The 299th and final asteroid to be vaporized is at 11,1.`
            .split(/\r?\n/).map(x => x.trim()))
    {
        const parts = raw.split(' ');
        const n = Number(parts[1].slice(0, -2));
        const pos = parts[parts.length - 1].slice(0,-1);
        const resultKey = xyToKey(getNthVaporizationLocation(n, '11,13', bigExampleAsteroidField));
        assert(pos === resultKey, `failed vaporization check: ${raw} -- resultKey = ${resultKey}`);
    }
}