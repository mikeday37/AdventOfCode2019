import { readFileSync } from 'fs';
import { hrtime, cwd } from 'process';
import * as path from 'path';
import * as common from './common.js';


// special export to get results of all days
export function __getDayTracker() {return dayTracker;}

// hoist a results tracker if one doesn't already exist -- we intend this to be global across all days, whether run singly or not
if (typeof dayTracker === 'undefined') {var dayTracker = createDayTracker();}

// start each day's run script with a call to this method, leaving the answers array empty until they are known
export function day(dayNum, dayName, expectedAnswers, fn, maxRuns = null)
{
    dayTracker.addDay(dayNum, dayName, expectedAnswers, fn, maxRuns, false);
}

// use this instead of day() if the function must be async
export function dayAsync(dayNum, dayName, expectedAnswers, fnAsync, maxRuns = null)
{
    dayTracker.addDay(dayNum, dayName, expectedAnswers, fnAsync, maxRuns, true);
}

function createDayTracker()
{
	let days = new Map();

	function prepareExpectedAnswers(expectedAnswers)
	{
		let ea = expectedAnswers ?? [];
		let result = [null, null];
		for (let i of [0,1])
			if (ea.length > i)
				result[i] = expectedAnswers[i];
		return result;
	}

	let tracker =
	{
		days,

		addDay: (dayNum, dayName, expectedAnswers, fn, maxRuns, isAsync) => {
			days.set(dayNum, {
				dayNum,
				dayName,
				expectedAnswers: prepareExpectedAnswers(expectedAnswers),
				answers: [null, null],
				fn,
				maxRuns,
				isAsync
			});
		},

		run: (day) => runDay(day),

		runAsync: async (day) => await runDayAsync(day),

		runFast: false
	};

	return tracker;
}

function makeHelper(day)
{
	let api = {runFast: dayTracker.runFast};
	let helper = {api};
	let timings = new Map();

    const 
        maxSeconds = 1,
        runLimit = api.runFast
            ? 1
            : day.maxRuns || 100;	

	api.readInput = () =>
	{
		const curPath = cwd();
		const pathParts = common.splitPath(curPath);
		const daySubDirRegex = /day\d+/;
		const srcIndex = pathParts.length - 3;
		const expected =
			pathParts[srcIndex] === 'ts-out'
			&& pathParts[srcIndex + 1] === 'days'
			&& daySubDirRegex.test(pathParts[srcIndex + 2]);
		if (!expected)
			throw new Error(`attempting to read input from unexpected path: ${curPath}`);
		pathParts[srcIndex] = 'src';
		pathParts.push('input.txt');
		const inputPath = path.resolve(...pathParts);
		return readFileSync(inputPath, 'utf-8');
	}
	
	api.time = (label, action) =>
	{
		timings.set(label, []);
		let result = null, run = 1, start = hrtime();
		do {
			const before = hrtime();
			result = action();
			const duration = hrtime(before);
			timings.get(label).push(duration);
			run++;
		} while (hrtime(start)[0] < maxSeconds && run <= runLimit);
		return result;
	};

	if (day.isAsync)
		api.timeAsync = async (label, actionAsync) =>
		{
			timings.set(label, []);
			let result = null, run = 1, start = hrtime();
			do {
				const before = hrtime();
				result = await actionAsync();
				const duration = hrtime(before);
				timings.get(label).push(duration);
				run++;
			} while (hrtime(start)[0] < maxSeconds && run <= runLimit);
			return result;
		};
	
	api.doPart = (part, fn) => api.notePart(part, api.time(`Part ${part}`, fn));

	if (day.isAsync)
		api.doPartAsync = async (part, fnAsync) => api.notePart(part, await api.timeAsync(`Part ${part}`, fnAsync));

	api.notePart = (part, result) =>
	{
		if (!(part === 1 || part === 2))
			throw Error(`invalid part number: ${part}`);
		day.answers[part-1] = result;
		let valid = null, validMsg = '';
		if (day.expectedAnswers[part-1] !== null)
		{
			valid = result == day.expectedAnswers[part-1]; // intentional ==
			validMsg = `   -- ${valid ? 'CORRECT' : '!! WRONG !!'} --`;
		}
		console.log(`Part ${part}: ${result}${validMsg}`);
	};

	helper.logResults = () =>
	{
		console.log('\n--- timing info: ---')

		function toPrettyDuration(nanoseconds) {
			const v = BigInt(nanoseconds);
			let u = 0;
			let divisor = 1n;
			let threshold = 1000n;
			while (u < 3 && v >= threshold)
			{
				u++;
				divisor *= 1000n;
				threshold *= 1000n;
			}
			const number = u === 0 ? String(v) : ((Number(v) / Number(divisor)).toFixed(3));
			return `${number}${['ns','μs','ms','s'][u]}`;
		};
	
		console.log('                          average:       median:        min:           max:           runs:');
		console.log('                        +--------------+--------------+--------------+--------------+--------+');
	
		timings.forEach((rawDurations, label) => {
			const runs = rawDurations.length;
			let durations = rawDurations.map(x => BigInt(x[0]) * 1_000_000_000n + BigInt(x[1])); // in nanoseconds
			durations.sort((a, b) => a > b ? 1 : -1);
			const [min, max] = [durations[0], durations[runs - 1]].map(x => toPrettyDuration(x));
			const average = toPrettyDuration(durations.reduce((a,b) => a + b) / BigInt(runs));
			const middleIndex = Math.floor(runs / 2);
			const median = toPrettyDuration((runs % 2 !== 0) ? durations[middleIndex] : ((durations[middleIndex] + durations[middleIndex - 1]) / 2n));
			console.log(`${label.padStart(22, ' ')}  |${average.padStart(12, ' ')}  |${median.padStart(12, ' ')}  |`
				+ `${min.padStart(12, ' ')}  |${max.padStart(12, ' ')}  |${String(runs).padStart(6, ' ')}  |`);
		});
	
		console.log('                        +--------------+--------------+--------------+--------------+--------+');
		console.log('--- end ---');
	};

	return helper;
}

function runDay(day)
{
	const helper = makeHelper(day);
	day.fn(helper.api);
	helper.logResults();
}

async function runDayAsync(day)
{
	const helper = makeHelper(day);
	await day.fn(helper.api);
	helper.logResults();
}
