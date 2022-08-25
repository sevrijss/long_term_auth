import rdfParser from "rdf-parse"
import {Logger} from "./util/logger";
import {Quad} from "rdf-js";
import arrayifyStream from "arrayify-stream";
import {ask} from "./util/IoUtil";
import {Session} from "@inrupt/solid-client-authn-node";
import {CONTENT_TYPE} from "./util/HTTPHeaders";
import {Readable} from "stream";
import {readFileSync, writeFileSync} from "fs";
import {B64, fromB64} from "./util/StringUtils";
import rdfDereferencer from "rdf-dereference";
import {Store} from "n3";
import {SOLID} from "./util/Vocabulary";
import {buildAuthenticatedFetch, createDpopHeader, generateDpopKeyPair} from "@inrupt/solid-client-authn-core";
import {Token} from "./util/AccessToken"

const nodeFetch = require('node-fetch')

const fetch = nodeFetch

const I_STORAGE = process.cwd() + "\\config\\I_data.json"
const CSS_STORAGE = process.cwd() + "\\config\\CSS_data.json"

export const INRUPT = "https://broker.pod.inrupt.com/"


type cacheRecord = {
    id: string,
    secret: string
}

async function responseToQuads(response: Response) {
    const data = await response.text();
    const contentType = response.headers.get(CONTENT_TYPE).split(";")[0]
    return await arrayifyStream(rdfParser.parse(Readable.from([data]), {
        contentType: contentType,
        baseIRI: response.url,
    }))
}

export default class SolidFetch {
    logger: Logger = new Logger("solidFetch");
    private webID: string;

    private inruptCache: Record<string, cacheRecord>;
    private CSSCache: Record<string, cacheRecord>;
    private CSSTokenCache: Record<string, Token>

    constructor() {
        this.loadInruptCacheIfAvailable()
        this.loadCSSCacheIfAvailable()
        this.CSSTokenCache = {};
    }

    private loadInruptCacheIfAvailable() {
        const data: Buffer = readFileSync(I_STORAGE);
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
        if (Object.keys(this.inruptCache).length === 0) {
            this.backupInruptCache()
        }
    }

    private loadCSSCacheIfAvailable() {
        const data: Buffer = readFileSync(CSS_STORAGE);
        if (!this.CSSCache) {
            this.CSSCache = {};
        }
        if (data.length > 0) {
            const base = JSON.parse(data.toString())
            Object.keys(base).forEach((key: string) => {
                let {id, secret} = base[key]
                this.CSSCache[fromB64(key)] = {id: fromB64(id), secret: fromB64(secret)}
            })
        }
        if (Object.keys(this.CSSCache).length === 0) {
            this.backupCSSCache()
        }
    }

    private backupInruptCache() {
        const base = {}
        Object.keys(this.inruptCache).forEach((key: string) => {
            let {id, secret} = this.inruptCache[key]
            base[B64(key)] = {id: B64(id), secret: B64(secret)}
        })
        writeFileSync(I_STORAGE, JSON.stringify(base))
    }

    private backupCSSCache() {
        const base = {}
        Object.keys(this.CSSCache).forEach((key: string) => {
            let {id, secret} = this.CSSCache[key]
            base[B64(key)] = {id: B64(id), secret: B64(secret)}
        })
        writeFileSync(CSS_STORAGE, JSON.stringify(base))
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
            return await responseToQuads(result)
        } else {
            this.logger.warn("fetch failed, trying an authorized approach")

            if (provider === INRUPT) {
                if (!this.inruptCache[webID]) {
                    this.logger.info("please register this app on https://broker.pod.inrupt.com/registration.html")
                    let client_id = await ask("client id:")
                    let client_secret = await ask("client secret:")
                    this.inruptCache[webID] = {id: client_id, secret: client_secret}
                    this.backupInruptCache()
                }

                const client_id = this.inruptCache[webID].id
                const client_secret = this.inruptCache[webID].secret

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
                        return await responseToQuads(res);
                    }
                } catch (err) {
                    console.error("that didn't work either, errored with:");
                    console.log(err);
                    process.exit(1)
                }
            } else {
                // I presume your provider is a Community Solid Server instance

                let quads = await arrayifyStream((await rdfDereferencer.dereference(webID)).data)
                let store = new Store(quads);
                let base = store.getObjects(webID, SOLID.oidcIssuer, null)[0].value
                if (!base.endsWith("/")) {
                    base += "/";
                }
                const data = await (await nodeFetch(base + ".well-known/openid-configuration")).json()
                console.log(data);
                const tokenUrl = data.token_endpoint;

                console.log(base);
                console.log(tokenUrl);

                if (!this.CSSCache[webID]) {
                    const email = await ask("email");
                    const passwd = await ask("password:", true);
                    const response = await fetch(`${base}idp/credentials/`, {
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
                    console.log(json);
                    let id = json.id;
                    let secret = json.secret;
                    console.log(id);
                    console.log(secret);
                    this.CSSCache[webID] = {id, secret}
                    this.backupCSSCache()
                }
                const client_id = this.CSSCache[webID].id
                const client_secret = this.CSSCache[webID].secret

                if (!this.CSSTokenCache[webID] || this.CSSTokenCache[webID].isExpired()) {
                    console.log("here");
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
                    console.log(accessToken);
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