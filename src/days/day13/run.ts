import * as process from 'process';
import '../../lib/intcode.js';
import * as manager from '../../lib/dayManager.js';
import { Intcode } from '../../lib/intcode.js';

(function(){
	manager.day(13, 'Care Package',
	[
		284
	],
	(api) =>
	{
		const intcode = api.time('get intcode service', () => Intcode.getService());
		const program = api.time('read and parse', () => intcode.parse(api.readInput()));

		api.doPart(1, () => runProgram(intcode, program).countTilesOfType(TileType.Block));

	});
})();


enum TileType {
	Empty = 0,
	Wall = 1,
	Block = 2,
	Paddle = 3,
	Ball = 4
}

type Point = [x: number, y: number];
type PointKey = string;

interface ProgramResults {
	tiles: Map<PointKey, TileType>;
	countTilesOfType: (tileType: TileType) => number;
}

function runProgram(intcode: Intcode.Service, program: number[]) : ProgramResults
{
	const tiles: Map<PointKey, TileType> = new Map();
	let output: number[] = [];
	
	let state = intcode.init(program, {
		hasInput: () => false,
		readInput: () => 0,
		writeOutput: v => {
			output.push(v);
			if (output.length === 3)
			{
				const pointKey: PointKey = `${output[0]},${output[1]}`;
				tiles.set(pointKey, output[2]);
				output = [];
			}
		}
	});

	state.runToHalt();

	return {
		tiles,
		countTilesOfType: (tileType) => [...tiles.values()].filter(x => x === tileType).length // TODO: there's gotta be a more efficient, easy way to do this
	};
}
