<!-- omit in toc -->
# Authlib

This library allows for server-side systems to perform authenticated requests to any Solid pod.
Right now, this kind of behavior is not spec'd, so expect this library to break much and often.

> TODO specify what can of access is allowed: is it based on the WebID of the user, or is an application registered that can work based on the WebID of the user, or what?

- [Description](#description)
- [Installation](#installation)
- [Usage](#usage)
- [Working](#working)

### Description

This library is used to auto-create access tokens once the user has entered their credentials once.
The user id + secret will be stored **on disk** and is stored in **base64** (not secure).

> TODO specify where on disk this secret is stored, and where in the code this is specified

### Installation

> TODO include installation instructions

### Usage

```typescript
// create new SolidFetch object
const sf = new SolidFetch()
// fetch an url
data = await sf.fetch(
    url_to_request,
    webid_to_use_in_request)
```

> TODO include the import/require statements. This piece of code should be self-standing.

### Working

First, it will try to request the resource without authentication.

> Note: The code wil always try to convert the response from the server to quads, there is currently no error handling for when that fails.

> TODO specify: is the text below the 'Second' part? Then add something like 'Second, it will try to detect and use the right kind of authentication/authorization flow'

The code performs a check on the `oidc` issuer,
if it is equal to `https://broker.pod.inrupt.com/`,
it will use the `@inrupt/solid-client-authn-node` library and a `Session`
to perform authentication and authorization.
Otherwise it will approach the server as it is a CSS instance.

> TODO specify what 'approach the server as it is a CSS instance' means, or link the the right section later in this readme.
> In case of the latter: I would include the "`@inrupt/solid-client-authn-node` library and a `Session` to perform authentication and authorization." as part of the ESS section

> Note: this check is incomplete, since other people can set up an ESS type server, which also uses the inrupt libraries,
but there is no mechanism (yet) to tell which technology the server uses.

#### [Enterprise Solid Server](https://inrupt.com/products/enterprise-solid-server/)

If the server is an ESS, the user can register the app on [their website](https://broker.pod.inrupt.com/registration.html).
Again, since other people can set up their own ESS, this url shouldn't be hardcoded.
The client can then enter an ID and a secret, which will be stored.

This ID and secret can be used to log in into a new `Session`, which will create an authenticated fetch for the user.

I found to support to work with webID directly.

> TODO what do you mean with the above sentence?

Full docs [here](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate-nodejs-script/)

#### [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer)

The CSS requires a different approach. The user can request an ID and a secret using their email and password
(these are not stored, only the secret and the id).

The ID and secret can be used to request an access token connected to a DPoP key.
This access token is used to build an authenticated fetch to request the resource.

Full docs [here](https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/)

More examples can be found in [index.ts](src/index.ts)

> TODO specify how to run index.ts, and provide all the resources to make it run out of the box:
> example resources (config/data.json), commands to run the right CSS instance, etc.

> Note: you will need to run a CSS instance on localhost:3000 if you want the example code to work.
> Some urls may need to be edited.

> TODO: specify which urls may need to be edited: only the ones currently including `localhost:3000`?
