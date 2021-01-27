import { assert } from 'console';
import { readdirSync, existsSync } from 'fs';
import { cwd, chdir } from 'process';
import * as path from 'path';
import * as common from './lib/common.js';
import * as manager from './lib/dayManager.js';


// main entry point
(async function(){
	try
	{
		await runAsRequested();
	}
	catch (err)
	{
		console.error(`exception caught by main entry point:\n${err.message}\n\nstack:\n${err.stack}`);
		process.exit(99);
	}
})();

async function runAsRequested()
{
	// get the root dir of the project
	const projectRootDir = path.normalize(path.parse(path.resolve(process.argv[1])).dir);

	// make sure we are running from that dir
	assert(projectRootDir === cwd(), `not running in expected projectRootDir: ${projectRootDir}\nwill chdir() to it.`);
	chdir(projectRootDir);

	// path to folder containing day subfolders
	const daysDir = path.normalize(path.resolve(projectRootDir, 'ts-out', 'days'));

	// regex for expected directory names for each day:
	const daySubDirRegex = /day\d+/;

	/* determine if we're running a single day (and which) or all, via:

		process.argv - array with our arguments and additional info:
		[0] = node.exe
		[1] = entry point script: index.js
		[2] = first real argument passed to the entry point -- in our case, usually the current day's run.js

		each of these are full paths, it seems.
	*/
	let singleDayNum = null;
	let runSingle = (() =>
	{
		// not doing single if no argv index 2 exists
		if (process.argv.length < 3)
			return false;

		// if argv[2] is an integer, then we're running manually and that's the explicit day
		if (String(parseInt(process.argv[2], 10)) === process.argv[2] && !isNaN(parseInt(process.argv[2])))
		{
			singleDayNum = Number(process.argv[2]);
			return true;
		}

		// see if the filename of the argument is run.js, if not, we're not doing single
		const arg2Parts = path.parse(path.resolve(process.argv[2]));
		if (!(arg2Parts.base === 'run.js' || arg2Parts.base === 'run.ts'))
			return false;

		// see if the argument path is in a direct Day## dir of days dir, if not we're not doing single
		const arg2DirParts = path.parse(arg2Parts.dir);
		const arg2DaysDir = path.normalize(arg2DirParts.dir);
		const arg2DaysDirParts = common.splitPath(arg2DaysDir);
		const runningDaysDirParts = common.splitPath(daysDir);
		const expected =
			arg2DaysDirParts[arg2DaysDirParts.length - 2] === 'src'
			&& arg2DaysDirParts[arg2DaysDirParts.length - 1] === 'days'
			&& runningDaysDirParts[runningDaysDirParts.length - 2] === 'ts-out'
			&& runningDaysDirParts[runningDaysDirParts.length - 1] === 'days';
		if (!expected)
			return false;
		const relativeDaySubDirFromDaysDir = path.relative(
				path.resolve(...arg2DaysDirParts.slice(0, -2)),
				path.resolve(...runningDaysDirParts.slice(0, -2)));
		const isDaySubDir = relativeDaySubDirFromDaysDir.length === 0 && daySubDirRegex.test(arg2DirParts.name);
		if (!isDaySubDir)
			return false;

		// we passed all checks, so we assuming we're running a single day.
		// now return true and the dir name of the single day we're to run.
		singleDayNum = parseInt(arg2DirParts.name.slice(3), 10);
		return true;
	})();

	// determine the last day started/completed
	const maxDay = readdirSync(daysDir, {withFileTypes: true})
		.filter(entry => entry.isDirectory() && daySubDirRegex.test(entry.name))
		.length;
	
	// get the day tracker
	const tracker = manager.__getDayTracker();

	// determine days to run
	let daysToRun = [];
	if (runSingle)
		daysToRun.push(singleDayNum);
	else
	{
		for (let dayNum = 1; dayNum <= maxDay; dayNum++)
			daysToRun.push(dayNum);

		tracker.runFast = true;
	}

	// load the script for each day
	for (let dayNum of daysToRun)
	{
		// require script for day
		const dir = path.resolve(daysDir, `day${String(dayNum).padStart(2, '0')}`);
		let script = path.resolve(dir, 'run.js');
		await import ('file://' + script);

		// store the dir for that day
		tracker.days.get(dayNum).dir = dir;
	}
	
	// now actually run each day
	for (let day of daysToRun.map(x => tracker.days.get(x)))
	{
		// log a separator for the day
		console.log(`\n\n====================== Day ${day.dayNum} ======================\n`);

		// change to that day's subdir
		chdir(day.dir);

		// run it
		if (day.isAsync)
			await tracker.runAsync(day);
		else
			tracker.run(day);
	}

	// change back to project root dir
	chdir(projectRootDir);

	// if doing single, we're already done
	if (runSingle)
		return;

	// otherwise, log a separator for the results
	console.log(`\n\n===================================================\n\nResults:`);

	// setup the day-part classifications we care about:
	const classifications = [
		'    new    ',  // new means I don't yet know the official answer for my input
		'  CORRECT  ',  // the official answer is known and the just-ran results match
		'!! WRONG !!'   // the official answer is known but the results do not match
	];

	// function to classify a day-part's result
	function classify(dayNum, part)
	{
		if (dayNum === 25 && part === 2)
			return null; // n/a
		else
		{
			const d = tracker.days.get(dayNum);
			const [answer, expected] = [d.answers[part-1], d.expectedAnswers[part-1]];
			if (expected === null)
				return classifications[0];
			else
				return classifications[answer == expected ? 1 : 2]; // intentional ==
		}
	}

	// classify all results in a map: 'day-part' -> classification
	const results = new Map();
	for (let dayNum of daysToRun)
		for (let part = 1; part <= 2; part++)
			results.set(`${dayNum}-${part}`, classify(dayNum, part));

	// log it in a table
	console.log('\t           Part 1:         Part 2:');
	console.log('\t         +---------------+---------------+');
	for (let dayNum of daysToRun)
		console.log(`\tDay ${String(dayNum).padStart(2,'0')}   |  ${results.get(`${dayNum}-1`)}  |  ${results.get(`${dayNum}-2`) || '   (n/a)   '}  |   ${tracker.days.get(dayNum).dayName}`);
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
}
