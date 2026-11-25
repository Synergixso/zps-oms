# Synthetic data, privacy and security

All test/demo data must be fabricated and obviously synthetic. Never use real officer details, service numbers, personal contact details, actual vehicle numbers, real rosters, operational information, incident information or documents.

No connection to Police internal networks, identity providers, databases or APIs. No production data, accounts or external notification services. No public deployment.

Enforce default-deny server-side permissions, organisation-level scoping, least privilege, separation of technical and business privileges, auditable changes and export restrictions. Test negative access cases. Avoid sensitive free-text fields. Logs must not contain credentials, full sensitive payloads or secrets.

If a requirement calls for a prohibited capability or sensitive information, do not implement it. Record the request as out of scope and seek authorised direction if necessary.
