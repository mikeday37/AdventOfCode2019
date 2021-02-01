import { assert } from 'console';
import * as manager from '../../lib/dayManager.js';

(function(){
	manager.day(16, 'Flawed Frequency Transmission',
	[
	],
	(api) =>
	{
		const digits: number[] = api.time('read and parse', () => [...api.readInput().trim()].map(Number));

		runTests();

		api.doPart(1, () => 0);
	});
}());

function runTests()
{
}
