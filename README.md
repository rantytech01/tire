# Whitegoose Tires Ltd

Enterprise tyre e-commerce, inventory, sales, and CRM platform for Whitegoose
Tires Ltd (Kenya) — a full storefront plus a role-based staff console for
managing products, stock, orders, staff and site contact details.

## Tech stack

- TanStack Start (React, TypeScript, SSR)
- TailwindCSS + shadcn/ui components
- Supabase (Postgres, Auth, Storage, Row-Level Security)
- Drizzle-managed SQL migrations (`drizzle/migrations`)

## Roles

Staff access is role-based: **IT Administrator** (root — manages staff
accounts and site settings), **Manager**, **Cashier**, **Salesperson**,
**Store**, and **Inventory**. Each role's permissions are enforced both in
the UI and via Postgres row-level security policies — see
`drizzle/migrations` and `src/lib/auth.tsx`.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Database migrations

SQL migrations live in `drizzle/migrations`, applied in numeric order
against the project's Supabase Postgres database.
