// Supabase Edge Function: process-redemption
// Adult-only redemption request handler with compliance gate (disabled by default).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const realRewardsEnabled = Deno.env.get('ENABLE_REAL_WORLD_REWARDS') === 'true';
  if (!realRewardsEnabled) {
    return new Response(
      JSON.stringify({
        error: 'Penukaran hadiah nyata dinonaktifkan secara default hingga kepatuhan dan penyedia pembayaran resmi aktif.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceKey);

  const { userId, catalogId, destinationHint, idempotencyKey } = await req.json();
  const { data, error } = await supabase.rpc('request_adult_redemption', {
    p_user_id: userId,
    p_catalog_id: catalogId,
    p_destination_hint: destinationHint,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ ok: true, requestId: data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
