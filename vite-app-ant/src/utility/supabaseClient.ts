import { createClient } from "@refinedev/supabase";

const supabaseUrl= import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: "public",
  },
  auth: {
    persistSession: true,
  },
});
