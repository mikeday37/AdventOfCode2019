import { assert } from 'console';
import * as manager from '../../lib/dayManager.js';
import { Intcode } from '../../lib/intcode.js';
import * as grid from '../../lib/grid.js';
import Graph from 'node-dijkstra';

(function(){
	manager.day(15, 'Oxygen System',
	[
		218,
		544
	],
	(api) =>
	{
		const intcode = api.time('get intcode service', () => Intcode.getService());
		const program = api.time('read and parse', () => intcode.parse(api.readInput()));

		runTests();

		let repairController: RepairController;
		api.doPart(1, () => {
			repairController = new RepairController(intcode, program);
			return repairController.getPathToOxygenSystem().length;
		});

		api.time('finish ship discovery', () => repairController!.finishShipDiscovery!());

		repairController!.logShip();

		api.doPart(2, () => repairController!.getMinutesToOxygenFill());
	});
}());

enum Direction {
	North = 1,
	South = 2,
	West = 3,
	East = 4
}

const directionToOffset: Map<Direction, grid.Point> = new Map([
	[Direction.North, {x: 0, y: -1}],
	[Direction.South, {x: 0, y: 1}],
	[Direction.West, {x: -1, y: 0}],
	[Direction.East, {x: 1, y: 0}],
]);

const offsetToDirection: Map<grid.PointKey, Direction> = new Map(
	[...directionToOffset].map(x => [grid.pointToKey(x[1]), x[0]])
);

enum CellType {
	Open,
	Wall,
	OxygenSystem
}

enum Status {
	HitWall = 0,
	Moved = 1,
	FoundOxygenSystem = 2,
}

class RepairController {
	intcode: Intcode.Service;
	program: number[];

	oxygenSystemLocation: grid.Point | null = null;

	shipGrid = new grid.DynamicGrid<CellType>();

	/**
	 * the ship graph is a graph representation of all discovered cells that are not walls.
	 * this enables the use of Dijkstra's algorithm for robot pathfinding.
	 * 
	 * I went with Dijkstra's instead of A* because I see a potential opportunity to
	 * optimize by simplifying cooridors into single edge pairs, rather than a node for
	 * every location along the corridor.
	 */
	shipGraph: Map<grid.PointKey, Map<grid.PointKey, number>> = new Map();

	constructor(intcode: Intcode.Service, program: number[])
	{
		this.intcode = intcode;
		this.program = [...program];
	}

	discoverOxygenSystem() : void
	{
		// only discover if we haven't already
		if (!this.shipGrid.isEmpty())
			return;

		// regard current position as 0,0 and track changes
		let droidlocation: grid.Point = {x: 0, y: 0};
		this.shipGrid.setCell(droidlocation, CellType.Open);

		// init the program state
		const inputBuffer: number[] = [];
		const outputBuffer: number[] = [];
		const state = this.intcode.init(this.program, {
			hasInput: () => inputBuffer.length > 0,
			readInput: () => inputBuffer.shift()!,
			writeOutput: (v) => outputBuffer.push(v)
		});

		// track unknown points adjacent to where we've been, starting with the four cells adjacent to origin orthogonally
		const adjacentUnknowns: {from: grid.Point, to: grid.Point}[] = [];
		const addAdjacentUnknowns: () => void = () =>
		{
			for (let offset of directionToOffset.values())
			{
				const adjacentLocation = {x: droidlocation.x + offset.x, y: droidlocation.y + offset.y};
				if (!this.shipGrid.hasCell(adjacentLocation))
					adjacentUnknowns.push({
						from: {x: droidlocation.x, y: droidlocation.y},
						to: adjacentLocation,
					});
			}
		};
		addAdjacentUnknowns();

		// start the shipGraph with a single node
		this.shipGraph.set(grid.pointToKey(droidlocation), new Map());

		// helper function to explore from current location in a given direction
		const explore: (d: Direction) => Status = d =>
		{
			// calculate expected destination if we actually move
			const offset = directionToOffset.get(d);
			if (offset === undefined)
				throw new Error(`invalid direction: ${d}`);
			const expectedLocation = {
				x: droidlocation.x + offset.x,
				y: droidlocation.y + offset.y
			};

			// send the output command and run to halt (it should repeatedly halt after outputting status and waiting for next input)
			inputBuffer.push(d);
			state.runToHalt();

			// check that program is behaving as expected
			if (inputBuffer.length !== 0)
				throw new Error(`input not read - current length = ${inputBuffer.length}`);
			if (state.haltCode !== state.HALTCODE_WAITING_FOR_INPUT)
				throw new Error(`unexpected halt: code = ${state.haltCode}, reason = ${state.haltReason}`);
			if (outputBuffer.length !== 1)
				throw new Error(`unexpected output - current length = ${outputBuffer.length}`);

			// get the output
			const status = outputBuffer.pop() as Status;

			// handle status
			let newDroidlocation = false;
			switch (status)
			{
				// when we hit a wall, just mark the cell as such on the grid
				case Status.HitWall:
					this.shipGrid.setCell(expectedLocation, CellType.Wall);
					break;

				// if we moved into open space, set newDroidLocation if we haven't been there before,
				// mark the cell as open space, and move the droidLocation there.
				case Status.Moved:
					newDroidlocation = !this.shipGrid.hasCell(expectedLocation);
					this.shipGrid.setCell(expectedLocation, CellType.Open);
					droidlocation = expectedLocation;
					break;

				// if we moved onto the oxygen system, handle like Status.Moved, except
				// mark the cell accordingly and save the discovered oxygenSystemLocation.
				case Status.FoundOxygenSystem:
					newDroidlocation = !this.shipGrid.hasCell(expectedLocation);
					this.shipGrid.setCell(expectedLocation, CellType.OxygenSystem);
					droidlocation = expectedLocation;
					this.oxygenSystemLocation = expectedLocation;
					break;

				default:
					throw new Error(`invalid status: ${status}`);
			}

			// if we hit a new location
			if (newDroidlocation)
			{
				// add new adjacent unknowns
				addAdjacentUnknowns();

				// add node and link to adjacent discovered open or oxygen cells
				const locationKey = grid.pointToKey(droidlocation);
				const locationNode: Map<string, number> = new Map();
				this.shipGraph.set(locationKey, locationNode);
				for (let offset of directionToOffset.values())
				{
					const checkLocation = {x: droidlocation.x + offset.x, y: droidlocation.y + offset.y};
					const checkCell = this.shipGrid.getCell(checkLocation);
					if (checkCell === CellType.Open || checkCell === CellType.OxygenSystem)
					{
						const checkKey = grid.pointToKey(checkLocation);
						const checkNode = this.shipGraph.get(checkKey);
						if (checkNode === undefined)
							throw new Error(`checkNode at key ${checkKey} does not exist`);
						locationNode.set(checkKey, 1);
						checkNode.set(locationKey, 1);
					}
				}
			}

			// return the status
			return status;
		}

		// expose unknown locations until there are none left or we find the oxygen system
		const iterateSearch: () => void = () =>
		{
			// pop an adjacentUnknown to send the robot to
			const target = adjacentUnknowns.pop()!;
			
			// plan a route to the target "from" location (goal), then to the "to" location (test)
			const startKey = grid.pointToKey(droidlocation);
			const goalKey = grid.pointToKey(target.from);
			let route: string[] = [];
			if (startKey !== goalKey)
			{
				route = new Graph(this.shipGraph as any).path(startKey, goalKey, {trim: true}) as string[] | null || [];
				route.push(goalKey);
			}
			const testKey = grid.pointToKey(target.to);
			route.push(testKey);

			// execute the route
			while (route.length > 0)
			{
				const nextKey = route.shift()!;
				const nextLocation = grid.keyToPoint(nextKey);
				const nextOffset = {x: nextLocation.x - droidlocation.x, y: nextLocation.y - droidlocation.y};
				const nextOffsetKey = grid.pointToKey(nextOffset);
				const nextDirection = offsetToDirection.get(nextOffsetKey)!;
				lastStatus = explore(nextDirection);
			}			
		}
		let lastStatus = null;
		while (!this.oxygenSystemLocation && adjacentUnknowns.length > 0)
			iterateSearch();

		// make sure the loop ended with the discovery of the oxygen system
		if (lastStatus !== Status.FoundOxygenSystem)
			throw new Error(`unexpected final discovery status: ${lastStatus}`);
		if (this.oxygenSystemLocation === null)
			throw new Error('oxygenSystemLocation not set!');

		// save a continuation function for completing the ship discovery (needed for part 2)
		this.finishShipDiscovery = () =>
		{
			while (adjacentUnknowns.length > 0)
				iterateSearch();
		}
	}

	finishShipDiscovery: (() => void) | undefined;

	getPathToOxygenSystem() : grid.Point[]
	{
		this.discoverOxygenSystem();

		if (this.oxygenSystemLocation === null)
			throw new Error('oxygen system not discovered!');

		const startKey = grid.pointToKey({x: 0, y: 0});
		const goalKey = grid.pointToKey(this.oxygenSystemLocation);
		let route = new Graph(this.shipGraph as any).path(startKey, goalKey, {trim: true}) as string[] | null || [];
		route.push(goalKey);

		return route.map(grid.keyToPoint);
	}

	logShip() : void
	{
		const bounds = this.shipGrid.getBounds()!;
		for (let y = bounds.top; y <= bounds.bottom; y++)
		{
			let line = '';
			for (let x = bounds.left; x <= bounds.right; x++)
			{
				const cell = this.shipGrid.getCell({x,y});
				if (x === 0 && y === 0)
					line += 'X';
				else
					switch (cell)
					{
						case CellType.Wall: line += '#'; break;
						case CellType.Open: line += '.'; break;
						case CellType.OxygenSystem: line += 'O'; break;
						default: line += ' '; break;
					}
			}
			console.log(line);
		}
	}

	getMinutesToOxygenFill() : number
	{
		this.finishShipDiscovery!();
		
		const visited: Set<grid.PointKey> = new Set();
		let frontier: grid.PointKey[] = []

		const spread: (key: grid.PointKey) => void = (key) =>
		{
			visited.add(key);
			for (let neighbor of this.shipGraph.get(key)!.keys())
				if (!visited.has(neighbor))
					frontier.push(neighbor);
		};

		spread(grid.pointToKey(this.oxygenSystemLocation!));

		let minutes = 0;
		for (; frontier.length > 0; minutes++)
		{
			const priorFrontier = frontier;
			frontier = [];
			for (let neighbor of priorFrontier)
				spread(neighbor);
		}

		return minutes;
	}
}

function runTests()
{
	let checkGraphIndex = -1;

	function testGraphPath(graph: any, start: string, goal: string, expectedCost: number | null, expectedPath: string[] | null)
	{
		++checkGraphIndex;
		const g = new Graph(graph);
		const result = g.path(start, goal, {cost: true}) as {cost: number, path: string[]};
		const pass =
			expectedPath === null
				? (result.path === null)
				: (
					result.cost === expectedCost
					&& result.path !== null
					&& result.path.length === expectedPath.length
					&& result.path.join('-') === expectedPath.join('-')
				);

		assert(pass, `graph check index ${checkGraphIndex} failed`);
	}

	testGraphPath(
		{
			a: { b: 17 },
			b: {}
		},
		'a', 'b',
		17,
		['a','b']
	);

	testGraphPath(
		{
			a: { b: 17 },
			b: {}
		},
		'b', 'a',
		null,
		null
	);
}
