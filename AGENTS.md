# Neon setup instructions for ProFinderNow

## Project context
- Repository: `kinzafatima13/profinder`
- App: Next.js + Prisma + NextAuth
- Neon project/branch previously proposed: project ID `bitter-moon-95973488`, branch `production`; ownership and linkage must be verified before using it.
- The app already has an authentication provider (NextAuth). Do not enable or migrate to Neon Auth unless explicitly requested.
- Existing SQLite data and the Postgres migration path must be preserved.

## Neon agent tooling
Project-level official Neon skills are stored in:
- `.agents/skills/neon/SKILL.md`
- `.agents/skills/neon-postgres/SKILL.md`

When working in a local coding-agent workspace:
1. Inspect the current directory, existing MCP config files, installed CLI, and Neon auth state first. Never print tokens, passwords, API keys, or database connection strings.
2. Preserve any existing MCP configuration. Merge only the Neon server entry if one is needed; do not replace the whole config.
3. If the Neon CLI is available and the user has authenticated, use the official CLI skill commands for the active agent. For project-scoped MCP prefer OAuth:
   `neon mcp --oauth --project --agent <agent-name> -y`
   Use the actual agent identifier supported by `neon mcp --help`; do not guess.
4. If the CLI is missing, install it with the package manager available in the environment, then verify with `neon --version`. If authentication is required, pause for the user to authenticate; never launch browser authentication unattended.
5. Update already-installed Neon skills with `neon skills update -y` only after checking what is installed.
6. Do not run `neon deploy`, `prisma db push`, destructive migrations, reset, truncate, or data-copy scripts as part of MCP/skill setup. Tool installation is separate from database migration and deployment.
7. Do not run `neon link` until the user-owned Neon project and target branch are verified. If linking is approved, use `--no-env-pull` to avoid overwriting existing local environment files, and never display secrets.
8. Report exactly which files/settings changed and which checks could not be completed.

## Database safety requirements
Before any database migration, inspect the full Prisma schema and migration script, enumerate all models and relations, create and verify a backup of the source SQLite database, and validate a complete non-destructive migration plan. Existing users, password hashes, admin roles, IDs, and foreign-key relationships must be preserved. Do not assume a partial-table migration is complete.
