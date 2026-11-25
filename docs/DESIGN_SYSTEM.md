# ZPS-OMS UI/UX Design System v0.2

## Design direction

Formal, restrained, high-trust government enterprise software. The interface should feel stable, precise, calm and operationally useful. It must not resemble a tactical command-and-control, intelligence or surveillance product.

## Institutional branding

The user-provided Zambia Police Service crest is the definitive image asset for this concept. It is included as `assets/zambia-police-service-crest.png` and displayed without modification. The crest appears in the shared sidebar brand lock-up, therefore remains visible on every screen.

The top institutional band follows the user's required order:
1. Green at the top.
2. White in the middle.
3. Blue at the bottom.

Provisional screen colour values (not official brand standards):
- Green: `#16823B`
- White: `#FFFFFF`
- Blue: `#133F91`

Confirm official colour specifications with Zambia Police Service before any formal institutional publication.

## Core palette

| Token | Value | Use |
|---|---|---|
| Ink | `#14283F` | Primary text |
| Ink secondary | `#52667B` | Secondary headings |
| Muted text | `#5C6F83` | Supporting labels on light backgrounds |
| Secondary muted | `#64768A` | Metadata and tertiary text on light backgrounds |
| Sidebar | `#12283F` | Navigation surface |
| Canvas | `#F4F6F8` | Main application background |
| Surface | `#FFFFFF` | Cards, panels and tables |
| Border | `#E5EAF0` | Dividers and outlines |
| Police green | `#16823B` | Primary action and institutional stripe |
| Police blue | `#133F91` | Institutional stripe and restrained secondary accent |
| Success | `#31744C` | Confirmed/completed states |
| Warning | `#9E6B21` | Pending/review states |
| Error | `#B33C38` | Errors only |

## Typography

- System sans-serif stack for dependable offline rendering.
- Page title: 24px desktop, 21px mobile, weight 750.
- Panel title: 11.5–12px, weight 750.
- Body: 14px base.
- Table body: 9.5px in this dense prototype. Production should provide user zoom, density controls and accessibility testing before acceptance.
- Avoid all-caps body text. Small uppercase section labels may be used sparingly.

## Layout

- Desktop left navigation: 270px.
- Top bar: 66px desktop, 58px mobile.
- Main content max width: 1720px.
- Desktop content padding: 30px horizontal.
- Card radius: 9px; dialog radius: 12px.
- Use a 4/8/12/16/20/24/30px spacing rhythm.
- Responsive breakpoint: 920px for navigation drawer; 640px for compact layouts.

## Component standards

- Primary button: Police green, white text; one primary action per screen group.
- Secondary button: white surface, neutral border, dark text.
- Metric cards: compact and clearly labelled; all data explicitly synthetic.
- Status: text label plus colour; never colour alone.
- Tables: clear header hierarchy, adequate row padding, horizontal overflow on small displays.
- Forms: visible labels, predictable field order, helpful validation.
- Dialogs: explicit title, explanatory content, clear close/cancel action.
- Empty states: explain what is absent and how to change filters.

## Accessibility

- Semantic HTML landmarks and heading order.
- Skip-to-content link.
- Visible keyboard focus.
- Buttons have accessible labels.
- Modal closes via Escape and backdrop; focus returns to trigger where possible.
- Reduced-motion preference respected.
- Selected primary and supporting text colours are darkened for improved contrast; verify all foreground/background pairs in an automated accessibility audit.
- WCAG 2.2 AA review required before institutional adoption.
- Test 200% zoom, keyboard-only operation, screen reader labels, contrast and narrow screen behaviour.

## Data visualisation

Only non-sensitive administrative metrics may be displayed. Avoid maps, real-time location, deployments, patrol coverage, tactical readiness, incident activity or charts that could reveal police capabilities. All current values are synthetic.
