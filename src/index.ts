import {Logger} from "./util/logger"
import {createInterface} from "readline"

import {DataFactory} from "n3";
import SolidFetch, {INRUPT} from "./solidFetch";

const nodeFetch = require('node-fetch')

const {namedNode, literal, quad} = DataFactory;

const logger: Logger = new Logger("main");
const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const timeout = async ms => new Promise(res => setTimeout(res, ms));

async function main() {
    const sf = new SolidFetch()
    const data = await sf.fetch(INRUPT,
        //"https://storage.inrupt.com/416104bb-1f65-45f0-b9ab-13551cf2bb68/private/chatrooms.ttl",
        "http://localhost:3000/age",
        "https://pod.inrupt.com/sevrijss/profile/card#me")
    console.log(data);
}

main().then(e => process.exit(0));