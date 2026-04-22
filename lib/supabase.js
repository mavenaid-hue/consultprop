import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default supabase;
