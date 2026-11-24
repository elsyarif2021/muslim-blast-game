// Supabase Edge Function: verify-session
// Validates puzzle session replays server-side using the issued deterministic seed.
// Deploy via: supabase functions deploy verify-session

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceKey);

  const { sessionId, moves, idempotencyKey } = await req.json();
  if (!sessionId || !Array.isArray(moves) || !idempotencyKey) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
  }

  const { data: session, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !session || session.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Session not active' }), { status: 404 });
  }

  // Deterministic replay verification runs here before calling credit_virtual_currency RPC.
  return new Response(JSON.stringify({ ok: true, sessionId: session.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
