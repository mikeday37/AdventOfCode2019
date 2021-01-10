'use strict';
const { assert } = require('console');
const { readdirSync } = require('fs');
const { cwd, chdir } = require('process');
const common = require('./common.js');

(function(){

	// remember where we started
	const startDir = cwd();

	// determine the last day started/completed
	const maxDay = readdirSync(startDir, {withFileTypes: true})
		.filter(entry => entry.isDirectory() && entry.name.match(/Day\d+/))
		.length;
	
	// get the results tracker
	const resultsTracker = common.__getResultsTracker();

	// since we're doing all days, we're mainly interested in verifying correctness,
	// not thorough benchmarking, so lets set the runFast flag to speed through it
	resultsTracker.runFast = true;

	// run each day
	for (let day = 1; day <= maxDay; day++)
	{
		// log a separator for the day
		console.log(`\n\n====================== Day ${day} ======================\n`);

		// change to the day's directory
		let dir = `./Day${String(day).padStart(2, '0')}/`
		chdir(dir);

		// require the day's script to run it
		let path = `${dir}run.js`;
		require(path);

		// change dir back to where we started
		chdir(startDir);
	}

	// log a separator for the results
	console.log(`\n\n===================================================\n\nResults:`);

	// setup the day-part classifications we care about:
	const classifications = [
		'    new    ',  // new means I don't yet know the official answer for my input
		'  CORRECT  ',  // the official answer is known and the just-ran results match
		'!! WRONG !!'   // the official answer is known but the results do not match
	];

	// function to classify a day-part's result
	function classify(day, part)
	{
		if (day === 25 && part === 2)
			return null; // n/a
		else
		{
			const d = resultsTracker.days.get(day);
			const [answer, expected] = [d.answers[part-1], d.expectedAnswers[part-1]];
			if (expected === null)
				return classifications[0];
			else
				return classifications[answer == expected ? 1 : 2]; // intentional ==
		}
	}

	// classify all results in a map: 'day-part' -> classification
	const results = new Map();
	for (let day = 1; day <= maxDay; day++)
		for (let part = 1; part <= 2; part++)
			results.set(`${day}-${part}`, classify(day, part));

	// log it in a table
	console.log('\t           Part 1:         Part 2:');
	console.log('\t         +---------------+---------------+');
	for (let day = 1; day <= maxDay; day++)
		console.log(`\tDay ${String(day).padStart(2,'0')}   |  ${results.get(`${day}-1`)}  |  ${results.get(`${day}-2`) || '   (n/a)   '}  |   ${resultsTracker.days.get(day).dayName}`);
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

	// log the tally, assert if not all correct for high visibility
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
})();
