# PROFINDER

**AI University & Professor Discovery Platform**  
*Minimalist & Tech-Forward*

Web app for international students to discover Chinese universities, programs, research areas, and professors — with transparent research matching, personalized outreach drafts, Free/Pro plans, and application tracking.

**Live repo:** https://github.com/kinzafatima13/profinder

---

## Features

- University & program browsing (China MVP)
- Professor discovery + research-area filters
- Transparent research match (weighted score + explanation)
- Find Professors for Me
- Sign up / Log in / Log out (NextAuth credentials)
- Free vs Pro plans (demo upgrade)
- Application tracker (save, status updates, free limit of 5)
- Personalized outreach email drafts (Pro)
- Pricing page

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (dev) — PostgreSQL-ready
- NextAuth.js (credentials + JWT)
- bcryptjs

## Quick start

```bash
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000

### Demo account

- Email: `demo@profinder.app`
- Password: `demo1234`

## Environment

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-in-production"
```

For production PostgreSQL, set `DATABASE_URL` to your Postgres URL and change `provider` in `prisma/schema.prisma` to `postgresql`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run db:setup` | Push schema + seed |
| `npm run db:seed` | Re-seed only |
| `npm run build` | Production build |

## Data note

Seed data includes sample universities and professors for product development. For production, replace with verified information from official university pages and keep source URLs + verification dates.

## Roadmap

- [ ] Verified real professor/university data pipeline
- [ ] LLM-backed email (optional API key)
- [ ] CV upload + extraction
- [ ] Stripe billing
- [ ] Deploy (Vercel + managed Postgres)

## License

Private / educational product starter.
