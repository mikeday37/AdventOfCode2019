import { assert, exception } from 'console';
import * as manager from '../../lib/dayManager.js';

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

*/

(function(){
	manager.day(14, 'Space Stoichiometry',
	[
		202617
	],
	(api) =>
	{
		checkExamples();

		const reactionList = api.time('read and parse', () => parseReactionList(api.readInput()));

		let factory: NanoFactory;
		api.doPart(1, () => {
			const result = simulateToSatisfyRequirement(1, FUEL, reactionList);
			factory = result.resultingFactory;
			return result.minimumOreRequired;
		});
	});
})();

type Chemical = string;

const ORE: Chemical = 'ORE';
const FUEL: Chemical = 'FUEL';

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

interface RequiredAvailable {
	required: number;
	available: number;
}

/** represents a simulated NanoFactory for a particular reaction list */
class NanoFactory
{
	private reactionList: ReactionList;
	private chemicals: Map<Chemical, RequiredAvailable> = new Map();

	/** creates a NanoFactory for the given ReactionList */
	constructor(reactionList: ReactionList)
	{
		this.reactionList = reactionList;
		for (let chemical of [ORE, ...reactionList.byOutputChemical.keys()])
			this.chemicals.set(chemical, {required: 0, available: 0});
	}

	/** adds to the required amount for the given chemical */
	addRequirement(quantity: number, chemical: Chemical) : void
	{
		if (quantity < 0)
			throw new Error("cannot add negative requirement");
		if (quantity < 1)
			return;

		this.manipulate(chemical, x => x.required += quantity);
	}

	/** manipulates the entry for the given chemical */
	private manipulate(chemical: Chemical, action: (entry: RequiredAvailable) => void) : void
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
		if (entry.required < 0 || entry.available < 0)
			throw new Error(`simulation for chemical ${chemical} went negative: required = ${entry.required}, available = ${entry.available}`);
	}

	/** simulates performing the reaction for the given outputChemical, for the given number of iterations */
	private simulateReaction(outputChemical: Chemical, iterations: number) : void
	{
		if (iterations < 0)
			throw new Error('cannot simulate a negative number of iterations');
		if (iterations < 1)
			return;

		// get the reaction to produce the output
		const reaction = this.reactionList.byOutputChemical.get(outputChemical);
		if (reaction === undefined)
			throw new Error(`factory cannot produce chemical: ${outputChemical}`);

		// for each input chemical: add the input quantity times iterations to the requirement
		for (const input of reaction.inputs)
			this.manipulate(input.chemical, x => x.required += input.quantity * iterations);

		// add output quantity times iterations to the output chemical's availability
		this.manipulate(outputChemical, x => x.available += reaction.output.quantity * iterations);
	}

	/**
	 * repeatedly simulates required reactions until only the given targetMinimalInput chemical is still required,
	 * while attempting to minimize the required amount of that chemical.
	 */
	simulateRequiredReactionsForMinimalInput(targetMinimalInput: Chemical) : void
	{
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
	}

	/** returns true if and only if there is eactly one chemical with a positive requirement, and that chemical is the given */
	chemicalIsSoleRequirement(requiredChemical: Chemical) : boolean
	{
		const nonZeroRequirements = [...this.chemicals.entries()].filter(x => x[1].required > 0);
		return nonZeroRequirements.length === 1 && nonZeroRequirements[0][0] === requiredChemical;
	}

	/** returns the currently required amount for the given chemical, minus the amount made available by simulated reactions */
	getRequiredAmount(chemical: Chemical) : number
	{
		let returnValue : number;
		this.manipulate(chemical, x => returnValue = x.required - x.available);
		return returnValue!;
	}
}

function simulateToSatisfyRequirement(quantity: number, chemical: Chemical, reactionList: ReactionList) : {minimumOreRequired: number, resultingFactory: NanoFactory}
{
	const factory = new NanoFactory(reactionList);
	factory.addRequirement(quantity, chemical);
	factory.simulateRequiredReactionsForMinimalInput(ORE);
	return {
		minimumOreRequired: factory.getRequiredAmount(ORE),
		resultingFactory: factory
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
		const result = simulateToSatisfyRequirement(1, FUEL, reactionList);
		assert(result.minimumOreRequired === example[0], `part 1 example mismatch: expected = ${example[0]}, result = ${result}`);

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