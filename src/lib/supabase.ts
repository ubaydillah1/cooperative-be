import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "./config.js";

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

export default supabase;
