# AdventOfCode2019

This repo contains my solutions for: [Advent of Code 2019](https://adventofcode.com/2019)

Well into a long career of programming, I started playing Advent of Code (AoC) in [December 2020](https://adventofcode.com/2020), and loved the puzzles so much that I figured it a great way to reinforce learning more.  So I went back to the 2019 puzzles to learn more JavaScript and start learning TypeScript.  When I'm done with 2019, I plan to go further back to learn additional languages.

My primary goals with this repo are to:
* Solve days 1 through 12 in plain JavaScript.  (DONE)
* Solve days 13 through 25 in TypeScript.  (In-Progress)

This repo should be easy to install, run, and experiment with for anyone running Windows 10 as I do.  Since it uses all open source tech, it should also be straightforward on Linux/Mac, though I haven't tested that.

I went to some lengths to make the development experience quick and easy in VS Code.  I learn a ton from examples, so I want to provide this as a useful example for others who would like to experiment in VS Code with node.js, JavaScript, and TypeScript.  Also, part of the fun of AoC is learning from other players, trying your inputs with their solutions, or trying your solutions with their inputs.  All my inputs are provided here, and command line support make it easy to run any solution with alternate input.


## Install

1. Install the pre-requisites from their official websites: 
  * [git](https://git-scm.com/downloads)
  * [node.js](https://nodejs.org/)
  * [VS Code](https://code.visualstudio.com/Download)
  
All remaining steps should be performed in a command prompt.

2. Install [TypeScript](https://www.typescriptlang.org/) as a global npm module:
```
  npm install -g typescript
```

3. Clone this repo and go into the newly formed directory:
```
  git clone https://github.com/mikeday37/AdventOfCode2019.git
  cd AdventOfCode2019
```
Remaining steps and all other example commands assume you're running in that folder.

3. Install dependencies, including developer support:
```
  npm install --save-dev
```

4. Build the project:
```
  tsc -b src
```

## Run

You can easily run all the solutions with my inputs via:
```
  node index.js
```
That will also give you a nice summary of the outcome for all supported days so far.  The primary purpose of this way of running is to allow me to test all solutions after refactoring, such as when I collect common functionality into a new module, or change existing common modules.  When run this way, each solution is run only once.  Any discrepancy between the output and known correct answers will be highlighted in the summary.

You can also run a specific day with automatically repeated runs for improved benchmarking:
```
  node index.js <day_number>
```
as in:
```
  node index.js 13
```
... to run my lucky first TypeScript solution.  :)

When run in this way, each part is run multiple times to enable better benchmarking.  The benchmarking runs a maximum of 100 times per part, or until 1 second has elapsed, whichever is shorter.  I try to keep my solutions running in less than one second, though there are a couple of exceptions so far.

You can also override input when running a single day, by providing a path to an input file as the third argument:
```
  node index.js 13 c:\temp\13.txt
```

When run that way, the usual "-- CORRECT --" indicators next to the output for the part answers will be omitted, since my code doesn't know the official answers for any other inputs.


## Develop / Experiment

To explore the code or run and debug it from VS Code, simply run:
```
  code AdventOfCode2019.code-workspace
```
(You don't have to type all that.  Just type "code adv" and hit TAB to autocomplete, then enter.)

Alternately, you can simply run:
```
code .
```
... and when VS Code notifies you there's a workspace in this folder, click the option to open it.

I've configured the workspace to automatically build the project and run it when you hit F5, as long as you're looking at any source file.  When looking at the "run.js" or "run.ts" source file for any day, it runs only that day.  When looking at any other source file, it runs all days.


## Useful Resources

There's such a huge amount of information for developers these days, freely available -- there's never been a better time to be a developer than right now!  :D  Here are the sites I found most useful throughout this project:

* [Mozilla Developer's Network (MDN) / JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) -- excellent overviews, guides, and reference.
* [NPM (Node Package Manager) Website](https://www.npmjs.com/) -- thousands of freely available libraries you can plug into your projects.
* [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) -- very good guide to TypeScript, no matter what languages you've used before.

...and if you haven't already, check out [Advent of Code](https://adventofcode.com/2019/about)!  It's free, fun, easy to sign up for and participate, and you can do so in any programming language.  The puzzles are incredibly well designed - can't recommend this enough.  :-)

Happy Coding!  :D
