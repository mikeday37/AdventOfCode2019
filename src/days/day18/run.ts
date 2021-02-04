import { assert, exception } from 'console';
import * as manager from '../../lib/dayManager.js';
import * as grid from '../../lib/grid.js';
import Graph from 'node-dijkstra';

(function(){
	manager.day(18, 'Many-Worlds Interpretation',
	[
	],
	(api) =>
	{
		const rawInput = api.time('read input', () => api.readInput());

		runTests();

		//api.doPart(1, () => collectAllKeysWithMinimalSteps(rawInput).steps);
	});
}());

const {lowerLetters, upperLetters, changeLetterCase} = (function(){
	const lowers = 'abcdefghijklmnopqrstuvwxyz';
	const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const lowerLetters = new Set([...lowers]);
	const upperLetters = new Set([...uppers]);
	const changeCaseMap: Map<string, string> = new Map();
	for (let i = 0; i < lowers.length; i++)
	{
		changeCaseMap.set(lowers[i], uppers[i]);
		changeCaseMap.set(uppers[i], lowers[i]);
	}
	const changeLetterCase: (letter: string) => string = letter => {
		if (!changeCaseMap.has(letter))
			throw new Error(`not a letter: ${letter}`);
		return changeCaseMap.get(letter)!;
	};
	return {lowerLetters, upperLetters, changeLetterCase};
}());

enum Direction {
	North = 0,
	East = 1,
	South = 2,
	West = 3
}

const allDirections: Direction[] = [
	Direction.North,
	Direction.East,
	Direction.South,
	Direction.West
];

const directionToOffset: Map<Direction, grid.Point> = new Map([
	[Direction.North, {x: 0, y: -1}],
	[Direction.East, {x: 1, y: 0}],
	[Direction.South, {x: 0, y: 1}],
	[Direction.West, {x: -1, y: 0}],
]);

const offsetToDirection: Map<grid.PointKey, Direction> = new Map(
	[...directionToOffset].map(x => [grid.pointToKey(x[1]), x[0]])
);

enum POIType {
	Start = 1,
	Key = 2,
	Door = 3,
	Branching = 4,
	Tunnel = 5,
	DeadEnd = 6
}

const allPOITypes: POIType[] = [
	POIType.Start,
	POIType.Key,
	POIType.Door,
	POIType.Branching,
	POIType.Tunnel,
	POIType.DeadEnd
];

interface PointOfInterest {
	type: POIType;
	letter: string;
	point: grid.Point;
	pointKey: grid.PointKey;
	openDirections: Direction[];
}

class VaultGraphWrapper {

	vault: string[];
	nodes: grid.DynamicGrid<PointOfInterest> = new grid.DynamicGrid();
	edges: Map<grid.PointKey, Map<grid.PointKey, number>> = new Map();
	poiByType: Map<POIType, PointOfInterest[]> = new Map();
	startPOI: PointOfInterest;

	constructor(rawVaultInput: string)
	{
		// parse the vault
		this.vault = rawVaultInput.trim().split(/\r?\n/).map(x => x.trim());

		/**
		 * Approach:
		 * 
		 * Start, keys, and doors are all considered "open" in that you can go to that location and
		 * pass through it.  Only walls are impassable.
		 * 
		 * Make a weighted graph of all "points of interest" with as few nodes/edges as possible.
		 * Each point of interest is one of the following:
		 *   Start
		 *   Key
		 *   Door
		 *   Branching Cell (open cell that connects to 3 or 4 orthogonally adjacent open cell)
		 * Connecting these are:
		 *   Tunnel Cell (open cell that connects to exactly 2 orthogonally adjacent open cell)
		 *   Dead End (open cell that connects to exactly 1 orthogonally adjacent open cell)
		 *   
		 * Populate the grid in phases by type as listed above.
		 * Maximally connect adjacent cells as you add them, until you get to Tunnel cells.
		 * When adding Tunnel Cells, collapse all consecutive Tunnel Cells into a single edge
		 * connecting both ends of the tunnel.
		 * When adding dead-end cells, delete the entire tunnel that connects it.
		 * 
		 * The weight of each edge is simply the number of steps required to pass through it
		 * (always 1, except in the case of collapsed tunnels)
		 * 
		 * The result is a minimal graph that contains everything we need.  This will leave
		 * the path finding algorithm with fewer cells to work with and make it faster.
		 */

		// identify and collect all points of interest by type
		for (let t of allPOITypes)
			this.poiByType.set(t, []);
		for (let y = 1; y < this.vault.length - 1; y++)
			for (let x = 1; x < this.vault[0].length - 1; x++)
			{
				if (this.vault[y][x] === '#')
					continue;

				const poi = this.detectPOI(x, y);
				this.poiByType.get(poi.type)!.push(poi);
			}

		// add all poi in type order
		for (let t of allPOITypes)
			for (let poi of this.poiByType.get(t)!)
				this.addPOI(poi);

		// set start
		this.startPOI = this.poiByType.get(POIType.Start)![0];
	}

	private detectPOI(x: number, y: number) : PointOfInterest
	{
		// save letter at x,y
		const letter = this.vault[y][x];
	
		// determine which directions are open
		const openDirections = allDirections.filter(d => {
			const offset = directionToOffset.get(d)!;
			return '#' !== this.vault[y + offset.y][x + offset.x];
		});
	
		// determine type
		let type: POIType | undefined;
		switch (letter)
		{
			case '@': type = POIType.Start; break;
			case '.': switch (openDirections.length) {
				case 0: throw new Error(`zero open directions found on open cell at ${x},${y}`);
				case 1: type = POIType.DeadEnd; break;
				case 2: type = POIType.Tunnel; break;
				default: type = POIType.Branching; break;
			}
			default:
				if (lowerLetters.has(letter))
					type = POIType.Key;
				else if (upperLetters.has(letter))
					type = POIType.Door;
				break;
		}
		if (type === undefined)
			throw new Error(`unknown cell type '${letter}' at ${x},${y}`);
	
		// return poi object
		const point = {x, y};
		return {
			type,
			letter,
			point,
			pointKey: grid.pointToKey(point),
			openDirections
		};
	}

	private addPOI(poi: PointOfInterest)
	{
		this.nodes.setCell(poi.point, poi);

		if (poi.type === POIType.Tunnel)
			this.extendTunnel(poi);
		else if (poi.type === POIType.DeadEnd)
			this.deleteDeadEnd(poi);
		else
			this.addRegularNode(poi);
	}

	private link(a: grid.Point, b: grid.Point)
	{
		const [aKey, bKey] = [a,b].map(grid.pointToKey);
		this.edges.get(aKey)!.set(bKey, 1);
		this.edges.get(bKey)!.set(aKey, 1);
	}

	private addRegularNode(poi: PointOfInterest)
	{
		this.edges.set(poi.pointKey, new Map());

		for (let d of poi.openDirections)
		{
			const offset = directionToOffset.get(d)!;
			const neighborPoint = {x: poi.point.x + offset.x, y: poi.point.y + offset.y};
			if (this.nodes.hasCell(neighborPoint))
				this.link(poi.point, neighborPoint);
		}
	}

	private extendTunnel(poi: PointOfInterest)
	{
		this.addRegularNode(poi);

		for (let d of poi.openDirections)
		{
			const offset = directionToOffset.get(d)!;
			const neighborPoint = {x: poi.point.x + offset.x, y: poi.point.y + offset.y};
			this.collapseIfDoubleConnectedTunnel(neighborPoint);
		}

		this.collapseIfDoubleConnectedTunnel(poi.point);
	}

	private collapseIfDoubleConnectedTunnel(point: grid.Point)
	{
		const middlePoi = this.nodes.getCell(point);
		if (middlePoi === undefined || middlePoi.type !== POIType.Tunnel)
			return;
		const edges = this.edges.get(middlePoi.pointKey)!;
		if (edges.size !== 2)
			return;
		const [aEdge, bEdge] = [...edges.entries()];
		const newWeight = aEdge[1] + bEdge[1];
		const [aEdges, bEdges] = [aEdge, bEdge].map(x => this.edges.get(x[0])!);
		[aEdges, bEdges].forEach(x => x.delete(middlePoi.pointKey));
		if (aEdges.has(bEdge[0]) || bEdges.has(aEdge[0]))
			throw new Error('vault contains multiple tunnels from a to b');
		aEdges.set(bEdge[0], newWeight);
		bEdges.set(aEdge[0], newWeight);
		this.edges.delete(middlePoi.pointKey);
	}

	private deleteDeadEnd(poi: PointOfInterest)
	{
		this.addRegularNode(poi);
		const tunnelPoint = grid.keyToPoint([...this.edges.get(poi.pointKey)!.entries()][0][0]);
		this.collapseIfDoubleConnectedTunnel(tunnelPoint);
		const connectionKey = [...this.edges.get(poi.pointKey)!.entries()][0][0];
		this.edges.get(connectionKey)!.delete(poi.pointKey);
		this.edges.delete(poi.pointKey);
	}
}

interface CollectionState {
	steps: number;
	keySequence: string[];
	keysCollected: Set<string>;
	locationPointKey: grid.PointKey;
}

function collectAllKeysWithMinimalSteps(rawInput: string) : CollectionState
{
	// wrap the vault as a minimal graph
	const wrapper = new VaultGraphWrapper(rawInput);

	// get all key and door letters, and the start pointkey
	const allKeys = wrapper.poiByType.get(POIType.Key)!.map(x => x.letter).sort();
	const allDoors = wrapper.poiByType.get(POIType.Door)!.map(x => x.letter).sort();
	const startPointKey = wrapper.poiByType.get(POIType.Start)![0].pointKey;

	// get a map of key letter to pointKey
	const keyLetterToPointKey: Map<string, grid.PointKey> = new Map(
		wrapper.poiByType.get(POIType.Key)!.map(x => [x.letter, x.pointKey])
	);

	// get a map of key letter to door pointKey
	const keyLetterToDoorPointKey: Map<string, grid.PointKey> = new Map(
		wrapper.poiByType.get(POIType.Door)!.map(x => [changeLetterCase(x.letter), x.pointKey])
	);

	// start the backtracking stack with initial state
	const backStack: CollectionState[] = [{steps: 0, keySequence: [], keysCollected: new Set(), locationPointKey: startPointKey}];

	// trying to find the best state
	let bestState: CollectionState | undefined;

	// convert wrapped edges to graph
	const graph = new Graph(wrapper.edges as any);

	// continue until there's no more to backtrack to
	while (backStack.length > 0)
	{
		// pop the latest backtrack state
		const state = backStack.pop()!;

		// if the key sequence length matches the # of keys, then store best and continue
		if (state.keySequence.length === allKeys.length)
		{
			if (bestState === undefined || bestState.steps > state.steps)
				bestState = state;
			continue;
		}

		// determine keys still to collect and locked door locations to avoid
		const keysStillToCollect = allKeys.filter(x => !state.keysCollected.has(x));
		let avoid: string[] | undefined = keysStillToCollect.map(x => keyLetterToDoorPointKey.get(x)).filter(x => x !== undefined) as string[];
		if (avoid !== undefined && avoid.length < 1)
			avoid = undefined;

		// otherwise, for each key not yet collected
		for (let k of keysStillToCollect)
		{
			// try to get a path to the key
			const targetPointKey = keyLetterToPointKey.get(k)!;
			//console.log(`${state.keySequence.join(',')} -> ${k} @ ${targetPointKey} -- avoid: ${avoid?.join(',') ?? '[]'}`);
			const route = graph.path(state.locationPointKey, targetPointKey, {
					trim: true,
					cost: true,
					avoid
				}) as { path: string[] | null, cost: number };
			
			// if we got a path, add to stack as new state
			if (route.path !== null)
			{
				const keySequence = [...state.keySequence, k];
				backStack.push({
					steps: state.steps + route.cost,
					keySequence,
					keysCollected: new Set(keySequence),
					locationPointKey: targetPointKey
				});
			}
		}
	}

	// return the best state
	return bestState!;
}

function runTests()
{
	let allPassed = true;
	let part1ExampleNum = 0;
	function test1(expectedSteps: number, rawInput: string)
	{
		// console.log('------------------');
		++part1ExampleNum;
		const {steps, keySequence} = collectAllKeysWithMinimalSteps(rawInput);
		const pass = steps === expectedSteps;
		assert(pass, `part 1 example # ${part1ExampleNum} failed: steps = ${steps}, expected = ${expectedSteps}`);
		if (!pass)
			allPassed = false;
	}

	test1(8, `
		#########
		#b.A.@.a#
		#########`);

	test1(86, `
		########################
		#f.D.E.e.C.b.A.@.a.B.c.#
		######################.#
		#d.....................#
		########################`);

	test1(132, `
		########################
		#...............b.C.D.f#
		#.######################
		#.....@.a.B.c.d.A.e.F.g#
		########################`);

	/*test1(136, `
		#################
		#i.G..c...e..H.p#
		########.########
		#j.A..b...f..D.o#
		########@########
		#k.E..a...g..B.n#
		########.########
		#l.F..d...h..C.m#
		#################`);*/

	test1(81, `
		########################
		#@..............ac.GI.b#
		###d#e#f################
		###A#B#C################
		###g#h#i################
		########################`);

	if (allPassed)
		console.log(`all ${part1ExampleNum} part 1 tests passed.`);
}