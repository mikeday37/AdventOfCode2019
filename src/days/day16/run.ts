import { assert } from 'console';
import * as manager from '../../lib/dayManager.js';

(function(){
	manager.day(16, 'Flawed Frequency Transmission',
	[
		59281788,
		96062868
	],
	(api) =>
	{
		const digits: number[] = api.time('read and parse', () => parseDigits(api.readInput()));

		runTests();

		api.doPart(1, () => runFFT(digits, 100).firstEightDigitsAsString);
		api.doPart(2, () => runRealFFT(digits));
	});
}());

function parseDigits(rawDigits: string) : number[]
{
	return [...rawDigits.trim()].map(Number);	
}

function runRealFFT(baseDigits: number[]) : string
{
	// determine lengths and message offset
	const baseLen = baseDigits.length;
	const fullLen = baseLen * 10000;
	const messageOffset = parseInt(baseDigits.slice(0, 7).join(''));
	if (messageOffset < fullLen / 2)
		throw new Error(`messageOffset ${messageOffset} too low for fullLen ${fullLen} - messageOffset must be at least half fullLen for this implementation to work.`);
	
	// determine "suffix" length and initialize it
	// the "suffix" is the part of the full signal we care about, skipping all digits before messageOffset
	const suffixLen = fullLen - messageOffset;
	const suffix: number[] = [];
	suffix.length = suffixLen;
	for (let i = 0; i < suffixLen; i++)
		suffix[i] = baseDigits[(i + messageOffset) % baseLen];

	// repeat 100 times
	for (let n = 1; n <= 100; n++)
	{
		// work from last digit backwards, just setting each digit to the running sum of all digits from itself to the right
		let sum = 0;
		for (let i = suffixLen - 1; i >= 0; i--)
		{
			sum = (sum + suffix[i]) % 10; // only the last digit of the sum ever matters
			suffix[i] = sum;
		}
	}

	// return final message
	return suffix.slice(0, 8).join('');
}

interface FFTResults {
	digits: number[];
	firstEightDigitsAsString: string;
}

function runSingleFFT(input: number[]) : number[]
{
	const basicPattern = [0, 1, 0, -1];
	let outputIndex = 0;
	let inputIndex = 0;
	let patternIndex = 0;
	let advancePatternCountdown = 1;
	const nextPatternValue: () => number = () =>
	{
		if (0 === --advancePatternCountdown)
		{
			patternIndex = (patternIndex + 1) % 4;
			advancePatternCountdown = 1 + outputIndex;
		}
		return basicPattern[patternIndex];
	}
	const output: number[] = [];
	output.length = input.length;
	for (; outputIndex < output.length; outputIndex++, advancePatternCountdown = 1 + outputIndex, patternIndex = 0)
	{
		let sum = 0;
		for (inputIndex = 0; inputIndex < input.length; inputIndex++)
			sum += input[inputIndex] * nextPatternValue();
		output[outputIndex] = Math.abs(sum) % 10;
	}
	return output;
}

function runFFT(inputDigits: number[], iterations: number) : FFTResults
{
	let curDigits = inputDigits;
	for (let i = 1; i <= iterations; i++)
		curDigits = runSingleFFT(curDigits);
	const digits = [...curDigits];
	return {
		digits,
		firstEightDigitsAsString: digits.slice(0, 8).join(''),
	}
}

function runTests()
{
	let part1testNum = 0;
	let allPassed = true;
	type TestContinuation = (moreIterations: number, expectedNextFirstEight: string) => TestContinuation;
	const part1test: (rawDigits: string, iterations: number, expectedFirstEight: string) => TestContinuation = (rawDigits, iterations, expectedFirstEight) =>
	{
		++part1testNum;
		const results = runFFT(parseDigits(rawDigits), iterations);
		const pass = results.firstEightDigitsAsString === expectedFirstEight;
		assert(pass, `part 1 test #${part1testNum} failed.  results = ${results.firstEightDigitsAsString}, expected = ${expectedFirstEight}`);
		if (!pass)
			allPassed = false;
		return (moreIterations, expectedNextFirstEight) => part1test(results.digits.join(''), moreIterations, expectedNextFirstEight);
	}

	part1test('12345678',
	     1, '48226158')
		(1, '34040438')
		(1, '03415518')
		(1, '01029498');

	part1test('80871224585914546619083218645595', 100, '24176176');
	part1test('19617804207202209144916044189917', 100, '73745418');
	part1test('69317163492948606335995924319873', 100, '52432133');

	if (part1testNum !== 7)
		throw new Error(`unexpected final part 1 test num: ${part1testNum}`);
	if (allPassed)
		console.log(`all ${part1testNum} part 1 tests passed.`);

	let part2testNum = 0;
	allPassed = true;
	const part2test: (rawBaseDigits: string, expectedResult: string) => void = (rawBaseDigits, expectedResult) =>
	{
		++part2testNum;
		const result = runRealFFT(parseDigits(rawBaseDigits));
		const pass = result === expectedResult;
		assert(pass, `part 2 test #${part2testNum} failed.  result = ${result}, expected = ${expectedResult}`);
		if (!pass)
			allPassed = false;
	}

	part2test('03036732577212944063491565474664', '84462026');
	part2test('02935109699940807407585447034323', '78725270');
	part2test('03081770884921959731165446850517', '53553731');

	if (part2testNum !== 3)
		throw new Error(`unexpected final test num: ${part2testNum}`);
	if (allPassed)
		console.log(`all ${part2testNum} part 2 tests passed.`);

	console.log('');	
}
