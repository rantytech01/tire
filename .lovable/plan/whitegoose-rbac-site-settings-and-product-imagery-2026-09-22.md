# Whitegoose RBAC, Site Settings, and Product Imagery

## Goal
Replace the current staff access model with seven clearly separated roles, add IT Admin-only staff and site management, and replace generic vehicle imagery with accurate tyre/product photography.

## Role and dashboard access
Use one shared permission matrix in the app and matching database policies:

| Area | IT Admin | Admin | Manager | Cashier | Salesperson | Store | Inventory |
|---|---:|---:|---:|---:|---:|---:|---:|
| Full overview | Yes | Yes | Yes | Limited | Limited | Limited | Limited |
| Products and pricing | Yes | Yes | Yes | View | View | View | Yes |
| Orders | Yes | Yes | Yes | Checkout/payment | Create/update sales | Fulfilment | View only |
| Stock | Yes | Yes | Yes | Sale-linked | View | Receive/dispatch | Count/adjust |
| Reports | Yes | Yes | Yes | No | Own-sales summary | Stock/fulfilment | Stock reports |
| Staff accounts and roles | Yes | No | No | No | No | No | No |
| Site settings | Yes | No | No | No | No | No | No |

Each dashboard will show only permitted navigation, summaries, tables, and actions. Database rules will enforce the same restrictions so hidden controls cannot be bypassed.

## Staff administration
- Replace the old role names with `IT Admin`, `Admin`, `Manager`, `Cashier`, `Salesperson`, `Store`, and `Inventory`.
- Preserve existing root access by migrating current root `admin` users to `it_admin`; introduce `admin` as the new non-root role.
- Build secure server-side staff creation using email plus a temporary password.
- Allow only IT Admin to create staff accounts, change roles, revoke access, or view the full staff directory.
- Require the staff member to change the temporary password after first sign-in.
- Prevent removal or demotion of the final IT Admin and record role/account changes in an audit log.

## Site Settings
- Add an IT Admin-only `Site Settings` dashboard section.
- Store phone, WhatsApp, email, physical address, Google Maps embed URL, and social links in a persistent settings record.
- Seed the record with the current site values so nothing disappears after migration.
- Replace hardcoded values throughout the header, footer, WhatsApp actions, and contact page with live settings.
- Validate phone, email, HTTPS social links, and safe Google Maps embed URLs before saving or displaying them.
- Make public contact settings readable by the storefront but writable only by IT Admin.

## Product photography
- Replace the homepage image with a clear, premium close-up tyre/tread photograph.
- Replace the eight reused generic URLs with product-specific or category-correct studio photography for every seeded item.
- Match exact listed brand/model imagery from reliable manufacturer/product sources where practical; use clearly accurate studio photography for the relevant tyre class when an exact model image is unavailable.
- Use correct imagery for truck, bus, agricultural, industrial, wheel, battery, and accessory products instead of reusing passenger-car tyre photos.
- Store all selected images in the project asset flow rather than hotlinking external image URLs.
- Add a data migration that updates existing catalog rows, not only fresh installs.

## Technical implementation
- Import the uploaded application source safely without Git metadata or generated output.
- Enable the project backend and add a migration for the expanded role enum, permission helper functions, hardened row-level policies, site settings, role audit history, and initial settings/image updates. Every new public table will include explicit grants before RLS policies.
- Add authenticated server functions for IT Admin-only account creation and role management; privileged credentials remain server-only.
- Centralize role labels and permissions to prevent UI/database drift.
- Add a reusable settings query/provider for public pages and an IT Admin settings editor.
- Update generated database types for the new roles, tables, and functions.
- Keep the existing visual design and storefront structure except for the requested imagery and new administration screens.

## Validation
- Verify each role sees only its allowed dashboard sections and actions.
- Verify non-IT roles cannot call staff or settings operations directly.
- Verify temporary-password account creation and forced password change behavior.
- Verify settings changes appear in the header, footer, contact page, WhatsApp links, map, and social links.
- Check all catalog images for correct subject, loading, cropping, and mobile/desktop presentation.
- Run focused tests and inspect the storefront and admin console in desktop and mobile browser views.
