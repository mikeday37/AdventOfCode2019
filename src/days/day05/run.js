import { assert } from 'console';
import * as manager from '../../lib/dayManager.js';
import { getIntcodeService } from '../../lib/intcode.js';

(function(){
    manager.day(5, 'Sunny with a Chance of Asteroids',
    [
        15386262,
        10376124
    ],
    (api) =>
    {
        const intcode = getIntcodeService();

        checkExamples(intcode);

        const program = intcode.parse(api.readInput().trim());
        
        api.doPart(1, ()=>getPart1(intcode, program));
        api.doPart(2, ()=>getPart2(intcode, program));
    });
})();

function getPart1(intcode, program)
{
    const result = intcode.run(program, [1]);
    let nonZeros = 0, last = null;
    for (let o of result.output)
    {
        if (o !== 0) nonZeros++;
        last = o;
    }
    const valid = result.haltCode === 1 && nonZeros === 1 && last !== 0;
    assert(valid, "computer invalid");
    return last;
}

function getPart2(intcode, program)
{
    const result = intcode.run(program, [5]);
    const valid = result.haltCode === 1 && result.output.length === 1;
    assert(valid, "part 2 computer invalid");
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

    check('3,0,4,0,99', [37], [37]);
    check('1002,4,3,4,33');
    check('1101,100,-1,4,0')

    check('3,9,8,9,10,9,4,9,99,-1,8', [8], [1]);
    check('3,9,8,9,10,9,4,9,99,-1,8', [7], [0]);
    check('3,9,8,9,10,9,4,9,99,-1,8', [9], [0]);

    check('3,9,7,9,10,9,4,9,99,-1,8', [7], [1]);
    check('3,9,7,9,10,9,4,9,99,-1,8', [8], [0]);
    check('3,9,7,9,10,9,4,9,99,-1,8', [9], [0]);

    check('3,3,1108,-1,8,3,4,3,99', [8], [1]);
    check('3,3,1108,-1,8,3,4,3,99', [7], [0]);
    check('3,3,1108,-1,8,3,4,3,99', [9], [0]);

    check('3,3,1107,-1,8,3,4,3,99', [7], [1]);
    check('3,3,1107,-1,8,3,4,3,99', [8], [0]);
    check('3,3,1107,-1,8,3,4,3,99', [9], [0]);

    check('3,12,6,12,15,1,13,14,13,4,13,99,-1,0,1,9', [0], [0]);
    check('3,12,6,12,15,1,13,14,13,4,13,99,-1,0,1,9', [-1], [1]);
    check('3,12,6,12,15,1,13,14,13,4,13,99,-1,0,1,9', [1], [1]);
    check('3,12,6,12,15,1,13,14,13,4,13,99,-1,0,1,9', [999], [1]);
    
    check('3,3,1105,-1,9,1101,0,0,12,4,12,99,1', [0], [0]);
    check('3,3,1105,-1,9,1101,0,0,12,4,12,99,1', [-1], [1]);
    check('3,3,1105,-1,9,1101,0,0,12,4,12,99,1', [1], [1]);
    check('3,3,1105,-1,9,1101,0,0,12,4,12,99,1', [999], [1]);
    
    const largerExample = `
        3,21,1008,21,8,20,1005,20,22,107,8,21,20,1006,20,31,
        1106,0,36,98,0,0,1002,21,125,20,4,20,1105,1,46,104,
        999,1105,1,46,1101,1000,1,20,4,20,1105,1,46,98,99`;

    check(largerExample, [0], [999]);
    check(largerExample, [7], [999]);
    check(largerExample, [8], [1000]);
    check(largerExample, [9], [1001]);
    check(largerExample, [99], [1001]);
    
    // official above, manual below

    check('4,1,99', [], [1]);
    check('1102,7,12,5,104,-999,104,-1,99', [], [84, -1]);
    check('3,0,3,1,1,0,1,0,4,0,99', [1010,303], [1313]);

    // heh...
    const fibonacciIntcodeProgram =

        // @ 00:  skip variable area

          '1105,1,5'   // jump past convenient variable area
        +',0'          // placeholder, which will receive "limit" input variable
        +',0'          // placeholder, for testing the loop condition

        // @ 05:  initialize variables

        +',3,3'        // save limit from input -> [3]
        +',1101,0,0,0' // [0] = 0
        +',1101,0,1,1' // [1] = 1

        // @ 15:  loop beginning

        +',1,0,1,2'    // [2] = [1] + [0], get next in sequence
        +',4,0'        // output [0], oldest in sequence

        // @ 21:  stop if we would output over the limit next time

        +',7,1,3,4'    // [1] is next for output, write 1 to [4] if [1] < [3]
        +',1005,4,29'  // skip the next instruction (halt) if [4] === 1
        +',99'         // if we hit this we're done

        // @ 29:  otherwise, continue

        +',101,0,1,0'  // [0] = [1], roll left part 1
        +',101,0,2,1'  // [1] = [2], roll left part 2
        +',1105,1,15';  // jump back to loop beginning

    check(fibonacciIntcodeProgram
        ,[145]
        ,[0,1,1,2,3,5,8,13,21,34,55,89,144]
    );
    check(fibonacciIntcodeProgram
        ,[700]
        ,[0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610]
    );

    if (pass) console.log(`--- All ${index} Examples PASSED ---`);
}
