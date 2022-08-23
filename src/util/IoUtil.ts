import {createInterface} from "readline";

export const timeout = async ms => new Promise(res => setTimeout(res, ms));


export async function ask(message: string, passwd = false) {
    let out;
    process.stdout.write(message + "\t");
    let customStdIn = process.stdin;
    let customStdOut = process.stdout;
    let rl = createInterface({
        input: customStdIn,
        output: null,
    });
    let counter = 0;
    const listener = function (c, k) {
        if (!passwd || c === "\n" || c === "\r") {
            return;
        }
        counter += 1;
        // get the number of characters entered so far:
        let len = counter;
        customStdOut.moveCursor(-counter, 0);
        customStdOut.clearLine(1);
        /*// move cursor back to the beginning of the input:
        readline.moveCursor(customStdOut, -len, 0);
        // clear everything to the right of the cursor:
        readline.clearLine(customStdOut, 1);*/
        // replace the original input with asterisks:
        for (let i = 0; i < len; i++) {
            customStdOut.write("*");
        }
    }
    customStdIn.on("keypress", listener);
    rl.question("", function (answer) {
        out = answer;
        rl.close()
    });
    // dirty way to wait
    while (!out) {
        await timeout(50)
    }
    customStdIn.removeListener("keypress", listener)
    return out;
}