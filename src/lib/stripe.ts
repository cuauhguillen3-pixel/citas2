import { loadStripe } from '@stripe/stripe-js';

// Asegúrate de reemplazar esto con tu clave pública real de Stripe
// Deberías poner esto en tu archivo .env como VITE_STRIPE_PUBLISHABLE_KEY
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_sample_key_replace_me';

export const stripePromise = loadStripe(stripePublicKey);

export const SUBSCRIPTION_PRICE_ID = 'price_1SoA7kATwed9fJ8I1jVcFLeU'; // ID del precio en Stripe Dashboard
