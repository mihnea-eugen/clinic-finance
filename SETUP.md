# Setup Clinic Finance App

## Conturi necesare
- Supabase: https://supabase.com/dashboard/project/mfhuomzltxvktjkmrucn
- Vercel: https://vercel.com/mihnea-6999s-projects
- GitHub: contul tău
- Anthropic API: https://console.anthropic.com/settings/keys

---

## Pasul 1 — Supabase: rulează schema SQL

1. Deschide: https://supabase.com/dashboard/project/mfhuomzltxvktjkmrucn/sql
2. Copiază tot conținutul din `supabase/schema.sql`
3. Paste → Run
4. Verifică că apar tabelele în Table Editor

---

## Pasul 2 — Supabase: activează Google Auth

1. Mergi la: Authentication → Providers → Google
2. Enable Google Provider
3. Du-te la Google Cloud Console: https://console.cloud.google.com
4. Creează un proiect sau folosește unul existent
5. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
6. Application type: Web application
7. Authorized redirect URIs: adaugă:
   ```
   https://mfhuomzltxvktjkmrucn.supabase.co/auth/v1/callback
   ```
8. Copiază Client ID și Client Secret
9. Pune-le înapoi în Supabase → Authentication → Providers → Google

---

## Pasul 3 — Cheile Supabase

Găsești cheile la: https://supabase.com/dashboard/project/mfhuomzltxvktjkmrucn/settings/api

- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (secret!)

---

## Pasul 4 — Cheia Anthropic (pentru AI extragere)

1. Mergi la https://console.anthropic.com/settings/keys
2. Create Key
3. Copiaz-o → `ANTHROPIC_API_KEY`

---

## Pasul 5 — Setup GitHub + Vercel

### GitHub
```bash
# In folderul clinic-finance:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/clinic-finance.git
git push -u origin main
```

### Vercel
1. Mergi la https://vercel.com/mihnea-6999s-projects
2. Add New Project → Import Git Repository → clinic-finance
3. Framework: Next.js (autodetectat)
4. Environment Variables — adaugă TOATE variabilele din .env.example:

```
NEXT_PUBLIC_SUPABASE_URL=https://mfhuomzltxvktjkmrucn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=https://clinic-finance.vercel.app
NEXT_PUBLIC_START_DATE=2026-05-04
```

5. Deploy

---

## Pasul 6 — Supabase: adaugă URL-ul Vercel

1. Authentication → URL Configuration
2. Site URL: `https://clinic-finance.vercel.app` (URL-ul real de pe Vercel)
3. Redirect URLs: adaugă `https://clinic-finance.vercel.app/auth/callback`

---

## Pasul 7 — Adaugă Clinica Pogany manual

Після deploy, mergi în aplicație → Clinici → Add Clinic (sau direct în Supabase Table Editor):

```sql
INSERT INTO clinics (user_id, name, contact_name, payment_terms, rate_type, rate_value)
VALUES (
  'USER_ID_TAU',  -- gasesti in Auth → Users
  'Clinica Pogany',
  'Dr. Pogany',
  'monthly',
  'percentage',
  40  -- sau procentul real
);
```

---

## Pasul 8 — Instalare locală (pentru dezvoltare)

```bash
cd clinic-finance
npm install
cp .env.example .env.local
# Editează .env.local cu cheile reale
npm run dev
```

Aplicația rulează la http://localhost:3000

---

## Utilizare zilnică

### Încărcare programator (zilnic)
1. Click pe "Încarcă document"
2. Selectează tipul: "Programator (raport zilnic)"
3. Fă o poză sau scanează raportul zilnic
4. AI extrage automat: total cash, card, transfer
5. Confirmi datele → salvate automat

### Extras de cont (săptămânal/lunar)
1. Descarcă extrasul de la bancă (PDF sau imagine)
2. Upload → tip "Extras de cont"
3. AI extrage TOATE tranzacțiile automat
4. Verifici și confirmi cele importante

### Fișă clinică (lunar)
1. Upload fișa primită de la Clinica Pogany
2. Selectează tipul "Fișă clinică" + alege clinica
3. AI extrage suma datorată
4. Apare automat în dashboard → Clinici

---

## Structura fișiere

```
clinic-finance/
├── app/
│   ├── dashboard/         # Paginile principale
│   │   ├── page.tsx       # Overview cu stats
│   │   ├── upload/        # Upload + AI extragere
│   │   ├── transactions/  # Lista tranzacții + filtre
│   │   ├── clinics/       # Datorii clinici
│   │   ├── invoices/      # Facturi emise/primite
│   │   └── reports/       # P&L, cash vs card
│   ├── api/
│   │   ├── extract/       # API upload + Claude AI
│   │   └── transactions/  # CRUD tranzacții
│   └── auth/callback/     # Google OAuth callback
├── lib/
│   ├── supabase/          # Client, server, middleware
│   └── ai/extract.ts      # Claude Vision extragere
├── components/
│   ├── dashboard/         # Charts (recharts)
│   └── navigation/        # Sidebar
├── types/database.ts      # TypeScript types
└── supabase/schema.sql    # Schema BD + RLS + Views
```
