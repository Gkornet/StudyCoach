import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_* worden bij de build in de app gezet. Ontbreken ze (bijv. lokaal
// zonder .env.local), dan blijft de client null en werkt de app gewoon zonder
// login/bibliotheek — niemand komt vast te zitten.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anon);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anon as string)
  : null;
