# Prompt 04 — Implement an Approved Local Synthetic Prototype

Only execute this prompt after the user explicitly instructs implementation and confirms that the applicable toolchain is already available and approved for synthetic project source.

First inspect the repository and state the exact scope, files, dependencies, tests and zero-cost implications. Implement only the approved local synthetic prototype stories. Do not add features beyond the accepted story.

Mandatory controls:
- No live police data, no external integrations, no Police network, no production identity, no public deployment.
- No paid tool, subscription, API, cloud service, credit or hardware. Stop on any payment requirement.
- Server-side default-deny permissions; organisation scoping; separation of technical and business privileges; audit event coverage for synthetic data.
- No prohibited operational features or sensitive fields.
- No assumptions about official chain of command; organisation graph must remain configurable.

After implementation, run lint, type checks, unit/integration tests, security/dependency checks available locally and negative authorisation tests. Review the complete diff for scope creep, secrets and data leakage. Update README, traceability and decision log. Report exactly what was implemented and what remains unapproved.
