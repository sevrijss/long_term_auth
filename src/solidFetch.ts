import {Logger} from "./util/logger";
import {Quad} from "rdf-js";
import arrayifyStream from "arrayify-stream";
import rdfDereferencer from "rdf-dereference";
import {ask} from "./util/IoUtil";
import {buildAuthenticatedFetch, createDpopHeader, generateDpopKeyPair, KeyPair} from '@inrupt/solid-client-authn-core';
import {Session} from "@inrupt/solid-client-authn-node";

const nodeFetch = require('node-fetch')

const fetch = nodeFetch

type INRUPT_T = "https://broker.pod.inrupt.com/"
export const INRUPT = "https://broker.pod.inrupt.com/"
export type supportedBrowsers = INRUPT_T

type CacheRecord = {
    id: string,
    secret: string
    /* client_id: string,
    client_secret: string,
    token_endpoint: string,
    accessToken: string,
    InruptFetch: undefined | ((input: (RequestInfo | URL), init?: RequestInit) => Promise<Response>),
    CSSFetch: undefined | ((input: (RequestInfo | URL), init?: RequestInit) => Promise<Response>),

     */
}

export default class SolidFetch {
    logger: Logger = new Logger("solidFetch");
    private webID: string;
    private provider: string;

    private cache: Record<string, CacheRecord> = {};

    private dpopKey: KeyPair

    private cachedWebID;

    constructor() {
    }

    async init(webID: string, provider: supportedBrowsers) {
        this.webID = webID;
        this.cachedWebID = webID;
        this.dpopKey = await generateDpopKeyPair();
        this.provider = provider;
        if (provider === INRUPT) {
            this.logger.info("please register this app on https://broker.pod.inrupt.com/registration.html")
            const client_id = await ask("client id:")
            const client_secret = await ask("client secret:")

            let tokenUrl;

            /**
             * code greatly derived from {@link https://communitysolidserver.github.io/CommunitySolidServer/4.x/client-credentials/ CSS}
             */
            const data = await (await nodeFetch(provider + "/.well-known/openid-configuration")).json()
            tokenUrl = data.token_endpoint;

            const authString = `${encodeURIComponent(client_id)}:${encodeURIComponent(client_secret)}`;
            console.log(tokenUrl);
            const response = await nodeFetch(tokenUrl, {
                method: 'POST',
                headers: {
                    // The header needs to be in base64 encoding.
                    authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
                    'content-type': 'application/x-www-form-urlencoded',
                    dpop: await createDpopHeader(tokenUrl, 'POST', this.dpopKey),
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

            /* this.cache[webID] = {
                 client_id,
                 client_secret,
                 token_endpoint: tokenUrl,
                 accessToken: access_token,
                 InruptFetch: authFetch,
                 CSSFetch: null
             }*/

        }
    }

    private readonly matcher = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");

    private inruptSession: Session;
    private inruptWebID;

    async fetch(TYPE: "CSS" | "INRUPT", provider: string, url: string, webID: string) {
        if (!provider.endsWith("/")) {
            provider += "/"
        }
        console.log(provider);
        const result: Response = await nodeFetch(url)
        if (result.ok) {
            const data: Quad[] = await arrayifyStream((await rdfDereferencer.dereference(url)).data)
            console.log(data);
            return data;
        } else {
            this.logger.warn(`fetch failed with code: ${result.status} ${result.statusText}`)

            const parts = url.match(this.matcher);
            let base = parts[1] + parts[3]

            const data = await (await nodeFetch(base + "/.well-known/openid-configuration")).json()
            let tokenUrl = data.token_endpoint;


            if (provider === INRUPT) {
                this.logger.info("please register this app on https://broker.pod.inrupt.com/registration.html")
                const client_id = await ask("client id:")
                const client_secret = await ask("client secret:")
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
                        console.log(this.inruptSession.info);
                        console.log(this.inruptSession);
                        // Perform some operation
                        res = await this.inruptSession.fetch(url);
                    }

                    console.log(res.url)
                    console.log(res.status);
                    console.log(res.statusText);
                    console.log(res.headers);
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
                return;

            }

            if (TYPE === "CSS") {
                let id, secret;
                if (this.cache[webID]) {
                    id = this.cache[webID].id;
                    secret = this.cache[webID].secret
                } else {
                    const email = await ask("email");
                    const passwd = await ask("password:", true);

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

}