# ZPS-OMS UI/UX Screen Specification v0.2

## Global shell

Every application screen shares:
- Top green/white/blue institutional band.
- Persistent left navigation on desktop and responsive navigation drawer on mobile.
- User-supplied Zambia Police Service crest, shown in a white lock-up with preserved proportions.
- ZPS-OMS product title and Operations Management subtitle.
- Breadcrumb, demonstration environment indicator and static demonstration identity.
- Persistent synthetic-data notice.
- Footer with prototype disclaimer and institutional colour reference.

## Screen 1 — Operations overview

Purpose: provide an authorised, non-sensitive administrative summary of the scope configured in the demonstration.

Components:
- Page title and description.
- Organisational scope and date-range selectors (demonstration only).
- Summary cards for provincial divisions, formation references, synthetic fleet records and requests awaiting review.
- Administrative request activity chart.
- Request status summary.
- Recent administrative activity table.
- Organisational coverage panel.

Do not add live operational status, deployment, personnel location or tactical metrics.

## Screen 2 — Provincial divisions

Purpose: display the ten Provincial Division reference entries.

Components:
- Searchable division cards.
- Province label and provisional reference ID.
- Notice that current names, boundaries, titles and reporting relationships require internal validation.

## Screen 3 — Divisional formations

Purpose: display the public-source formation baseline as configurable references.

Components:
- Formation cards.
- Public-chart baseline label.
- Explicit notice that formation status, exact title and reporting relationship require confirmation against the approved establishment.

## Screen 4 — Fleet & transport

Purpose: demonstrate non-sensitive vehicle register and service administration.

Components:
- Fleet summary cards.
- Vehicle reference, class, organisational area, last service, next service, administrative status.
- Search and filters.
- Synthetic-record detail dialog.

Exclude live vehicle location, assignment to tactical activity, routes, deployments, crew whereabouts or operational use.

## Screen 5 — Maintenance requests

Purpose: manage routine administrative maintenance requests.

Components:
- Counts for review, progress and completion.
- Request register with reference, type, organisational area, date, service category and status.
- Search, status and category filters.
- Detail dialog.

## Screen 6 — Assets & equipment

Purpose: provide accountability for ordinary institutional assets and non-sensitive equipment.

Components:
- Summary cards for illustrative asset counts.
- Asset reference, description, category, organisational area, custody status and condition.
- Search and filters.

Exclude controlled weapons, armoury records and operationally sensitive equipment.

## Screen 7 — Administrative requests

Purpose: present a traceable administrative request register.

Components:
- Sample request counts.
- Reference, subject, organisational area, submission date, responsible service and status.
- Local demonstration-only request form.

The form must clearly state that no information is transmitted or stored and must not solicit real police data.

## Screen 8 — Reports & insights

Purpose: show examples of non-sensitive administrative reports.

Components:
- Fleet administration summary.
- Maintenance workflow summary.
- General asset accountability.
- Administrative request performance.
- Sample aggregate status summary.

Production reports require approved classification, source-of-record and release rules.

## Screen 9 — Users & permissions

Purpose: explain proposed role and organisational-scope controls, not create production accounts.

Components:
- National viewer, provincial administration, formation administration, fleet officer, asset custodian and internal auditor role cards.
- Least privilege, organisational scope, separation of duties and auditability principles.

Do not create default credentials or production identity flows in this prototype.

## Interaction inventory

- Sidebar navigation between all nine screens.
- Mobile menu drawer.
- Search filtering for visible lists/tables.
- Filter controls for sample tables.
- Demonstration dialogs for exports, record details and sample submissions.
- Help and demonstration-user information dialogs.
- Escape/backdrop/close controls for dialogs.

## Prototype limitations

No backend, database, authentication, authorisation, persistent writes, production audit logging, secure file upload, external APIs or connection to police systems are implemented. The interface is a frontend concept only.
