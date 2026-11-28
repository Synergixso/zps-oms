# Single sign-on — integration design (issue #9)

Status 28 Nov 2026: **design only; no identity provider has been named by the Service.** Local accounts (scrypt hashing, lockout, session expiry, MFA-ready) remain the only sign-in method. Nothing here invents a provider, endpoints or credentials.

## Decisions needed from the Service (ZPS ICT)
1. The identity provider and protocol: OpenID Connect (preferred: simpler, JSON, PKCE) or SAML 2.0.
2. A test tenant/realm with test accounts (no real officers) for integration testing.
3. Which claim carries the stable user identifier (e.g. `sub`, an employee number) and whether a service number is released.
4. Whether MFA is enforced by the provider (recommended) and at what assurance level.
5. Whether roles are provisioned in ZPS-OMS (recommended: yes — role + scope assignments stay governed here, DEC-072) or derived from provider groups.

## Architecture (when the provider is supplied)
- **Adapter:** one module `src/server/auth/idp.ts` implementing `beginLogin()` (authorisation-code flow with PKCE and `state`/`nonce`) and `completeLogin(callback)` (token validation: issuer, audience, signature against the provider's published keys, expiry, nonce). Configured only through environment variables (`ZPS_IDP_ISSUER`, `ZPS_IDP_CLIENT_ID`, `ZPS_IDP_CLIENT_SECRET` from the secret store, `ZPS_IDP_REDIRECT_URI`); added to `config-check.ts`.
- **Account linking:** an existing ZPS-OMS account is linked to the provider subject once, by an administrator (`users.idp_subject`, migration when implemented); first sign-in never creates an account (no self-registration, M02-1). Unlinked subjects are refused and audited.
- **Sessions:** after a successful provider login, the existing session mechanism issues the same HttpOnly session cookie; idle and absolute timeouts are unchanged; sign-out ends the local session and, if the provider supports it, calls front-channel logout.
- **Authorisation:** unchanged — role assignments with scope and command appointments decide access; the provider authenticates only.
- **Fallback:** local password sign-in stays available for break-glass technical accounts only, controlled by a platform setting, audited.

## Tests required (acceptance for #9)
Authorisation-code flow against the test tenant; tampered `state`, wrong `nonce`, expired token, wrong audience and unknown issuer all refused; unlinked subject refused; linked account signs in with its existing roles; session timeouts and sign-out; audit events for each outcome; route audit and security probes with SSO enabled.
