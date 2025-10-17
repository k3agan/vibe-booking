import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface StripeConfig {
  publishableKey: string;
}

/**
 * Custom hook to fetch the current Stripe configuration based on rotation schedule
 */
export function useStripeConfig() {
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStripeConfig() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch the current publishable key from our API
        const response = await fetch('/api/stripe-config');
        
        if (!response.ok) {
          throw new Error('Failed to fetch Stripe configuration');
        }

        const config: StripeConfig = await response.json();
        
        if (!config.publishableKey) {
          throw new Error('No Stripe publishable key configured');
        }

        // Initialize Stripe with the current publishable key
        const stripePromise = loadStripe(config.publishableKey);
        setStripe(stripePromise);

      } catch (err) {
        console.error('Error fetching Stripe config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Fallback to environment variable if API fails
        const fallbackKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (fallbackKey) {
          const fallbackStripePromise = loadStripe(fallbackKey);
          setStripe(fallbackStripePromise);
          setError(null); // Clear error if fallback works
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchStripeConfig();
  }, []);

  return { stripe, isLoading, error };
}
