# Authlib

### Description

This library is used to auto-create access tokens once the user has entered their credentials once.
The user id + secret will be stored **on disk** and is stored in **base64** (not secure).

### Usage

```typescript
// create new SolidFetch object
const sf = new SolidFetch()
// fetch an url
data = await sf.fetch(
    url_to_request,
    webid_to_use_in_request)
```

### Working

First, it will try to request the resource without authentication. 

note: The code wil always try to convert the response from the server to quads, there is currently no error handling for when that fails.

The code performs a check on the `oidc` issuer, if it is equal to `https://broker.pod.inrupt.com/`, it will use the 
`@inrupt/solid-client-authn-node` library and a `Session` to perform authentication and authorization.
Otherwise it will approach the server as it is a CSS instance.

note: this check is incomplete, since other people can set up an ESS type server, which also uses the inrupt libraries,
but there is no mechanism (yet) to tell which technology the server uses.

#### [Enterprise Solid Server](https://inrupt.com/products/enterprise-solid-server/)

If the server is an ESS, the user can register the app on [their website](https://broker.pod.inrupt.com/registration.html).
Again, since other people can set up their own ESS, this url shouldn't be hardcoded. The client can then enter an ID and a 
secret, which will be stored.

This id and secret can be used to log in into a new `Session`, which will create an authenticated fetch for the user.

I found to support to work with webID directly.

Full docs [here](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate-nodejs-script/)

#### [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer)

The CSS requires a different approach. The user can request an ID and a secret using their email and password
(these are not stored, only the secret and the id). 

The id and secret can be used to request an access token connected to a dpop key.
This access token is used to build an authenticated fetch to request the resource.

Full docs [here](https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/)


More examples can be found in [index.ts](src/index.ts)