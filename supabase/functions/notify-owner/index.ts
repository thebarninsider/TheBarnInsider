import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get('WEBHOOK_SECRET');
    if (secret && req.headers.get('x-webhook-secret') !== secret) return new Response('Unauthorized', { status: 401 });
    const payload = await req.json();
    const review = payload.record;
    if (!review?.id) return new Response('No review record', { status: 400 });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: barn } = await supabase.from('barns').select('name').eq('id', review.barn_id).single();
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const owner = Deno.env.get('OWNER_EMAIL') || 'thebarninsider@gmail.com';
    const from = Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'TheBarnInsider <onboarding@resend.dev>';
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [owner], subject: `Review awaiting moderation: ${barn?.name || 'New barn'}`,
        html: `<h2>New review awaiting moderation</h2><p><strong>Barn:</strong> ${barn?.name || review.barn_id}</p><p><strong>Headline:</strong> ${review.headline}</p><p><strong>Review ID:</strong> ${review.id}</p><p>Log in to TheBarnInsider admin dashboard to review it.</p>`
      })
    });
    if (!response.ok) throw new Error(await response.text());
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) { return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
});
