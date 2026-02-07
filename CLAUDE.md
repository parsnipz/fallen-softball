# Fallen Softball

## Project Overview
Softball team management app with PDF generation and digital signatures.

## Tech Stack
- **Framework:** Vite + React 18
- **Database:** Supabase
- **PDF:** jsPDF, pdf-lib
- **Signatures:** react-signature-canvas
- **Routing:** React Router v6
- **Styling:** Tailwind CSS

## Key Directories
- `src/` - React application code
- `public/` - Static assets
- `dist/` - Build output

## Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Database & Supabase
- **Project ID:** `secuulzovvuprrpqyyot`
- **Dashboard:** https://supabase.com/dashboard/project/secuulzovvuprrpqyyot
- **Deployed at:** https://fallen-softball.vercel.app/
- Schema in `supabase-schema.sql`
- Migration in `supabase-migration.sql`

## Authentication
- Uses **Supabase Auth** exclusively (email/password)
- The `managers` table in the schema is **NOT USED** by the app
- Admin access = anyone who can log in via Supabase Auth
- To add new admins: Supabase Dashboard → Authentication → Users → Add user

### Authorized Admins (in Supabase Auth)
- Jmgrannum@hotmail.com

## Quick Start
When starting a session, check:
1. Current state: `git status`
2. Any pending features or bugs
