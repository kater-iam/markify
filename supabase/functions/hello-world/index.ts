// supabase/functions/public-function/index.ts

import { serve } from 'https://deno.land/std/http/server.ts'

serve(async (req: Request) => {
  return new Response('This endpoint is public!', {
    headers: { 'Content-Type': 'text/plain' },
  })
})
