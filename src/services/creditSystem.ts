import { createClient } from '@supabase/supabase-js';
import { loadStripe } from '@stripe/stripe-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const stripePromise = loadStripe(stripePublicKey);

export async function getUserCredits(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_credits')
    .select('credit_balance')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data?.credit_balance || 0;
}

export async function updateUserCredits(userId: string, newBalance: number): Promise<void> {
  const { error } = await supabase
    .from('user_credits')
    .upsert({ user_id: userId, credit_balance: newBalance });

  if (error) throw error;
}

export async function createCheckoutSession(userId: string, amount: number): Promise<string> {
  const stripe = await stripePromise;
  if (!stripe) throw new Error('Stripe failed to initialize');

  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, amount }),
  });

  const session = await response.json();
  const result = await stripe.redirectToCheckout({
    sessionId: session.id,
  });

  if (result.error) throw result.error;

  return session.id;
}

export async function handleSuccessfulPayment(sessionId: string): Promise<void> {
  const response = await fetch('/api/handle-successful-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) throw new Error('Failed to process payment');
}