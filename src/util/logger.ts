import {rstrip, lstrip} from "./StringUtils"

export type logLevel = "INFO" | "DEBUG" | "WARN"

export class Logger {
    private readonly prefix;

    constructor(c: string) {
        this.prefix = c;
    }

    log(level: logLevel, msg: string) {
        const header = `${new Date().toLocaleString()} [${this.prefix}] ${level}: `
        const lines = msg.split(/\r?\n/)
        console.log(`${header}${lines[0]}`)
        lines.slice(1).forEach(line => {
            console.log(`${" ".repeat(header.length)}${rstrip(lstrip(line))}`)
        })
    }

    info(msg: string) {
        this.log("INFO", msg);
    }

    warn(msg:string){
        this.log("WARN", msg);
    }

    debug(msg:string){
        this.log("DEBUG", msg);
    }


    logResponse(response: Response, level: logLevel = "INFO") {
        const url = response.url;
        const status = response.ok;
        const statuscode = response.status;
        const statustext = response.statusText;
        this.log(level, `Response from ${url} was ${status ? "OK" : "NOT OK"}
        Code: ${statuscode}
        Message: ${statustext}
        `)
    }
}