import rdfParser from "rdf-parse"
import {Logger} from "./util/logger";
import arrayifyStream from "arrayify-stream";
import {ask} from "./util/IoUtil";
import {Session} from "@inrupt/solid-client-authn-node";
import {CONTENT_TYPE} from "./util/HTTPHeaders";
import {Readable} from "stream";
import {readFileSync, writeFileSync} from "fs";
import {B64, fromB64} from "./util/StringUtils";
import rdfDereferencer from "rdf-dereference";
import {Quad, Store} from "n3";
import {buildAuthenticatedFetch, createDpopHeader, generateDpopKeyPair} from "@inrupt/solid-client-authn-core";
import {Token} from "./util/AccessToken"

const nodeFetch = require('node-fetch')

const fetch = nodeFetch

const STORAGE = process.cwd() + "\\config\\data.json"
/*
 * this line guarantees the file exists,
 * the `a` flag makes sure the file ISN'T cleared
 * on startup. The default would be `w` which clears
 * the file.
 */
writeFileSync(STORAGE, "", {flag: "a"})


export const INRUPT = "https://broker.pod.inrupt.com/"

type cacheRecord = {
    id: string,
    secret: string
}

async function responseToQuads(response: Response) {
    const data = await response.text();
    const ct = response.headers.get(CONTENT_TYPE)

    return await arrayifyStream(rdfParser.parse(Readable.from([data]), {
        contentType: ct !== null ? ct.split(";")[0] : "text/turtle",
        baseIRI: response.url,
    }))
}

export default class SolidFetch {
    logger: Logger = new Logger("solidFetch");
    private webID: string;

    private cache: Record<string, cacheRecord>;
    private readonly CSSTokenCache: Record<string, Token>

    constructor() {
        this.loadCacheIfAvailable()
        this.CSSTokenCache = {};
    }

    private loadCacheIfAvailable() {
        const data: Buffer = readFileSync(STORAGE);
        if (!this.cache) {
            this.cache = {};
        }
        if (data.length > 0) {
            const base = JSON.parse(data.toString())
            Object.keys(base).forEach((key: string) => {
                let {id, secret} = base[key]
                this.cache[fromB64(key)] = {id: fromB64(id), secret: fromB64(secret)}
            })
        }
        if (Object.keys(this.cache).length === 0) {
            this.backupCache()
        }
    }

    private backupCache() {
        const base = {}
        Object.keys(this.cache).forEach((key: string) => {
            let {id, secret} = this.cache[key]
            base[B64(key)] = {id: B64(id), secret: B64(secret)}
        })
        writeFileSync(STORAGE, JSON.stringify(base))
    }

    private inruptSession: Session;

    async fetch(url: string, webID: string): Promise<Quad[]> {
        let result: Response
        let failed = false
        // Step -1: try to fetch resource without authentication/authorization
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
            // return result in quads
            return await responseToQuads(result)
        } else {
            this.logger.warn("fetch failed, trying an authorized approach")

            // first step: get oidc issuer
            let quads = await arrayifyStream((await rdfDereferencer.dereference(webID)).data)
            let store = new Store(quads);
            let provider = store.getObjects(webID, "http://www.w3.org/ns/solid/terms#oidcIssuer", null)[0].value
            if (!provider.endsWith("/")) {
                provider += "/";
            }

            // check if there is an <id,secret> pair available.
            if (!this.cache[webID]) {
                if (provider === INRUPT) {
                    /*
                     * for inrupt: [register application](https://broker.pod.inrupt.com/registration.html)
                     */
                    this.logger.info("please register this app on https://broker.pod.inrupt.com/registration.html")
                    let client_id = await ask("client id:")
                    let client_secret = await ask("client secret:")
                    this.cache[webID] = {id: client_id, secret: client_secret}
                    this.backupCache()
                } else {
                    // I presume your provider is a Community Solid Server instance
                    // register using email and password
                    const email = await ask("email");
                    const passwd = await ask("password:", true);
                    /*
                     * Request id and secret according to the [spec](https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/#generating-a-token)
                     */
                    const response = await fetch(`${provider}idp/credentials/`, {
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

                    const json = await response.json();
                    // id and secret from the response
                    let id = json.id;
                    let secret = json.secret;
                    this.cache[webID] = {id, secret}
                    this.backupCache()
                }
            }

            // id and secret are now available.
            const client_id = this.cache[webID].id
            const client_secret = this.cache[webID].secret

            // Collect the resource depending on oidc provider.
            if (provider === INRUPT) {
                /*
                 * Inrupt uses their own library to login and fetch the resource
                 */

                // keep sessions for inrupt webID's
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
                        // we should be logged in here, ready to collect the resource.

                        console.info("INFO::::::::: Logged In with Client Credentials.");
                        // Perform some operation
                        res = await this.inruptSession.fetch(url);
                        return await responseToQuads(res);
                    }
                } catch (err) {
                    console.error("that didn't work either, errored with:");
                    console.log(err);
                    process.exit(1)
                }
            } else {
                // I presume your provider is a Community Solid Server instance
                // If we don't have a valid token
                if (!this.CSSTokenCache[webID] || this.CSSTokenCache[webID].isExpired()) {
                    /*
                     * get the tokenURL and make the request
                     * according to the [spec](https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/#requesting-an-access-token)
                     */
                    const data = await (await nodeFetch(provider + ".well-known/openid-configuration")).json()
                    const tokenUrl = data.token_endpoint;

                    const dpopKey = await generateDpopKeyPair();

                    const authString = `${encodeURIComponent(client_id)}:${encodeURIComponent(client_secret)}`;
                    const response = await fetch(tokenUrl, {
                        method: 'POST',
                        headers: {
                            authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
                            'content-type': 'application/x-www-form-urlencoded',
                            dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
                        },
                        body: 'grant_type=client_credentials&scope=webid',
                    });

                    // access token with expiration in seconds
                    const {access_token: accessToken, expires_in: expiration} = await response.json();
                    // we now have an expirable token with an associated dpop key
                    this.CSSTokenCache[webID] = new Token(accessToken, expiration, dpopKey);
                }
                const accessToken = this.CSSTokenCache[webID];
                const authFetch = await buildAuthenticatedFetch(fetch, accessToken.value(), {dpopKey: accessToken.key()});
                const result = await authFetch(url);

                return await responseToQuads(result);
            }
        }
    }
}