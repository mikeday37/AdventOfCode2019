import { assert } from 'console';
import { readFileSync } from 'fs';
import { getIntcodeService } from '../../lib/intcode.js';
import * as manager from '../../lib/dayManager.js';


(function(){
    manager.day(9, 'Sensor Boost',
    [
        3839402290,
        35734
    ],
    (api) =>
    {
        const intcode = api.time('get service', ()=>getIntcodeService());
        const program = api.time('read and parse', ()=>intcode.parse(readFileSync('./input.txt', 'utf-8')));

        checkExamples(intcode);

        api.doPart(1, () => getPartAnswer(1, intcode, program));
        api.doPart(2, () => getPartAnswer(2, intcode, program));
    });
})();


function getPartAnswer(part, intcode, program)
{
    const result = intcode.run(program, [part]);
    if (result.haltCode !== 1)
        throw Error(`BOOST failed, haltCode = ${result.haltCode}, haltReason = ${result.haltReason}`);
    if (result.output.length !== 1)
        throw Error(`BOOST output length unexpected: ${result.output.length}`);
    return result.output[0];
}

function checkExamples(intcode)
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
