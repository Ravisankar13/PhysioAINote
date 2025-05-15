import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface StripeCheckoutButtonProps {
  amount: string;
  planId: number;
  onPaymentSuccess: (planId: number, transactionId: string, amount: string) => void;
  onPaymentError: (error: Error) => void;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
};

const StripeCheckoutButton: React.FC<StripeCheckoutButtonProps> = ({
  amount,
  planId,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable
      // form submission until Stripe.js has loaded.
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Create a payment intent on the server
      const { clientSecret } = await apiRequest('POST', '/api/create-payment-intent', {
        amount,
        "membershipTier": "premium"
      }).then(res => res.json());

      // Confirm the payment with the card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful
        onPaymentSuccess(planId, paymentIntent.id, amount);
      } else {
        throw new Error('Payment failed to complete');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setErrorMessage(error.message || 'An error occurred during payment');
      onPaymentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-md">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isLoading} 
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${amount}`
        )}
      </Button>
    </form>
  );
};

export default StripeCheckoutButton;