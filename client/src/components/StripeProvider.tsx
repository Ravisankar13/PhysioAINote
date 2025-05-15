import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
// Use the publishable key from environment variables
const stripePromise = loadStripe('pk_test_51RP2StQgGBJQM85ZhDN6hAc3ih2rVRv6XgXaCSvm5o2NdRHwY6jvXZxwzAWcRKWhP33Z3FFCvzYzP4OHqa82qGcv003rLgSYDF');

interface StripeProviderProps {
  children: React.ReactNode;
}

export default function StripeProvider({ children }: StripeProviderProps) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}