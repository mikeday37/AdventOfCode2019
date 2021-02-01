import { assert } from 'console';
import * as manager from '../../lib/dayManager.js';

(function(){
	manager.day(16, 'Flawed Frequency Transmission',
	[
		59281788
	],
	(api) =>
	{
		const digits: number[] = api.time('read and parse', () => parseDigits(api.readInput()));

		runTests();

		api.doPart(1, () => runFFT(digits, 100).firstEightDigitsAsString);
	});
}());

function parseDigits(rawDigits: string) : number[]
{
	return [...rawDigits.trim()].map(Number);	
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
	let testNum = 0;
	let allPassed = true;
	type TestContinuation = (moreIterations: number, expectedNextFirstEight: string) => TestContinuation;
	const test: (rawDigits: string, iterations: number, expectedFirstEight: string) => TestContinuation = (rawDigits, iterations, expectedFirstEight) =>
	{
		++testNum;
		const results = runFFT(parseDigits(rawDigits), iterations);
		const pass = results.firstEightDigitsAsString === expectedFirstEight;
		assert(pass, `test #${testNum} failed.  results = ${results.firstEightDigitsAsString}, expected = ${expectedFirstEight}`);
		if (!pass)
			allPassed = false;
		return (moreIterations, expectedNextFirstEight) => test(results.digits.join(''), moreIterations, expectedNextFirstEight);
	}

	test('12345678',
	     1, '48226158')
		(1, '34040438')
		(1, '03415518')
		(1, '01029498');

	test('80871224585914546619083218645595', 100, '24176176');
	test('19617804207202209144916044189917', 100, '73745418');
	test('69317163492948606335995924319873', 100, '52432133');

	if (testNum !== 7)
		throw new Error(`unexpected final test num: ${testNum}`);
	if (allPassed)
		console.log(`all ${testNum} tests passed.`);
	console.log('');
}
