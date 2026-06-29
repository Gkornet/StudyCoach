# Supabase-setup voor de stof-bibliotheek

De bibliotheek (eerder geüploade stof hergebruiken, cross-device, eigen login per
kind) draait op Supabase: login + database + bestandsopslag in één. Deze stappen
moet jij één keer doen; daarna kan ik de login en de bibliotheek in de app bouwen.

## 1. Project aanmaken
1. Ga naar https://supabase.com en maak een gratis account/project aan.
2. Kies een regio in de EU (bijv. Frankfurt) — fijn i.v.m. AVG.
3. Bewaar het **database-wachtwoord** dat je instelt.

## 2. Database + opslag klaarzetten
1. Open in het project **SQL Editor**.
2. Plak de inhoud van [`supabase/schema.sql`](supabase/schema.sql) en klik **Run**.
   - Dit maakt de tabellen, de beveiliging (Row-Level Security) en de privé-bucket
     `study-materials` aan.

## 3. Login-methode instellen
- Standaard bouw ik **e-mail + wachtwoord**. Voor jonge kinderen zonder eigen
  e-mail kun jij als ouder per kind een account aanmaken (bijv.
  `jouwnaam+jan@gmail.com`) en het wachtwoord aan het kind geven.
- In Supabase: **Authentication → Providers → Email** aan laten staan. Voor het
  testen kun je **"Confirm email"** uitzetten zodat je niet elke keer hoeft te
  bevestigen.

## 4. Sleutels doorgeven aan de app
Onder **Project Settings → API** vind je:
- `Project URL`
- `anon public` key  (mag in de browser — RLS beschermt de data)

Zet die als environment variables, zowel lokaal als in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=...        # de Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # de anon public key
```

- **Lokaal:** in `.env.local` (staat in `.gitignore`, dus niet in git).
- **Vercel:** Project → Settings → Environment Variables (Production + Preview).

> Deel de `service_role`-key nooit en zet die niet in de frontend — die omzeilt
> alle beveiliging. We hebben hem voor deze functie niet nodig.

## 5. Laat het me weten
Zodra het project staat en de env-vars erin staan, bouw ik:
1. Login-/registratiescherm (per kind).
2. Uploaden bewaart de stof in de bibliotheek.
3. Welkomstscherm: kies eerder geüploade stof → Leren of Oefentoets, zonder
   opnieuw uploaden.

De app blijft tot die tijd gewoon werken zonder login; de bibliotheek komt er
als extra bij.
