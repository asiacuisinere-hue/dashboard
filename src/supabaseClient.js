import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgniojabjywrnwovlmaf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmlvamFianl3cm53b3ZsbWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODg2MzgsImV4cCI6MjA3NzA2NDYzOH0.W2oBIE4AkBEfi2k3apLK3Gr2bn22vKqQG2sTixQVPu0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
