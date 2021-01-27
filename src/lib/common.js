import * as path from 'path';


// add my convenient "extension methods" if desired
export function addExtensions()
{
    // decided to play with technique for extending existing types "safely."
    // this seems to be the closest you can get to C# extension methods in JS,
    // and is not without serious caveats.
    //
    // of particular note, this affects the entire "realm" it is executed in, so
    // this is not an appropriate technique to use in published/shared library
    // code, where you don't have control over other code executed in the realm.
    //
    // see: https://stackoverflow.com/a/9354310/4730748
    //

    Object.defineProperty(Array.prototype, "withIndex", {
        value: function withIndex(){
            let result = [];
            for (let i = 0; i < this.length; i++)
                result.push({item: this[i], index: i});
            return result;
        },
        writable: true,
        configurable: true
    });

    Object.defineProperty(String.prototype, "toNumberArray", {
        value: function toNumberArray(){
            return [...this].map(x => Number(x));
        },
        writable: true,
        configurable: true
    });
}

export function splitPath(inputPath)
{
    let currentPath = inputPath;
    let parts = [];
    while (true)
    {
        const {base, dir} = path.parse(currentPath);
        if (base)
        {
            parts.unshift(base);
            currentPath = dir;
        }
        else
        {
            if (dir)
                parts.unshift(dir);
            break;
        }
    }
    return parts;
}
