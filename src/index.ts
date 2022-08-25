import {Logger} from "./util/logger"
import {createInterface} from "readline"
import arrayifyStream from "arrayify-stream";

import {DataFactory, Store} from "n3";
import {Quad} from "rdf-js";
import rdfDereferencer from "rdf-dereference";
import {SOLID} from "./util/Vocabulary";
import {WWW_Authenticate} from "./util/HTTPHeaders";
import SolidFetch, {INRUPT} from "./solidFetch";

const nodeFetch = require('node-fetch')

const {namedNode, literal, quad} = DataFactory;

const logger: Logger = new Logger("main");
const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const timeout = async ms => new Promise(res => setTimeout(res, ms));

async function main(url: string) {
    const result: Response = await nodeFetch(url)
    logger.logResponse(result);
    if (result.status === 401) {
        const authHeader = result.headers.get(WWW_Authenticate);
        logger.info(authHeader)
        let scopeIndex = authHeader.search(/scope="[^"]*"/)
        let endIndex = scopeIndex;
        let counter = 0;

        for (let i = scopeIndex; i < authHeader.length; i++) {
            if (authHeader[i] === '"' && counter === 0) {
                scopeIndex = i;
                counter++;
            } else if (authHeader[i] === '"' && counter === 1) {
                endIndex = i;
                break;
            }
        }

        const scope = authHeader.slice(scopeIndex + 1, endIndex)
        logger.info(scope);
        let webID;
        rl.question("Not authenticated, please provide webID:\t", function (answer) {
            webID = answer;
            rl.close();
        });
        // dirty way to wait for webID
        while (!webID) {
            await timeout(50)
        }
        const data: Quad[] = await arrayifyStream((await rdfDereferencer.dereference(webID)).data)
        const store: Store = new Store(data);
        let possible_oidcIssuer = store.getObjects(namedNode(webID), namedNode(SOLID.oidcIssuer), null)
        if (possible_oidcIssuer.length !== 1) {
            throw new Error("Something went wrong");
        }
        const oidcIssuer = possible_oidcIssuer[0].value;
        await authorize(oidcIssuer, webID, scope)
    }
}

async function authorize(oidc: string, webID: string, scope: string) {

}

//main("http://localhost:3000/age");
const sf = new SolidFetch()
//sf.init("https://id.inrupt.com/sevrijss", "https://broker.pod.inrupt.com").then(_ =>
sf.fetch("CSS",
    INRUPT,
    "https://storage.inrupt.com/416104bb-1f65-45f0-b9ab-13551cf2bb68/private/chatrooms.ttl",
    "https://pod.inrupt.com/sevrijss/profile/card#me")
    .then(r => process.exit(0))
    .catch(r => {
        console.log(r);
        process.exit(1)
    })


