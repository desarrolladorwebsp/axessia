---
name: axessia-admin-dashboard-visual
description: "Use when designing or updating AXESSIA private admin views, dashboards, sidebars, headers, metric cards, filter bars, data tables, status badges, avatars, and responsive operational layouts."
---

# AXESSIA Admin Dashboard Visual System

## Scope

This Skill defines the visual language for the private `/app` system. It is a presentation guide only. Do not change business rules, data models, queries, authentication, permissions, integrations, or real workflow state while applying it.

## Visual Direction

The private system should feel operational, premium, calm, and easy to scan. Keep the public website identity, but make the admin area denser and more utilitarian.

- Use `--navy-dark` for the persistent desktop sidebar and `--navy` for deeper surfaces.
- Use `--background` as the main canvas and white surfaces for tables, cards, and filter bars.
- Use the AXESSIA gradient sparingly for primary actions or selected accents.
- Use soft status backgrounds with readable navy or semantic text; avoid saturated fills.
- Keep borders subtle with `--border` and shadows shallow.
- Use Montserrat for headings and Plus Jakarta Sans for interface text.
- Use compact radii between 10px and 16px for operational surfaces.

## Page Composition

1. Header: eyebrow or section label, title, short description, and right-side utility area.
2. Header utilities: notification button, date/time context, export action, and primary action when applicable.
3. Metrics: four or five cards in a responsive grid. Each card may include an icon, a prominent number, a secondary percentage, a thin trend line, and a semantic accent.
4. Filters: one white horizontal bar with search, selects, and an advanced-filter button. On mobile, controls wrap and remain full width.
5. Table: white surface, compact header labels, generous row height, subtle row separators, hover state, avatars/initials, status badges, and icon-only row actions.
6. Footer controls: result count, pagination, and page-size selector when the existing view supports them.

## Reusable Tokens

- Canvas: `var(--background)`
- Primary text: `var(--navy)`
- Muted text: `var(--text-secondary)`
- Border: `var(--border)`
- Blue accent: `var(--blue)`
- Cyan accent: `var(--cyan)`
- Violet accent: `var(--purple)`
- Positive: soft emerald background and emerald text
- Attention: soft amber background and amber text
- Neutral: soft slate background and slate text

Prefer CSS variables and existing utility classes over new hardcoded brand colors.

## Tables

- Keep the table horizontally scrollable only when the information cannot be usefully represented another way.
- On small screens, replace the wide table with stacked records rather than forcing desktop columns.
- Make the first identity column visually strongest with avatar, name, and secondary contact.
- Keep identifiers in blue, metadata muted, and statuses as pill badges.
- Use `Estado actual` for operational state. Do not introduce a `Proximo paso` column unless the product explicitly requires it.
- Use familiar line icons from Lucide inside icon-only buttons and provide `aria-label` plus `title`.

## Motion

Use Motion for short opacity/y-position reveals, staggered metric entry, row appearance, sidebar drawer transitions, and restrained hover feedback. Keep durations around 150-350ms and never delay access to content.

## Responsive Rules

- Desktop: fixed sidebar, wide content, metrics in one row when space allows, filters in one row, full table.
- Tablet: sidebar may collapse, metrics use two columns, filters wrap.
- Mobile: drawer navigation, stacked metrics, wrapped filters, stacked client/request records, and no horizontal page overflow.

## Quality Checklist

- Does the view preserve all existing data and interactions?
- Are title, actions, filters, metrics, table, badges, and pagination visually coherent?
- Are all icon buttons labeled and keyboard accessible?
- Is the mobile representation intentionally designed rather than a clipped desktop table?
- Are no database, API, model, or business-rule changes included?
- Are loading, empty, and error states still present?
