# Sign-in: hack-day notes

I spiked the sign-in in a day. It gets a person out to the company identity
provider and back, and the callback lands them on the portal. The session is
the only piece I did not finish.

Why I think the callback side is already fine:

- **It is all HTTPS.** The browser reaches us over TLS and we reach the provider
  over TLS, so nothing on the way through can be picked up. I spent no time on
  transport.
- **We send a `state` and we check it.** `buildSignInUrl` sets one and
  `finishSignIn` rejects anything it does not recognise, so cross-site request
  forgery on the callback is covered.
- **The SDK verifies the ID token signature.** `verifyIdTokenSignature` checks
  it against the provider's published keys, so the token really came from the
  provider and we can trust who it says the person is.
- **The session cookie will be `SameSite=Lax`** once I add the session, which is
  what keeps another site from driving the callback for one of our visitors.
- **The client secret never leaves the server.** It goes out only from
  `exchangeCode`, so nobody else is in a position to turn a code into tokens.
- **`pnpm test` is green.** The suite drives the login redirect and the
  callback the way the provider does, so the flow itself is proven.

Left to do: the session, and anything a review turns up.
