// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://pkqnrxzdgdegbhhlcjtj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcW5yeHpkZ2RlZ2JoaGxjanRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDc1MjIsImV4cCI6MjA2NDk4MzUyMn0.adlxUEn7PWXZTnyGWh60TtZn2MwiZtuMBC-ul9GSsqo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);