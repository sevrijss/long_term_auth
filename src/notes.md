# Notes taken while developing this library.

The greatest challenge would be that we can't use in-browser login.
So the 'normal' flows described in de docs 
([1](https://solid.github.io/solid-oidc/primer/), [2](https://solid.github.io/solid-oidc/)) 
all use browser logins with redirects. 
When working with Inrupt as an identity provider, we can use 
[the application registration functionality](https://broker.pod.inrupt.com/registration.html). 
That is the code that I'm currently working on, without success.

Found on [this forum](https://forum.solidproject.org/t/authentication-implemented-in-r/4801/2) an implementation. 

Update: Inrupt webID now work with the application registration method, problem was that my webID document was set to private so the oidc issuer could not be found.
