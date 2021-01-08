

const { assert } = require('console');
const { readdirSync } = require('fs');
const { cwd } = require('process');
const common = require('./common.js');

common.__getResultsTracker().runFast = true;

const maxDay = readdirSync(cwd(), {withFileTypes: true})
	.filter(entry => entry.isDirectory() && entry.name.match(/Day\d+/))
	.length;
for (let day = 1; day <= maxDay; day++)
{
	preDay(day);
	let dir = `./Day${String(day).padStart(2, '0')}/`
	process.chdir(dir);
	let path = `${dir}run.js`;
	require(path);
	process.chdir('../');
}

postAll();

function preDay(day)
{
	console.log(`\n\n====================== Day ${day} ======================\n`);
}

function postAll()
{
	console.log(`\n\n===================================================\n\nResults:`);

	const t = common.__getResultsTracker();

	// determine whether each day-part answer is CORRECT, WRONG, new, or N/A (only day 25 part 2 is N/A)
	const classifications = [
		'    new    ',
		'  CORRECT  ',
		'!! WRONG !!'
	];
	function classify(day, part)
	{
		if (day === 25 && part === 2)
			return null; // n/a
		else
		{
			const d = t.days.get(day);
			const [answer, expected] = [d.answers[part-1], d.expectedAnswers[part-1]];
			if (expected === null)
				return classifications[0];
			else
				return classifications[answer == expected ? 1 : 2]; // intentional ==
		}
	}
	const results = new Map();
	for (let day = 1; day <= maxDay; day++)
		for (let part = 1; part <= 2; part++)
			results.set(`${day}-${part}`, classify(day, part));

	// log it in a table
	console.log('\t           Part 1:         Part 2:');
	console.log('\t         +---------------+---------------+');
	for (let day = 1; day <= maxDay; day++)
		console.log(`\tDay ${String(day).padStart(2,'0')}   |  ${results.get(`${day}-1`)}  |  ${results.get(`${day}-2`) || '   (n/a)   '}  |   ${t.days.get(day).dayName}`);
	console.log('\t         +---------------+---------------+');

	// tally the classifications
	const tally = new Map();
	let totalRelevant = 0;
	for (let c of classifications)
		tally.set(c, 0);
	results.forEach(v => {
		if (v !== null)
		{
			++totalRelevant;
			tally.set(v, 1 + tally.get(v));
		}
	});

	// log the tally
	console.log('\nSummary:');
	const allCorrect = tally.get(classifications[1]) === totalRelevant;
	assert(allCorrect, 'at least one day-part is incorrect or new!');
	if (allCorrect)
		console.log('\t-- ALL CORRECT --')
	else
		for (let c of classifications)
		{
			let n = tally.get(c);
			if (n === 0)
				continue;
			console.log(`\t${c} = ${n}`);
		}
}