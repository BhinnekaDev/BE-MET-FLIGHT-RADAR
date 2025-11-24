import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

export function createSupabaseClientWithUser(userJwt: string) {
  if (!userJwt) throw new Error('JWT user kosong');

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${userJwt}`,
        },
      },
    },
  );
}
