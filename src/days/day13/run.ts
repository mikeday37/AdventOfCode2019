import * as process from 'process';
import '../../lib/intcode.js';
import * as manager from '../../lib/dayManager.js';
import { Intcode } from '../../lib/intcode.js';

(function(){
	manager.day(13, 'Care Package',
	[
		284,
		13581
	],
	(api) =>
	{
		const intcode = api.time('get intcode service', () => Intcode.getService());
		const program = api.time('read and parse', () => intcode.parse(api.readInput()));

		api.doPart(1, () => runProgram(intcode, program).countTilesOfType(TileType.Block));

		api.doPart(2, () => runProgram(intcode, hackToPlayFree(program), adjustJoystickToWin().onOutput).score);
	});
})();

enum TileType {
	Empty = 0,
	Wall = 1,
	Block = 2,
	Paddle = 3,
	Ball = 4
}

type PointKey = string;

function xyToKey(x: number, y: number): PointKey
{
	return `${x},${y}`;
}

interface ProgramResults {
	tiles: Map<PointKey, TileType>;
	countTilesOfType: (tileType: TileType) => number;
	score: number | null;
}

function runProgram(
	intcode: Intcode.Service,
	program: number[],
	onOutputFunction: ((output: number[]) => number | null) | null = null
		) : ProgramResults
{
	const tiles: Map<PointKey, TileType> = new Map();
	let output: number[] = [];
	let score: number | null = null;
	let outputValue: number = 0;

	let state = intcode.init(program, {
		hasInput: () => true,
		readInput: () => outputValue,
		writeOutput: v => {
			output.push(v);
			if (output.length === 3)
			{
				const key = xyToKey(output[0], output[1]);
				if (key === '-1,0')
					score = output[2];
				else
					tiles.set(key, output[2]);

				if (onOutputFunction !== null)
					outputValue = onOutputFunction(output) ?? outputValue;

				output = [];
			}
		}
	});

	state.runToHalt();

	return {
		tiles,
		countTilesOfType: tileType => [...tiles.values()]
			.filter(x => x === tileType)
			.length, // TODO: there's gotta be a more efficient, easy way to do this
		score
	};
}

function adjustJoystickToWin()
{
	// track the ball and pad
	let ball_x: number;
	let pad_x: number;

	// onOutput function to adjust joystick
	function onOutput(output: number[]) : number | null
	{
		// don't adjust if setting score
		if (output[0] < 0)
			return null;

		switch (output[2] as TileType)
		{
			case TileType.Ball:  ball_x = output[0]; break;
			case TileType.Paddle: pad_x = output[0]; break;

			default: return null;
		}

		if (ball_x < pad_x)
			return -1;
		else if (ball_x > pad_x)
			return 1;
		else
			return 0;
	}

	return {onOutput};
}

function hackToPlayFree(program: number[]) : number[]
{
	let hacked = [...program];
	hacked[0] = 2;
	return hacked;
}
