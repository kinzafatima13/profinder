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


## Open this exact version in VS Code

```bash
git clone https://github.com/kinzafatima13/profinder.git
cd profinder
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

Open http://localhost:3000

Do **not** run `npm run db:setup` or `npm run db:seed` on this copy. `prisma/seed.ts` calls `deleteMany()` on universities, professors, programs, and scholarships. The current faculty import lives in `prisma/dev.db`, which is already committed.

`DATABASE_URL` in `.env` must stay `file:./dev.db`. Prisma resolves that path from the `prisma/` folder.

Demo account after a fresh seed only: `demo@profinder.app` / `demo1234`. The committed database may not contain that user.

### Current database

`prisma/dev.db` is the working SQLite file. It has 104 universities and 1,152 professors. 18 universities have professors; the other 86 are listed with none yet. Do not replace this file with an older copy.

`prisma/schema.prisma` is ahead of the SQLite file. Do not run `prisma db push` unless you intend to add the newer columns. It is not required to start the app against the current file.

### Add a university

Insert a row only if `name` is not already in `University`. Use the same columns as the existing rows: name, country, province, city, officialUrl, description, agencyNumber. Source records are in `data/universities.json`. Do not copy `https://www.campuschina.org/` if you have a verified official site.

### Add professors / run the faculty import

Extracted rows are in `data/official-faculty/faculty-test-5.json`. Reports are in `data/import-reports/`.

`scripts/upsert-official-faculty.ts` upserts by university name and does not delete. It expects the Prisma schema columns. Against the current SQLite file, use a name match and only the columns that exist: name, position, school, department, email, profileUrl, researchInterests, dataStatus. Keep an existing email or research interest when the new value is empty. Do not use a shared directory URL as a person's identity.

### Build

```bash
npx prisma generate
npm run build
npm start
```

### Deploy

The app is a Next.js 14 project. Set `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` in the host. SQLite on serverless hosts does not persist. For a real deploy, point `DATABASE_URL` at PostgreSQL and change `provider` in `prisma/schema.prisma` to `postgresql`, then run `prisma db push` against that empty database and import. Do not run the seed on the database that has the faculty import.

Stripe and SMTP in `.env.example` are optional. Billing and email stay inactive until those values are set.
