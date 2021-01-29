import { assert, exception } from 'console';
import * as manager from '../../lib/dayManager.js';
import { Rational } from '../../lib/rational.js';

/*

Input:
	Each line = 1 Reaction
	Reaction = 1..Many Inputs => 1 Output
	Each Input/Output is a Chemical and a Quantity

Notes:
	Each Chemical is produced by Exactly 1 Reaction
		SOLE EXCEPTION:
			the "ORE" chemical
				is not produced by any reaction, and
				is the sole initial input to entire process
					(which may have several ore-consuming reactions)

	Whenever a reaction is used, it has to be used completely,
	not fractionally.  Each can be used zero to many times.
		The input and output amounts will always be whole integer amounts.

	It is OK to have left over Chemicals after producing 1 FUEL.

Part 1:
	What is the minimum ORE required to produce exactly 1 FUEL?

Part 2:
	Given 1 trillion avaiable ORE, what's the max FUEL you can produce?

*/

type Chemical = string;
const ORE: Chemical = 'ORE';
const FUEL: Chemical = 'FUEL';
const ONE_TRILLION = 1000000000000;

(function(){
	manager.day(14, 'Space Stoichiometry',
	[
		202617,
		7863863
	],
	(api) =>
	{
		checkExamples();

		const reactionList = api.time('read and parse', () => parseReactionList(api.readInput()));

		api.doPart(1, () => simulateToSatisfyRequirement(1, FUEL, reactionList).minimumOreRequired);
		api.doPart(2, () => simulateToConsumeAvailable(ONE_TRILLION, ORE, reactionList).fuelGenerated);
	});
})();


interface ChemicalQuantity {
	quantity: number,
	chemical: Chemical
}

interface Reaction {
	output: ChemicalQuantity,
	inputs: ChemicalQuantity[]
}

interface ReactionList {
	reactions: Reaction[];
	byOutputChemical: Map<Chemical, Reaction>;
}

function parseReactionList(rawReactionList: string) : ReactionList
{
	let reactions: Reaction[] = [];
	let byOutputChemical: Map<Chemical, Reaction> = new Map();

	for (const line of rawReactionList.split(/\r?\n/).map(x => x.trim()).filter(x => x.length > 0))
	{
		const reaction = parseReaction(line);
		reactions.push(reaction);

		const outputChem = reaction.output.chemical;
		if (byOutputChemical.has(outputChem))
			throw new Error(`output chemical ${outputChem} not unique in reaction list!`);
		else
			byOutputChemical.set(outputChem, reaction);
	}

	return {reactions, byOutputChemical};
}

function parseReaction(rawReaction: string) : Reaction
{
	const parts = rawReaction.split(' => ');

	const rawOutput = parts[1];
	const rawInputs = parts[0].split(', ');

	return {
		output: parseChemicalQuantity(rawOutput),
		inputs: rawInputs.map(parseChemicalQuantity)
	};

	function parseChemicalQuantity(rawChemicalQuantity: string) : ChemicalQuantity
	{
		const parts2 = rawChemicalQuantity.split(' ');

		return {
			chemical: parts2[1],
			quantity: parseInt(parts2[0])
		}
	}
}

interface ChemicalTracker {
	required: number;
	available: number;
	tier: number | null;
	trickleReactionCount: number; // during forward simulation, these are the last-minute reaction iterations simulated to prevent running out of required inputs
}

interface ReactionSequenceEntry {
	outputChemical: Chemical;
	iterations: number
}

/** represents a simulated NanoFactory for a particular reaction list */
class NanoFactory
{
	private reactionList: ReactionList;
	private chemicals: Map<Chemical, ChemicalTracker> = new Map();
	private totalReactionCount: number = 0;

	/** creates a NanoFactory for the given ReactionList */
	constructor(reactionList: ReactionList)
	{
		this.reactionList = reactionList;
		for (let chemical of [ORE, ...reactionList.byOutputChemical.keys()])
			this.chemicals.set(chemical, {required: 0, available: 0, tier: null, trickleReactionCount: 0});

		const fuelReactionOutputQuantity = this.reactionList.byOutputChemical.get(FUEL)!.output.quantity;
		if (fuelReactionOutputQuantity !== 1)
			throw new Error(`output quantity of FUEL reaction is expected to be 1!  actual output quantity of FUEL is: ${fuelReactionOutputQuantity}`);
	}

	/** adds to the required amount for the given chemical */
	addRequirement(quantity: number, chemical: Chemical) : void
	{
		if (quantity < 0)
			throw new Error("cannot add negative requirement");
		if (quantity < 1)
			return;

		this.accessChemical(chemical, x => x.required += quantity);
	}

	/** adds to the available amount for the given chemical */
	addAvailable(quantity: number, chemical: Chemical) : void
	{
		if (quantity < 0)
			throw new Error("cannot add negative available");
		if (quantity < 1)
			return;

		this.accessChemical(chemical, x => x.available += quantity);
	}

	/** performs an action on the entry for the given chemical */
	private accessChemical(chemical: Chemical, action: (entry: ChemicalTracker) => void, enforceNonNegativeAvailability: boolean = true) : void
	{
		// get the entry
		const entry = this.chemicals.get(chemical);
		if (entry === undefined)
			throw new Error(`factory cannot manipulate chemical: ${chemical}`);

		// perform the action on it
		action(entry);

		// directly satisfy as much requirement as currently possible
		if (entry.required > 0 && entry.available > 0)
		{
			const transfer = Math.min(entry.required, entry.available);
			entry.required -= transfer;
			entry.available -= transfer;
		}

		// fail if either required or available are ever negative
		if (entry.required < 0 || (enforceNonNegativeAvailability && entry.available < 0))
			throw new Error(`simulation for chemical ${chemical} went negative: required = ${entry.required}, available = ${entry.available}`);
	}

	/** simulates performing the reaction for the given outputChemical, for the given number of iterations */
	private simulateReaction(outputChemical: Chemical, iterations: number, reverse: boolean = true, strict: boolean = false) : void
	{
		if (iterations < 0)
			throw new Error('cannot simulate a negative number of iterations');
		if (iterations < 1)
			return;

		// get the reaction to produce the output
		const reaction = this.reactionList.byOutputChemical.get(outputChemical);
		if (reaction === undefined)
			throw new Error(`factory cannot produce chemical: ${outputChemical}`);

		// for each input chemical, if going in reverse, add the input quantity times iterations to the requirement
		for (const input of reaction.inputs)
			if (reverse)
				this.accessChemical(input.chemical, x => x.required += input.quantity * iterations);
			else
			{
				// otherwise, first compare required versus avaible, and trickle more of the required if necessary,
				// to prevent going negative (which would render the simulation invalid)
				const required = input.quantity * iterations;
				let trickleCount = 0;
				if (!strict && input.chemical !== ORE) // can't produce more ORE
					for (; this.getStrictlyAvailableAmount(input.chemical) < required; trickleCount++)
						this.simulateReaction(input.chemical, 1, false);

				// then actually take what is required directly from what's available.
				// (and store the added trickleCount just for diagnostic purposes)
				this.accessChemical(input.chemical, x =>
					{
						x.available -= required;
						x.trickleReactionCount += trickleCount;
					},
					strict || input.chemical !== ORE // allow ORE to go temporarily negative
				);
			};

		// add output quantity times iterations to the output chemical's availability
		this.accessChemical(outputChemical, x => x.available += reaction.output.quantity * iterations);

		// increase total reaction count
		this.totalReactionCount += iterations;
	}

	/** returns true if and only if there is eactly one chemical with a positive requirement, and that chemical is the given */
	chemicalIsSoleRequirement(requiredChemical: Chemical) : boolean
	{
		const nonZeroRequirements = [...this.chemicals.entries()].filter(x => x[1].required > 0);
		return nonZeroRequirements.length === 1 && nonZeroRequirements[0][0] === requiredChemical;
	}

	/**
	 * repeatedly simulates required reactions until only the given targetMinimalInput chemical is still required,
	 * while attempting to minimize the required amount of that chemical.
	 */
	simulateRequiredReactionsForMinimalInput(targetMinimalInput: Chemical) : ReactionSequenceEntry[]
	{
		// keep track of our reaction sequence
		const reactionSequence: ReactionSequenceEntry[] = [];

		// we're about to enter a loop with a complex condition,
		// so make some helpers to simplify gauranteeing each loop iteration involves at least one simulated reaction
		let reactionCount = 0;
		function requireReactionsAndReset()
		{
			if (reactionCount === 0)
				throw new Error('infinite simulation loop detected');
			reactionCount = 0;
		}
		const factory = this;
		function simulateReaction(outputChemical: Chemical, iterations: number)
		{
			if (iterations < 0)
				throw new Error('attempted to simulate negative iterations of reaction in main simulation loop');
			reactionCount += iterations;
			factory.simulateReaction(outputChemical, iterations);

			// add this reaction in reverse order, since we're effectively simulating backwards from the target
			reactionSequence.unshift({outputChemical, iterations});
		}

		// loop until only the target chemical is required, with the above safety check at end of each loop
		for (; !this.chemicalIsSoleRequirement(targetMinimalInput); requireReactionsAndReset())
		{
			// loop through all positive requirements that aren't the target
			for (let requirementEntry of [...this.chemicals.entries()].filter(x => x[0] !== targetMinimalInput && x[1].required > 0))
			{
				// determine how many iterations are required to simulate the reaction to generate the requirement
				const requiredChemical = requirementEntry[0];
				const requiredAmount = requirementEntry[1].required;
				const reaction = this.reactionList.byOutputChemical.get(requiredChemical)!;
				const iterations = Math.ceil(requiredAmount / reaction.output.quantity);

				// use the safe helper to simulate those reactions
				simulateReaction(requiredChemical, iterations);
			}
		}

		return reactionSequence;
	}

	/** traverses all input paths from the given chemical "up" to its inputs, recursively.  defaults to shallow first. */
	private walkInputs(chemical: Chemical, action: (chemical: Chemical, depth: number) => void, depthFirst: boolean = false, depth: number = 0) : void
	{
		if (!depthFirst)
			action(chemical, depth);

		if (chemical !== ORE)
			for (let inputChemical of this.reactionList.byOutputChemical.get(chemical)!.inputs.map(x => x.chemical))
				this.walkInputs(inputChemical, action, depthFirst, depth + 1);

		if (depthFirst)
			action(chemical, depth);
	}	

	/**
	 * runs a simulation based on the available inputs (which must be added prior to call)
	 * to maximize fuel output.
	 */
	simulateReactionsToMaximizeFuelOutput()
	{
		// save initial ore quantity for double check at end
		const initialOreQuantity = this.getStrictlyAvailableAmount(ORE);

		// determine max depth of input graph
		let maxDepth = 0;
		this.walkInputs(FUEL, (_, depth) => maxDepth = Math.max(depth, maxDepth));

		// assign tier to each chemical = min(maxDepth - depth) over all depths at which it is reached
		this.walkInputs(FUEL, (chemical, depth) => 
			this.accessChemical(chemical, entry => 
				entry.tier = Math.min(maxDepth - depth, entry.tier ?? Infinity)
			)
		);

		// get tier-ordered list of chemical entries
		let tierOrderedChemicalEntries = [...this.chemicals.entries()].sort((a,b) => a[1].tier! - b[1].tier!);

		// for each reaction, determine the rational inputs required to produce one output,
		// and start building the productionRatios Map, initialized to FUEL = 1, all else 0.
		interface RationalInputQuantity {
			chemical: Chemical;
			quantity: Rational;
		}
		interface ChemInfoEntry {
			reaction: Reaction;
			unitProductionRequirements: RationalInputQuantity[];
		}
		const chemInfo: Map<Chemical, ChemInfoEntry> = new Map();
		const productionRatios: Map<Chemical, Rational> = new Map();
		for (let reaction of this.reactionList.reactions)
		{
			chemInfo.set(reaction.output.chemical, {
				reaction,
				unitProductionRequirements: reaction.inputs.map(input => ({
					chemical: input.chemical,
					quantity: new Rational(input.quantity, reaction.output.quantity),
				}))
			});
			productionRatios.set(reaction.output.chemical, new Rational(reaction.output.chemical === FUEL ? 1 : 0, 1))
		}
		productionRatios.set(ORE, new Rational(0, 1));

		// for each reaction in reverse tier order, add its unitProductionRequirements to the production ratios, multiplied by the chemicals current production ratio
		for (let outputChemical of [...tierOrderedChemicalEntries].reverse().map(x => x[0]).filter(x => x !== ORE))
			for (let i of chemInfo.get(outputChemical)!.unitProductionRequirements)
			{
				const inputRational = productionRatios.get(i.chemical)!;
				const addend = new Rational();
				addend.add(i.quantity)
				addend.multiply(productionRatios.get(outputChemical)!);
				inputRational.add(addend);
			}

		// see what the ideal fuel production would be
		const productionFactor = new Rational(this.getStrictlyAvailableAmount(ORE))
		productionFactor.divide(productionRatios.get(ORE)!);
		const idealFuelProduction = Math.floor(productionFactor.getNumber());

		// in tier order, perform all reactions at determined ratio * productionFactor iterations
		const iterationRecord: Map<Chemical, number> = new Map();
		for (let e of tierOrderedChemicalEntries)
		{
			if (e[0] == ORE) continue;
			const iterationRational = new Rational();
			iterationRational.add(productionFactor);
			iterationRational.multiply(productionRatios.get(e[0])!);
			iterationRational.divide(new Rational(chemInfo.get(e[0])!.reaction.output.quantity));
			const iterations = Math.floor(iterationRational.getNumber());
			iterationRecord.set(e[0], iterations);
			this.simulateReaction(e[0], iterations, false);
		}

		// get summary about state of all chemicals so far (for debugging purposes)
		const summaryPass1 = tierOrderedChemicalEntries
			.map(x => ({
				chem: x[0], 
				req: x[1].required, 
				avail: x[1].available, 
				tier: x[1].tier!, 
				prodIters: iterationRecord.get(x[0]) ?? 0,
				trickleIters: this.chemicals.get(x[0])?.trickleReactionCount ?? 0,
				outputFactor: this.reactionList.byOutputChemical.get(x[0])?.output?.quantity ?? 0
			}));

		// go through all chemicals except ORE and FUEL in reverse tier order
		const undidRecord: Map<Chemical, number> = new Map();
		for (let e of [...tierOrderedChemicalEntries].reverse().filter(x => x[0] !== ORE && x[0] !== FUEL)
			.map(x => ({chemical: x[0], tracker: x[1], reaction: this.reactionList.byOutputChemical.get(x[0])!})))
		{
			// skip any whose availability is less than its output reaction's output factor
			if (e.tracker.available < e.reaction.output.quantity)
				continue;

			// for the rest, calculate how many times we can safely undo the reaction
			const undoCount = Math.floor(e.tracker.available / e.reaction.output.quantity);
			if (undoCount < 1)
				throw new Error(`should be unreachable, we made sure there was enough available to undo at least one, but undoCount = ${undoCount}`);
			
			// undo the reaction that many times
			for (let input of e.reaction.inputs)
				this.accessChemical(input.chemical, x => x.available += input.quantity * undoCount, input.chemical !== ORE);
			this.accessChemical(e.reaction.output.chemical, x => x.available -= e.reaction.output.quantity * undoCount);

			// set undidAny flag and save the undo count
			undidRecord.set(e.chemical, undoCount);
		}

		// get summary about final state of all chemicals so far
		const summaryPass2 = tierOrderedChemicalEntries
			.map(x => ({
				chem: x[0], 
				req: x[1].required, 
				avail: x[1].available, 
				tier: x[1].tier!, 
				prodIters: iterationRecord.get(x[0]) ?? 0,
				trickleIters: this.chemicals.get(x[0])?.trickleReactionCount ?? 0,
				outputFactor: this.reactionList.byOutputChemical.get(x[0])?.output?.quantity ?? 0,
				undoCount: undidRecord.get(x[0]) ?? 0
			}));

		// make sure all chemicals now have zero required and non-negative availability
		this.verifyAllChemicalsHaveGoodFinalStatus();

		// calculate final reaction sequence
		const reactionSequence: ReactionSequenceEntry[] = summaryPass2.filter(x => x.chem !== ORE).map(x => ({
			outputChemical: x.chem,
			iterations: x.prodIters + x.trickleIters - x.undoCount
		}));

		// create a new factory and run through the sequence in strict mode
		const testFactory = new NanoFactory(this.reactionList);
		testFactory.addAvailable(initialOreQuantity, ORE);
		for (let s of reactionSequence)
			testFactory.simulateReaction(s.outputChemical, s.iterations, false, true) // forward & strict
		
		// verify the test factory as the same final ORE and FUEL amounts
		for (let chemical of [ORE, FUEL])
		{
			const originalFinalAmount = this.getStrictlyAvailableAmount(chemical);
			const testFinalAmount = testFactory.getStrictlyAvailableAmount(chemical);
			if (originalFinalAmount != testFinalAmount)
				throw new Error(`reaction sequence test mismatch on chemical ${chemical}: originalFinalAmount = ${originalFinalAmount}, testFinalAmount = ${testFinalAmount}`);
		}

		// re-verify all test factory chemical amounts are also zero required and non-negative availability
		testFactory.verifyAllChemicalsHaveGoodFinalStatus();

		return {summaryPass1, summaryPass2, reactionSequence};
	}

	verifyAllChemicalsHaveGoodFinalStatus() : void
	{
		// make sure all chemicals now have zero required and non-negative availability
		for (const e of this.chemicals.entries())
			if (e[1].required !== 0 || e[1].available < 0)
				throw new Error(`chemical ${e[0]} has invalid final state: required = ${e[1].required}, available = ${e[1].available}`);
	}

	/** returns the currently required amount for the given chemical, minus the amount made available by simulated reactions */
	getRequiredAmount(chemical: Chemical) : number
	{
		let returnValue : number;
		this.accessChemical(chemical, x => returnValue = x.required - x.available);
		return returnValue!;
	}

	/** returns the currently available amount of the given chemical, throwing if it has a non-zero requirement */
	getStrictlyAvailableAmount(chemical: Chemical) : number
	{
		let returnValue : number;
		this.accessChemical(chemical, x => {
			if (x.required !== 0)
				throw new Error(`getAvailableAmount is only intended to be used when required is zero.  chemical = ${chemical}, required = ${x.required}, available = ${x.available}`);
			returnValue = x.available;
		});
		return returnValue!;
	}
}

interface SatisfactionSimulationResult {
	minimumOreRequired: number,
	resultingFactory: NanoFactory,
	reactionSequence: ReactionSequenceEntry[]
}

function simulateToSatisfyRequirement(quantity: number, chemical: Chemical, reactionList: ReactionList) : SatisfactionSimulationResult
{
	const factory = new NanoFactory(reactionList);
	factory.addRequirement(quantity, chemical);
	const reactionSequence = factory.simulateRequiredReactionsForMinimalInput(ORE);
	return {
		minimumOreRequired: factory.getRequiredAmount(ORE),
		resultingFactory: factory,
		reactionSequence
	};
}

function simulateToConsumeAvailable(quantity: number, chemical: Chemical, reactionList: ReactionList)
	: {fuelGenerated: number, resultingFactory: NanoFactory}
{
	const factory = new NanoFactory(reactionList);
	factory.addAvailable(quantity, chemical);
	factory.simulateReactionsToMaximizeFuelOutput();
	return {
		fuelGenerated: factory.getStrictlyAvailableAmount(FUEL),
		resultingFactory: factory,
	};
}

type Example = [
	minimumOre: number,
	maxFuelGiven1TrillionOre: number | null,
	rawReactionList: string
];

function checkExamples()
{
	function checkExample(example: Example)
	{
		const reactionList = parseReactionList(example[2]);
		const part1result = simulateToSatisfyRequirement(1, FUEL, reactionList).minimumOreRequired;
		assert(part1result === example[0], `part 1 example mismatch: expected = ${example[0]}, result = ${part1result}`);
		if (example[1] !== null)
		{
			const part2result = simulateToConsumeAvailable(ONE_TRILLION, ORE, reactionList).fuelGenerated;
			assert(part2result === example[1], `part 2 example mismatch: expected = ${example[1]}, result = ${part2result}`);
		}
	}
	
	const examples: Example[] = [
		[
			31, null,
			`
			10 ORE => 10 A
			1 ORE => 1 B
			7 A, 1 B => 1 C
			7 A, 1 C => 1 D
			7 A, 1 D => 1 E
			7 A, 1 E => 1 FUEL
			`
		],[
			165, null,
			`
			9 ORE => 2 A
			8 ORE => 3 B
			7 ORE => 5 C
			3 A, 4 B => 1 AB
			5 B, 7 C => 1 BC
			4 C, 1 A => 1 CA
			2 AB, 3 BC, 4 CA => 1 FUEL
			`
		],[
			13312, 82892753,
			`
			157 ORE => 5 NZVS
			165 ORE => 6 DCFZ
			44 XJWVT, 5 KHKGT, 1 QDVJ, 29 NZVS, 9 GPVTF, 48 HKGWZ => 1 FUEL
			12 HKGWZ, 1 GPVTF, 8 PSHF => 9 QDVJ
			179 ORE => 7 PSHF
			177 ORE => 5 HKGWZ
			7 DCFZ, 7 PSHF => 2 XJWVT
			165 ORE => 2 GPVTF
			3 DCFZ, 7 NZVS, 5 HKGWZ, 10 PSHF => 8 KHKGT
			`
		],[
			180697, 5586022,
			`
			2 VPVL, 7 FWMGM, 2 CXFTF, 11 MNCFX => 1 STKFG
			17 NVRVD, 3 JNWZP => 8 VPVL
			53 STKFG, 6 MNCFX, 46 VJHF, 81 HVMC, 68 CXFTF, 25 GNMV => 1 FUEL
			22 VJHF, 37 MNCFX => 5 FWMGM
			139 ORE => 4 NVRVD
			144 ORE => 7 JNWZP
			5 MNCFX, 7 RFSQX, 2 FWMGM, 2 VPVL, 19 CXFTF => 3 HVMC
			5 VJHF, 7 MNCFX, 9 VPVL, 37 CXFTF => 6 GNMV
			145 ORE => 6 MNCFX
			1 NVRVD => 8 CXFTF
			1 VJHF, 6 MNCFX => 4 RFSQX
			176 ORE => 6 VJHF
			`
		],[
			2210736, 460664,
			`
			171 ORE => 8 CNZTR
			7 ZLQW, 3 BMBT, 9 XCVML, 26 XMNCP, 1 WPTQ, 2 MZWV, 1 RJRHP => 4 PLWSL
			114 ORE => 4 BHXH
			14 VRPVC => 6 BMBT
			6 BHXH, 18 KTJDG, 12 WPTQ, 7 PLWSL, 31 FHTLT, 37 ZDVW => 1 FUEL
			6 WPTQ, 2 BMBT, 8 ZLQW, 18 KTJDG, 1 XMNCP, 6 MZWV, 1 RJRHP => 6 FHTLT
			15 XDBXC, 2 LTCX, 1 VRPVC => 6 ZLQW
			13 WPTQ, 10 LTCX, 3 RJRHP, 14 XMNCP, 2 MZWV, 1 ZLQW => 1 ZDVW
			5 BMBT => 4 WPTQ
			189 ORE => 9 KTJDG
			1 MZWV, 17 XDBXC, 3 XCVML => 2 XMNCP
			12 VRPVC, 27 CNZTR => 2 XDBXC
			15 KTJDG, 12 BHXH => 5 XCVML
			3 BHXH, 2 VRPVC => 7 MZWV
			121 ORE => 7 VRPVC
			7 XCVML => 6 RJRHP
			5 BHXH, 4 VRPVC => 5 LTCX
			`
		]
	];

	for (let example of examples)
		checkExample(example);
}