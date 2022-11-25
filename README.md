<!-- omit in toc -->
# Authlib

This library allows for server-side systems to perform authenticated requests to any Solid pod.
Right now, this kind of behavior is not spec'd, so expect this library to break much and often.


The access of the user depends on whether the webID has the correct access for the file you are trying to access,
this will probably be configured using an Access Control List (acl).
The inrupt library works via application registration (see [here](https://broker.pod.inrupt.com/registration.html))

- [Description](#description)
- [Installation](#installation)
- [Usage](#usage)
- [Working](#working)

### Description

This library is used to auto-create access tokens once the user has entered their credentials once.
The user id + secret will be stored **on disk** and is stored in **base64** (not secure).

The default location is `long_term_auth/config/data.json`, this can be changed by editing this line in [solidFetch.ts](src/solidFetch.ts):
```typescript
const STORAGE = process.cwd() + "\\config\\data.json"
```

### Installation

```shell
git clone https://github.com/sevrijss/long_term_auth
cd long_term_auth
npm i
npm run build
mkdir config      # the credentials will be saved in this folder
touch config/data.json
```

### Usage

```typescript
import SolidFetch from "./solidFetch";
const url_to_request = "";
const webid_to_use_in_request = "";
// create new SolidFetch object
const sf = new SolidFetch()
// fetch an url
data = await sf.fetch(
    url_to_request,
    webid_to_use_in_request)
```

### Working

First, it will try to request the resource without authentication.

> Note: The code wil always try to convert the response from the server to quads, there is currently no error handling for when that fails.

Second, we will try to authenticate the user and see if the user has the correct authorization.

The code performs a check on the `oidc` issuer,
if it is equal to `https://broker.pod.inrupt.com/` it approach the server as an ESS,
Otherwise it will approach the server as it is a CSS instance, because that requires a different approach.

> Note: this check is incomplete, since other people can set up an ESS type server, which also uses the inrupt libraries,
but there is no mechanism (yet) to tell which technology the server uses.

#### [Enterprise Solid Server](https://inrupt.com/products/enterprise-solid-server/)

If the server is an ESS, the user can register the app on [their website](https://broker.pod.inrupt.com/registration.html).
Again, since other people can set up their own ESS, this url shouldn't be hardcoded.
The client can then enter an ID and a secret, which will be stored.
The code will now use the `@inrupt/solid-client-authn-node` library and a `Session`
to perform authentication and authorization.

This ID and secret can be used to log in into a new `Session`, which will create an authenticated fetch for the user.

I found no support to work with webID directly.

Full docs [here](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate-nodejs-script/)

#### [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer)

The CSS requires a different approach. The user can request an ID and a secret using their email and password
(these are not stored, only the secret and the id).

The ID and secret can be used to request an access token connected to a DPoP key.
This access token is used to build an authenticated fetch to request the resource.

Full docs [here](https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/)

More examples can be found in [index.ts](src/index.ts)
#### Run examples
First setup a CSS instance for the examples to use:
```shell
git clone https://github.com/CommunitySolidServer/CommunitySolidServer.git
cd CommunitySolidServer
npm ci
npm start -- # add parameters if needed
```
(see [official github](https://github.com/CommunitySolidServer/CommunitySolidServer#-installing-and-running-from-source) for more information)

Go to your browser and configure the CSS with a pod.

In [index.ts](src/index.ts) change the following variables to the correct values:
```typescript
const CSSUrl = "http://localhost:3000"  // change if your endpoint has a different ip
const podName = "TestPod"               // Name of your configured pod
const openResource = `${CSSUrl}/${podName}/profile/card#me`  // should be auto-generated by CSS
const lockResource = `${CSSUrl}/${podName}/.acl`           // should be auto-generated by CSS

const CSSLocked = `http://localhost:3000/${podName}/.acl`

const CSSWebID = `${CSSUrl}/${podName}/profile/card#me`
const inruptWebID = ""       // the webID of your inrupt account.
```
Now you should be able to run
```shell
node ./build/index.js
```

> Note: you will need to run a CSS instance on localhost:3000 if you want the example code to work.
> Some urls may need to be edited.
