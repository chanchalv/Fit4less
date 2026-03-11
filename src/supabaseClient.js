import { createClient } from "@supabase/supabase-js";

// 👇 Replace these with your actual values from supabase.com → Project Settings → API
const SUPABASE_URL = "https://sqfjvhustlyqlnwutmua.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rN5si-z2V1yXAmQbBoRZuA_0IukH_Gj";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
