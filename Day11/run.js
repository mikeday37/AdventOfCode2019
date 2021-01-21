'use strict';
const { assert } = require('console');
const { readFileSync } = require('fs');
const { getIntcodeService } = require('../intcode.js');

const manager = require('../dayManager.js');

(function(){
    manager.day(11, 'Space Police',
    [
        1909
    ],
    (api) =>
    {
        const intcode = api.time('get service', ()=>getIntcodeService());
        const program = api.time('read and parse', ()=>intcode.parse(readFileSync('./input.txt', 'utf-8')));

        let output;
        api.doPart(1, () => {output = getRobotOutput(intcode, program); return output.size;});
    });
})();

function getRobotOutput(intcode, program, initialPanelColor = 0)
{
    function xyToKey(x,y) {return `${x},${y}`;}
    let writtenPanels = new Map();
    let x = 0, y = 0, dir = 0;
    let evenOutputIndex = true;
    function posKey() {return xyToKey(x,y);}
    if (initialPanelColor)
        writtenPanels.set(posKey(), 1);
    const dirs = [...'0123'].map(dir => [...'10211201'].slice(2 * dir, 2 * dir + 2).map(x => x - 1)); // :maniacal_laughter:
    let state = intcode.init(program, {
        hasInput: () => true,
        readInput: () => writtenPanels.get(posKey()) ?? 0,
        writeOutput: v => {
            if (evenOutputIndex)
                writtenPanels.set(posKey(), v)
            else
            {
                dir = (4 + dir + (v ? 1 : -1)) % 4;
                const [dx, dy] = dirs[dir]; 
                x += dx; y += dy;
            }
            evenOutputIndex = !evenOutputIndex;
        }
    })
    while (!state.haltCode)
        state.step();
    return writtenPanels
}

/*function checkExamples(intcode)
{
    let index = 0;
    let pass = true;

    function check(rawProgram, input = [], expectedOutput = [], logSteps = false) {
        const checkNum = ++index;
        const program = intcode.parse(rawProgram);
        const result = intcode.run(program, input, logSteps);
        const isValid = result.haltCode === 1 && expectedOutput.join(',') === result.output.join(',');
        assert(isValid, `example ${checkNum} failed`);
        if (!isValid)
            pass = false;
    }

    doChecks();

    if (pass) console.log(`--- All ${index} Examples PASSED ---`);

    function doChecks()
    {
        const example1 = '109,1,204,-1,1001,100,1,100,1008,100,16,101,1006,101,0,99';
        check(example1, [], intcode.parse(example1));

        check('1102,34915192,34915192,7,4,7,99,0', [], [1219070632396864]);
        check('104,1125899906842624,99', [], [1125899906842624]);
    }
}
*/