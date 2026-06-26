/* ============================================================
   Supabase connection config
   ------------------------------------------------------------
   Fill these in with your own project's values:
   Supabase Dashboard > Project Settings > API
     - SUPABASE_URL    -> "Project URL"
     - SUPABASE_ANON_KEY -> "anon" "public" key (NOT the service_role key)

   This anon key is safe to expose in client-side code IF your
   Row Level Security (RLS) policies are set up correctly (see
   sql/schema.sql). Never put the service_role key in this file.
   ============================================================ */

const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
