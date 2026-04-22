import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import { supabasePublicKey, supabaseUrl } from './supabase-config';

const supabase = createBrowserClient(supabaseUrl, supabasePublicKey);

export default supabase;
