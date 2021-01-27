import { readFileSync } from 'fs';
import { hrtime, cwd } from 'process';
import * as path from 'path';
import * as common from './common.js';


type DayPartAnswer = string | number | bigint | null;

interface DayApi {
	time: <T>(label: string, action: () => T) => T;
	doPart: (part: number, fn: () => DayPartAnswer) => void;
	notePart: (part: number, result: DayPartAnswer) => void;
	readInput: () => string,
	runFast: boolean;
}

interface DayAsyncApi extends DayApi {
	timeAsync: <T>(label: string, action: () => Promise<T>) => Promise<T>;
	doPartAsync: (part: number, fn: () => Promise<DayPartAnswer>) => Promise<void>;
}

type DayFunction = (api: DayApi) => void;
type DayAsyncFunction = (api: DayAsyncApi) => Promise<void>;

interface DayTrackerEntry {
	answers: DayPartAnswer[],
	dayName: string,
	dayNum: number,
	dir: string | null,
	expectedAnswers: DayPartAnswer[],
	fn: DayFunction | DayAsyncFunction,
	isAsync: boolean,
	maxRuns: number | null
}


// special export to get results of all days
export function __getDayTracker() {return dayTracker;}

// global singleton results tracker -- holds results for all days
const dayTracker = createDayTracker();

// start each day's run script with a call to this method, leaving the answers array empty until they are known
export function day(dayNum: number, dayName: string, expectedAnswers: DayPartAnswer[], fn: DayFunction, maxRuns: number | null = null)
{
    dayTracker.addDay(dayNum, dayName, expectedAnswers, fn, maxRuns, false);
}

// use this instead of day() if the function must be async
export function dayAsync(dayNum: number, dayName: string, expectedAnswers: DayPartAnswer[], fnAsync: DayAsyncFunction, maxRuns: number | null = null)
{
    dayTracker.addDay(dayNum, dayName, expectedAnswers, fnAsync, maxRuns, true);
}

function createDayTracker()
{
	let days: Map<number, DayTrackerEntry> = new Map();

	function prepareExpectedAnswers(expectedAnswers: DayPartAnswer[])
	{
		let ea = expectedAnswers ?? [];
		let result: DayPartAnswer[] = [null, null];
		for (let i of [0,1])
			if (ea.length > i)
				result[i] = expectedAnswers[i];
		return result;
	}

	let tracker =
	{
		days,

		addDay: (dayNum: number, dayName: string, expectedAnswers: DayPartAnswer[], fn: DayFunction | DayAsyncFunction, maxRuns: number | null = null, isAsync: boolean) => {
			days.set(dayNum, {
				dayNum,
				dayName,
				dir: null,
				expectedAnswers: prepareExpectedAnswers(expectedAnswers),
				answers: [null, null],
				fn,
				maxRuns,
				isAsync
			});
		},

		run: (day: DayTrackerEntry) => runDay(day),

		runAsync: async (day: DayTrackerEntry) => await runDayAsync(day),

		runFast: false
	};

	return tracker;
}

function makeHelper(day: DayTrackerEntry)
{
	let api: DayAsyncApi = {runFast: dayTracker.runFast} as DayAsyncApi;
	let timings: Map<string, [number, number][]> = new Map();

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
			(timings.get(label) as [number, number][]).push(duration);
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
				(timings.get(label) as [number, number][]).push(duration);
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

	function logResults()
	{
		console.log('\n--- timing info: ---')

		function toPrettyDuration(nanoseconds: bigint) {
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

	return {logResults, api};
}

function runDay(day: DayTrackerEntry)
{
	const helper = makeHelper(day);
	day.fn(helper.api);
	helper.logResults();
}

async function runDayAsync(day: DayTrackerEntry)
{
	const helper = makeHelper(day);
	await day.fn(helper.api);
	helper.logResults();
}
