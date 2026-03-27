import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vzkfkazjylrkspqrnhnx.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_H1Ch2D2XIuSQMzNL-ns8zg_gAqrx7wL";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
