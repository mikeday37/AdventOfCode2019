import * as manager from '../../lib/dayManager.js';

(function(){
	manager.day(13, 'Care Package',
	[
	],
	(api: { time: (arg0: string, arg1: { (): any; (): any; }) => void; readInput: () => any; doPart: (arg0: number, arg1: { (): any; (): any; }) => void; }) =>
	{
		const rawInput = api.time('read', ()=>api.readInput());

		//api.time('check examples', () => checkExamples());

		api.doPart(1, () => null);
	});
})();

