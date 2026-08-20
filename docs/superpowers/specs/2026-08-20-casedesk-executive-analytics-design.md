# CaseDesk Executive Analytics redesign

Date: 2026-08-20  
Status: Approved visual direction; awaiting written-spec review

## Objective

Redesign the existing `/case-desk` prototype around the selected **Executive Analytics** direction. The overview should help an authorised user understand case volume, review performance, current workload, and notable changes at a glance, while preserving direct access to individual submissions, evidence, accounts, and admin decisions.

## Product boundaries

- Keep this a synthetic-data prototype. Do not add database persistence, production authentication, permanent file storage, public search, or external disclosure.
- Preserve the terminology **user** and **verified personnel**. Do not use employer, employee, or worker in the CaseDesk interface.
- Preserve the existing intake fields, including the 10-option occupation selector, complaint, recent event, past event, and evidence upload.
- Preserve the existing restrictions against FIN, passport, medical-certificate, health, injury, and lawful union-activity data.
- Do not change unrelated SpaceOnCall routes, shared business logic, schemas, or the Android project.

## Visual direction

Use a dark navy operational canvas with cyan information signals and green positive-status accents. Amber is reserved for pending attention; red is reserved for returned or blocked cases. The interface should feel precise and management-ready without becoming a decorative trading dashboard.

Typography remains highly legible: a compact sans-serif for navigation and body content, with tabular numerals for KPIs. Charts use direct labels and never depend on colour alone. Surfaces use restrained borders and subtle depth rather than glass effects or heavy glow.

## Information architecture

The left navigation contains:

1. Overview
2. New submission
3. Admin review
4. Accounts
5. Personnel graph
6. Audit

Overview is the default view. New submission, Admin review, and Accounts retain their existing interactive behaviour. Personnel graph exposes the current controlled-information relationship map as a dedicated view. Audit is a prototype view of recent case and account decisions derived from browser-session state.

## Overview layout

### Header

Show the current section, synthetic-data status, verified-user identity, and a prominent **New submission** action. Keep the legal-safety restriction visible without allowing it to dominate the analytics.

### KPI row

Show five primary metrics:

- Total cases
- Pending reviews
- Approval rate
- Evidence files
- Average review time

Every KPI includes a plain-language label and supporting context. Values are calculated from the current synthetic case array; average review time uses a clearly labelled demo value because the prototype does not yet store decision timestamps.

### Analytics region

Use a six-month case-volume bar chart as the main visualization. Pair it with a decision-distribution visualization for pending, approved, and returned cases. Both charts include direct values, accessible text summaries, and empty states.

### Operational region

Show a priority review queue and recent activity beside or below the charts. Pending cases appear first. Selecting a case opens Admin review with that case active. Recent activity includes case submissions, decisions, and account approval changes available in the current browser session.

## Detailed views

### New submission

Retain the factual-submission form and 10-option occupation selector. Restyle it to match the analytics shell. Submission creates a pending synthetic case, announces success through the live region, and moves the user to Admin review.

### Admin review

Use a review workspace with a selectable queue and detailed case panel. Keep complaint, recent event, past event, evidence names, admin note, approve, and return actions visible. Decisions immediately update overview metrics and recent activity.

### Accounts

Retain account creation and approval. The view shows pending or approved state, identity and organisation checks, intended use, and the approval action.

### Personnel graph

Promote the existing relationship visualization into its own navigation view. It shows the controlled path between verified user, private submission, evidence, admin decision, personnel response, and one-time authorised release. It is not a person-search graph.

### Audit

Show a chronological, read-only list of synthetic session events. Each event includes time, action, target, actor type, and status. The prototype does not claim durable audit logging.

## Interaction and state

Continue using React component state and the existing synthetic records. Add only the minimum derived values needed for KPIs, charts, priority sorting, and session activity. Navigation changes views without changing the URL. Refresh resets the prototype.

All actions provide an accessible status announcement. Disabled and empty states explain why an action is unavailable. Evidence selection displays file names only and does not upload files to a server.

## Responsive behaviour

- Desktop: fixed navigation rail, KPI row, two-column analytics region, and dense case workspace.
- Tablet: compact navigation, wrapped KPIs, stacked analytics panels.
- Mobile: icon navigation, single-column KPIs and charts, full-width forms, and queue-before-detail review flow.
- No horizontal overflow at 412 CSS pixels.

## Accessibility

- One page-level `h1` and logical heading order.
- Keyboard-operable navigation, forms, queue rows, and decisions.
- Visible focus styles and minimum 44-pixel touch targets on mobile.
- WCAG AA text contrast.
- Chart values available as text; status is not communicated by colour alone.
- Motion respects `prefers-reduced-motion`.

## Error and empty states

- No matching cases: explain that filters can be cleared.
- No evidence: show an explicit no-evidence message.
- No pending cases: show a completed-queue state with a route back to Overview.
- Invalid or incomplete form: rely on labelled native validation and retain the entered values.
- Unsupported evidence type: the file input remains limited to PDF, PNG, and JPEG.

## Implementation scope

Modify only:

- `app/case-desk/page.tsx`
- `app/case-desk/case-desk.module.css`
- `tests/case-desk.test.ts`

Do not add dependencies. Reuse React, CSS, and the installed Lucide icons.

## Verification and acceptance

The redesign is complete when:

1. The Executive Analytics overview displays all five KPIs, both chart regions, priority queue, and recent activity.
2. New submission, case decisions, and account approval update the relevant synthetic dashboard state.
3. New submission, Admin review, Accounts, Personnel graph, and Audit are reachable through the navigation.
4. Legacy employer, employee, and worker terminology is absent from CaseDesk source content.
5. The focused CaseDesk regression test passes.
6. The Next.js production build passes and lists `/case-desk`.
7. Scripted desktop and 412-pixel mobile checks show no horizontal overflow and confirm the main interactions.
