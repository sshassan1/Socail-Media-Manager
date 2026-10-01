# SocialFlow

SocialFlow is a polished, responsive publishing-workspace front end for the product vision in this workspace.

## Run locally

From this folder:

```powershell
python -m http.server 4173
```

Then open <http://localhost:4173>.

## Included in this build

- Responsive light/dark SaaS shell with sidebar navigation and command palette.
- Overview dashboard with publishing pulse, metrics, activity, and upcoming queue.
- Interactive composer with platform selection, live platform previews, caption counter, drag-and-drop media validation, draft, schedule, and publish interactions.
- Connected accounts, calendar, posts, analytics, media library, notifications, and settings views.
- Accessible controls, responsive mobile layouts, keyboard shortcuts, reduced-motion support, and local theme persistence.

## Production integration boundary

The workspace began without a server, database, queue, OAuth credentials, or platform app configuration. The UI therefore uses clearly marked demo data and local interactions only; it does not claim to publish to a social network or store OAuth tokens.

For production, keep secrets server-side and wire the existing UI actions to:

1. Session-based auth and PostgreSQL entities for users, accounts, posts, media, jobs, analytics, notifications, and audit logs.
2. Official Facebook/Instagram, X, and LinkedIn OAuth callbacks with encrypted token storage and reconnect/revoke flows.
3. S3-compatible media storage and a Redis/BullMQ publishing worker with per-platform idempotency keys.
4. Platform adapters that validate capabilities and return honest unsupported/unavailable metric states.

The visual and interaction layer is intentionally dependency-free so it can be moved into a Next.js/React/Tailwind app without changing the product model.
