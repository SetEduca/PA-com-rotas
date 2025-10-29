import dotenv from 'dotenv';
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnon = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnon);

export default supabase;