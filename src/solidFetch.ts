import rdfParser from "rdf-parse"
import {Logger} from "./util/logger";
import {Quad} from "rdf-js";
import arrayifyStream from "arrayify-stream";
import {ask} from "./util/IoUtil";
import {createDpopHeader, generateDpopKeyPair, KeyPair} from '@inrupt/solid-client-authn-core';
import {Session} from "@inrupt/solid-client-authn-node";
import {CONTENT_TYPE} from "./util/HTTPHeaders";
import {Readable} from "stream";
import {writeFileSync} from "fs";
import {B64, fromB64} from "./util/StringUtils";


const {readFileSync} = require('fs');

const nodeFetch = require('node-fetch')

const fetch = nodeFetch


const STORAGE = process.cwd() + "\\config\\data.json"
console.log(STORAGE)

type INRUPT_T = "https://broker.pod.inrupt.com/"
export const INRUPT = "https://broker.pod.inrupt.com/"
export type supportedBrowsers = INRUPT_T


type inruptCacheRecord = {
    id: string,
    secret: string
}

export default class SolidFetch {
    logger: Logger = new Logger("solidFetch");
    private webID: string;
    private provider: string;

    private inruptCache: Record<string, inruptCacheRecord>;

    private dpopKey: KeyPair

    private cachedWebID;

    constructor() {
        this.loadCacheIfAvailable()
    }

    private loadCacheIfAvailable() {
        const data: Buffer = readFileSync(STORAGE);
        if (!this.inruptCache) {
            this.inruptCache = {};
        }
        if (data.length > 0) {
            const base = JSON.parse(data.toString())
            Object.keys(base).forEach((key: string) => {
                let {id, secret} = base[key]
                this.inruptCache[fromB64(key)] = {id: fromB64(id), secret: fromB64(secret)}
            })
        }
        if (!this.inruptCache) {
            this.inruptCache = {};
            this.backupCache()
        }
    }

    private backupCache() {
        const base = {}
        Object.keys(this.inruptCache).forEach((key: string) => {
            let {id, secret} = this.inruptCache[key]
            base[B64(key)] = {id: B64(id), secret: B64(secret)}
        })
        console.log(base);
        writeFileSync(STORAGE, JSON.stringify(base))
    }

    private inruptSession: Session;

    async fetch(provider: string, url: string, webID: string): Promise<Quad[]> {
        if (!provider.endsWith("/")) {
            provider += "/"
        }
        let result: Response
        let failed = false
        try {
            console.log("trying normal fetch");
            result = await fetch(url)
            if (!result.ok) {
                throw new Error("failed");
            }
        } catch (e) {
            console.log(e);
            failed = true;
        }
        if (!failed) {
            const data = await result.text();
            const contentType = result.headers.get(CONTENT_TYPE).split(";")[0]
            return await arrayifyStream(rdfParser.parse(Readable.from([data]), {
                contentType: contentType,
                baseIRI: url,
            }))
        } else {
            this.logger.warn("fetch failed, trying an authorized approach")

            if (provider === INRUPT) {
                this.logger.info("please register this app on https://broker.pod.inrupt.com/registration.html")
                let client_secret, client_id;
                if (!this.inruptCache[webID]) {
                    client_id = await ask("client id:")
                    client_secret = await ask("client secret:")
                    this.inruptCache[webID] = {id: client_id, secret: client_secret}
                    this.backupCache()
                } else {
                    client_id = this.inruptCache[webID].id
                    client_secret = this.inruptCache[webID].secret
                }
                if (!this.webID || this.webID !== webID) {
                    this.inruptSession = new Session();
                    this.webID = webID;
                }
                try {
                    let res: Response;
                    // Log in using the credentials from the registered client.
                    await this.inruptSession
                        .login({
                            clientId: client_id,
                            clientSecret: client_secret,
                            oidcIssuer: provider
                        })

                    if (this.inruptSession.info.isLoggedIn) {
                        console.info("INFO::::::::: Logged In with Client Credentials.");
                        // Perform some operation
                        res = await this.inruptSession.fetch(url);
                        const data = await res.text();
                        const contentType = res.headers.get(CONTENT_TYPE).split(";")[0]
                        const quads: Quad[] = await arrayifyStream(rdfParser.parse(Readable.from([data]), {
                            contentType: contentType,
                            baseIRI: url,
                        }))
                        return quads
                    }
                } catch (err) {
                    console.log(err);
                }

                /*let tokenUrl;

                /!**
                 * code greatly derived from {@link https://communitysolidserver.github.io/CommunitySolidServer/4.x/client-credentials/ CSS}
                 *!/
                const data = await (await nodeFetch(provider + "/.well-known/openid-configuration")).json()
                tokenUrl = data.token_endpoint;

                const dpopKey = await generateDpopKeyPair();

                const authString = `${encodeURIComponent(client_id)}:${encodeURIComponent(client_secret)}`;
                console.log(tokenUrl);
                const response = await nodeFetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        // The header needs to be in base64 encoding.
                        authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
                        'content-type': 'application/x-www-form-urlencoded',
                        dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
                    },
                    body: `grant_type=client_credentials&scope=webid openid`,
                });
                if (!response.ok)
                    throw new Error("Registration Failed");

                const result = (await response.json())
                console.log(result);
                const access_token = result['access_token']
                console.log(access_token);

                const authFetch = await buildAuthenticatedFetch(fetch, access_token, {dpopKey: this.dpopKey});
                const res = await(await authFetch(url)).json()
                console.log(res);*/

                /* this.cache[webID] = {
                     client_id,
                     client_secret,
                     token_endpoint: tokenUrl,
                     accessToken: access_token,
                     InruptFetch: authFetch,
                     CSSFetch: null
                 }*/
            }

            let id, secret;
            if (false) {//this.cache[webID]) {
                // id = this.cache[webID].id;
                // secret = this.cache[webID].secret
            } else {
                const email = await ask("email");
                const passwd = await ask("password:", true);

                const base = "http://localhost:3000"

                // This assumes your server is started under http://localhost:3000/.
                // This URL can also be found by checking the controls in JSON responses when interacting with the IDP API,
                // as described in the Identity Provider section.
                const response = await fetch(`${base}/idp/credentials/`, {
                    method: 'POST',
                    headers: {'content-type': 'application/json'},
                    // The email/password fields are those of your account.
                    // The name field will be used when generating the ID of your token.
                    body: JSON.stringify({
                        email: email,
                        password: passwd,
                        name: `auth_fetch_${Date.now().toString()}`
                    }),
                });

                // These are the identifier and secret of your token.
                // Store the secret somewhere safe as there is no way to request it again from the server!
                const json = await response.json();
                console.log(json);
                id = json.id;
                secret = json.secret;
            }
            const dpopKey = await generateDpopKeyPair();
            const tokenUrl = "http://localhost:3000"
            // These are the ID and secret generated in the previous step.
            // Both the ID and the secret need to be form-encoded.
            const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
            // This URL can be found by looking at the "token_endpoint" field at
            // http://localhost:3000/.well-known/openid-configuration
            // if your server is hosted at http://localhost:3000/.
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    // The header needs to be in base64 encoding.
                    authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
                    'content-type': 'application/x-www-form-urlencoded',
                    dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
                },
                body: 'grant_type=client_credentials&scope=webid',
            });

            // This is the Access token that will be used to do an authenticated request to the server.
            // The JSON also contains an "expires_in" field in seconds,
            // which you can use to know when you need request a new Access token.
            const {access_token: accessToken} = await response.json();
            console.log(accessToken);
        }

    }


}