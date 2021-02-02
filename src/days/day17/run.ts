import { assert } from 'console';
import * as manager from '../../lib/dayManager.js';
import { Intcode } from '../../lib/intcode.js';
import * as grid from '../../lib/grid.js';

(function(){
	manager.day(17, 'Set and Forget',
	[
		10064,
		1197725
	],
	(api) =>
	{
		const intcode = api.time('get intcode service', () => Intcode.getService());
		const program = api.time('read and parse', () => intcode.parse(api.readInput()));

		runTests();

		api.doPart(1, () => getAlignmentParameterSum(getCurrentView(intcode, program)));
		api.doPart(2, () => new RobotPlanner(intcode, program).visitEntireScaffolding().dust);
	});
}());

function getCurrentView(intcode: Intcode.Service, program: number[]) : string
{
	const result = intcode.run(program, []);
	return String.fromCharCode(...result.output);
}

function getAlignmentParameterSum(view: string) : number
{
	return getScaffoldIntersections(view).map(x => x.x * x.y).reduce((a, b) => a + b, 0);
}

function toLines(view: string) : string[]
{
	return view.trim().split(/\r?\n/).map(x => x.trim());
}

function getScaffoldIntersections(view: string) : grid.Point[]
{
	const lines = toLines(view);
	const width = lines[0].length;
	const height = lines.length;
	const result: grid.Point[] = [];
	for (let y = 1; y < height - 1; y++)
		for (let x = 1; x < width - 1; x++)
			if (       lines[y][x] === '#'
					&& lines[y+1][x] === '#'
					&& lines[y-1][x] === '#'
					&& lines[y][x+1] === '#'
					&& lines[y][x-1] === '#')
				result.push({x, y});
	return result;
}

enum Direction {
	North = 0,
	East = 1,
	South = 2,
	West = 3
}

const directionToOffset: Map<Direction, grid.Point> = new Map([
	[Direction.North, {x: 0, y: -1}],
	[Direction.East, {x: 1, y: 0}],
	[Direction.South, {x: 0, y: 1}],
	[Direction.West, {x: -1, y: 0}],
]);

const offsetToDirection: Map<grid.PointKey, Direction> = new Map(
	[...directionToOffset].map(x => [grid.pointToKey(x[1]), x[0]])
);

function getBasePath(rawView: string[]) : string[]
{
	// find start position and direction
	const view = addBorder(rawView);
	const width = view[0].length;
	const height = view.length;
	let startPoint: grid.Point | undefined;
	let startDirection: Direction | undefined;
	for (let y = 1; y < height - 1 && startPoint === undefined; y++)
		for (let x = 1; x < width - 1; x++)
		{
			const cell = view[y][x];
			switch (cell)
			{
				case '.': continue;
				case '#': continue;

				case '^': startDirection = Direction.North; break;
				case '>': startDirection = Direction.East; break;
				case 'v': startDirection = Direction.South; break;
				case '<': startDirection = Direction.West; break;

				default: throw new Error(`invalid start character: ${cell}`);
			}
			startPoint = {x, y};
			break;
		}
	if (startDirection === undefined || startPoint === undefined)
		throw new Error('unable to find start position and/or direction');

	// explore scaffolding to end, building path array
	let path: string[] = [];
	let currentPosition = {x: startPoint.x, y: startPoint.y} as grid.Point;
	let currentDirection = startDirection;
	while (true)
	{
		// at start of outer loop, we just reached the end of a run
		// (based on all examples and full input, this assumption also works, even though initially false, at first iteration)
		
		// determine the two directions we need to test to determine how to turn
		const dir1 = (currentDirection + 1) % 4 as Direction;
		const dir2 = (currentDirection + 3) % 4 as Direction;

		// test the direction for more scaffolding
		const open = [{dir: dir1, dirCode: 'R'}, {dir: dir2, dirCode: 'L'}]
			.map(d => ({dir: d.dir, dirCode: d.dirCode, offset: directionToOffset.get(d.dir)!}))
			.map(d => ({dir: d.dir, dirCode: d.dirCode, x: currentPosition.x + d.offset.x, y: currentPosition.y + d.offset.y}))
			.filter(d => view[d.y][d.x] === '#');

		// if neither is open, we're at the end
		if (open.length === 0)
			break;

		// otherwise, exactly one should be open
		if (open.length !== 1)
			throw new Error('unexpected branch');

		// go in the open dir, seeing how far we can go until we have to turn again (runLength)
		path.push(open[0].dirCode);
		currentDirection = open[0].dir;
		const movementOffset = directionToOffset.get(currentDirection)!;
		const getNextPosition: () => grid.Point = () => ({x: currentPosition.x + movementOffset.x, y: currentPosition.y + movementOffset.y});
		let nextPosition = getNextPosition();
		let runLength = 0;
		while (view[nextPosition.y][nextPosition.x] === '#')
		{
			++runLength;
			currentPosition = nextPosition;
			nextPosition = getNextPosition();
		}
		path.push(String(runLength));
	}
	
	return path;
}

function addBorder(rawView: string[]) : string[]
{
	const view = [...rawView];
	const horizontalBorder = '.'.repeat(view[0].length + 2);
	view.unshift(horizontalBorder);
	view.push(horizontalBorder);
	for (let i = 1; i < view.length - 1; i++)
		view[i] = '.' + view[i] + '.';
	return view;
}

function extractPattern(inputPath: string[], name: string, maxAllowedPatternLength: number, greedy: boolean)
	: { pattern: string[], outputPath: string[], complete: boolean }
{
	// copy path to outputPath, which we'll modify
	let outputPath = [...inputPath];

	// function to determine if an element is a patter name
	const isPatternName: (e: string) => boolean = e => e === 'A' || e === 'B' || e === 'C';

	// find index of start element = first not a pattern name
	let startIndex = 0;
	while (isPatternName(outputPath[startIndex]))
		++startIndex;

	// a pattern is simply an array of elements
	let pattern: string[] = [];

	// function to determine if the pattern exists at an index
	const isPatternAtIndex: (i: number) => boolean = i =>
		outputPath.slice(i, i + pattern.length).join(',') === pattern.join(',');

	// function to determine first index of pattern starting at index, or null if not found
	const firstPatternIndexFrom: (startIndex: number) => number | null = i =>
	{
		for (; i <= outputPath.length - pattern.length; i++)
			if (isPatternAtIndex(i))
				return i;
		return null;
	}

	// start with a test pattern size of 2 or what's left from startIndex, whichever is smaller
	let testSize = Math.min(2, outputPath.length - startIndex);
	let nextPatternAdditionIndex = startIndex;

	// function to grow the pattern to size, or return false if it did not grow
	const growPatternToSize: (size: number) => boolean = size =>
	{
		let grew: boolean = false;
		while (pattern.length < size
			&& pattern.length < maxAllowedPatternLength
			&& nextPatternAdditionIndex < outputPath.length
			&& !isPatternName(outputPath[nextPatternAdditionIndex])
			&& [...pattern, outputPath[nextPatternAdditionIndex]].join(',').length <= 20)
		{
			pattern.push(outputPath[nextPatternAdditionIndex++]);
			grew = true;
		}
		return grew;
	}

	// start the pattern
	let grew = growPatternToSize(testSize);
	if (!grew)
		throw new Error('did not grow initial pattern');

	// repeat growing until we can't, tracking maxes: patternSize, patternSizeWithMatch
	let maxPatternSize = pattern.length;
	let maxPatternSizeWithMatch: number | null = null;
	for (; grew; grew = growPatternToSize(++testSize), maxPatternSize = pattern.length)
	{
		let matchIndex = firstPatternIndexFrom(startIndex + pattern.length);
		if (matchIndex != null)
		{
			if (maxPatternSizeWithMatch === null || maxPatternSizeWithMatch < pattern.length)
				maxPatternSizeWithMatch = pattern.length;
		}
	}

	// determine size of pattern to extract, and limit to that size
	const extractSize = greedy ? maxPatternSize : (maxPatternSizeWithMatch ?? maxPatternSize);
	if (pattern.length > extractSize)
	pattern.splice(extractSize);

	// find all occurances of pattern
	let foundIndices: number[] = [];
	let foundIndex: number | null = startIndex;
	do
	{
		foundIndices.push(foundIndex);
		foundIndex = firstPatternIndexFrom(foundIndex + pattern.length);
	}
	while (foundIndex !== null);

	// replace in reverse order
	foundIndices.reverse();
	for (let replaceIndex of foundIndices)
		outputPath.splice(replaceIndex, pattern.length, name);

	// we're complete if we're doing greedy and all of the output elements are pattern names and the output path, joined with commas, has length <= 20
	let complete = false;
	if (greedy)
	{
		complete = outputPath.join(',').length <= 20;
		if (complete)
			for (let e of outputPath)
				if (!isPatternName(e))
				{
					complete = false;
					break;
				}
	}

	// otherwise, return the results
	return {pattern, outputPath, complete};
}

function getMovementFunctions(view: string[])
{
	const basePath = getBasePath(view);

	for (let maxA = 10; maxA >= 1; --maxA)
		for (let maxB = 10; maxB >= 1; --maxB)
			for (let maxC = 10; maxC >= 1; --maxC)
			{
				const {pattern: patternA, outputPath: pathAfterA}           = extractPattern(basePath,   'A', maxA, false);
				const {pattern: patternB, outputPath: pathAfterB}           = extractPattern(pathAfterA, 'B', maxB, false);
				const {pattern: patternC, outputPath: pathAfterC, complete} = extractPattern(pathAfterB, 'C', maxC, true);
				if (complete)
					return {main: pathAfterC, a: patternA, b: patternB, c: patternC};
			}

	throw new Error('unable to find complete movement functions');
}

class RobotPlanner
{
	intcode: Intcode.Service;
	originalProgram: number[];
	runningProgram: number[];
	view: string[];

	constructor(intcode: Intcode.Service, program: number[])
	{
		this.intcode = intcode;

		// use the original program to get initial view
		this.originalProgram = [...program];
		this.view = toLines(getCurrentView(intcode, this.originalProgram));

		// save program modified to "wake up" and run
		this.runningProgram = [...program];
		assert(this.runningProgram[0] === 1, 'unexpected initial program state');
		this.runningProgram[0] = 2;
	}

	visitEntireScaffolding() : {dust: number}
	{
		// get the moves we need to send the robot
		const moves = getMovementFunctions(this.view);

		// convert to ascii input string
		const inputString = [
			...[moves.main, moves.a, moves.b, moves.c, ['n'], []]
				.map(x => x.join(','))
		].join('\n');

		// convert to array of ascii codes
		const input: number[] = [];
		for (let i = 0; i < inputString.length; i++)
			input.push(inputString.charCodeAt(i));
			
		// run the program with that input, and return the last output value as the dust count
		const results = this.intcode.run(this.runningProgram, input);
		const dust = results.output[results.output.length - 1];
		return {dust};
	}
}

function runTests()
{
	assert(getAlignmentParameterSum(`
	..#..........
	..#..........
	#######...###
	#.#...#...#.#
	#############
	..#...#...#..
	..#####...^..`) === 76, 'part 1 example failed');

	const part2ExampleInput = `
	#######...#####
	#.....#...#...#
	#.....#...#...#
	......#...#...#
	......#...###.#
	......#.....#.#
	^########...#.#
	......#.#...#.#
	......#########
	........#...#..
	....#########..
	....#...#......
	....#...#......
	....#...#......
	....#####......`;
	const part2View = toLines(part2ExampleInput);
	assert(getBasePath(part2View).join(',') === 'R,8,R,8,R,4,R,4,R,8,L,6,L,2,R,4,R,4,R,8,R,8,R,8,L,6,L,2', 'part 2 example 1 failed');

	const {main,a,b,c} = getMovementFunctions(part2View);
	const [x,y,z] = [a,b,c].map(s => s.join(','));
	assert([main,x,y,z].join('|') === 'A,B,C,B,A,C|R,8,R,8|R,4,R,4|R,8,L,6,L,2', 'part 2 example 2 failed');
	// yes that example is modified from the website, but it works / is equivalent.
}