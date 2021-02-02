import { assert } from 'console';
import * as manager from '../../lib/dayManager.js';
import { Intcode } from '../../lib/intcode.js';
import * as grid from '../../lib/grid.js';

(function(){
	manager.day(17, 'Set and Forget',
	[
		10064
	],
	(api) =>
	{
		const intcode = api.time('get intcode service', () => Intcode.getService());
		const program = api.time('read and parse', () => intcode.parse(api.readInput()));

		runTests();

		api.doPart(1, () => getAlignmentParameterSum(getCurrentView(intcode, program)));
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
	return view.trim().split('\n').map(x => x.trim());
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
}