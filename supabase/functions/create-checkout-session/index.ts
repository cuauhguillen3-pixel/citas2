
import { Stripe } from "https://esm.sh/stripe@14.10.0?target=deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
        throw new Error('La variable STRIPE_SECRET_KEY no está configurada en Supabase Edge Functions.');
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    let body;
    try {
        body = await req.json();
    } catch (e) {
        throw new Error('El cuerpo de la petición no es un JSON válido.');
    }

    const { priceId, userId, email, origin } = body;

    if (!priceId || !userId || !email) {
      throw new Error(`Faltan parámetros: ${!priceId?'priceId ':''}${!userId?'userId ':''}${!email?'email':''}`);
    }

    // Usar el origen enviado por el cliente, o fallback a header, o error.
    const clientOrigin = origin || req.headers.get('origin');
    if (!clientOrigin) {
        throw new Error('No se pudo determinar el origen de la petición (URL).');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${clientOrigin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientOrigin}/dashboard`,
      customer_email: email,
      metadata: {
        user_id: userId,
      },
    })

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error en Edge Function:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Return 400 so client knows it failed, but with JSON body
      },
    )
  }
})
