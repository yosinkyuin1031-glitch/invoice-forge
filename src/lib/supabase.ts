import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eofbclbqvahsirgqgcgo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvZmJjbGJxdmFoc2lyZ3FnY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NjMxNzMsImV4cCI6MjA1MDIzOTE3M30.eml_EqhU5wnFfbVMxrDhkSMyhQ_vCVWaeOR1UT_AxDw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
