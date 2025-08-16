import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Loader2, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// Type definitions for subscription status
interface SubscriptionStatus {
  hasSubscription: boolean;
  tier: string;
  status?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: number;
  isOnTrial?: boolean;
  hasUsedTrial?: boolean;
  trialDaysRemaining?: number;
  trialEndDate?: Date | null;
}

// Payment setup form component
function PaymentSetupForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment setup failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: "Your 14-day free trial has started. You won't be charged until the trial ends.",
        });
        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="space-y-2">
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing} 
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Start Free Trial"
          )}
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          You won't be charged today. Your subscription starts after the 14-day trial.
        </p>
      </div>
    </form>
  );
}

export default function Pricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium" | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Query subscription status
  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async (tier: "basic" | "standard" | "premium") => {
      return await apiRequest("POST", "/api/subscription/create-checkout-session", { tier });
    },
    onSuccess: async (data: any) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowPaymentForm(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      });
    },
  });

  // Handle plan selection
  const handleSelectPlan = (tier: "basic" | "standard" | "premium") => {
    setSelectedTier(tier);
    createCheckoutMutation.mutate(tier);
  };

  // Handle successful payment setup
  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
    setSelectedTier(null);
    queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
  };

  const plans = [
    {
      name: "Basic",
      tier: "basic" as const,
      price: "$39",
      period: "/month",
      popular: false,
      features: [
        { text: "10 PhysioGPT consultations/month", included: true },
        { text: "Unlimited voice transcription", included: true },
        { text: "Basic SOAP notes", included: true },
        { text: "Exercise prescription", included: true },
        { text: "Community forum access", included: true },
        { text: "AI movement analysis", included: false },
        { text: "Virtual patient simulations", included: false },
        { text: "Clinical competitions", included: false },
        { text: "Research paper analysis", included: false },
        { text: "Priority support", included: false },
      ],
    },
    {
      name: "Standard",
      tier: "standard" as const,
      price: "$99",
      period: "/month",
      popular: true,
      features: [
        { text: "100 PhysioGPT consultations/month", included: true },
        { text: "Unlimited voice transcription", included: true },
        { text: "Advanced SOAP notes with AI", included: true },
        { text: "Comprehensive exercise library", included: true },
        { text: "Community forum access", included: true },
        { text: "AI movement analysis", included: true },
        { text: "Virtual patient simulations", included: true },
        { text: "Clinical competitions", included: true },
        { text: "Research paper analysis", included: false },
        { text: "Priority support", included: false },
      ],
    },
    {
      name: "Premium",
      tier: "premium" as const,
      price: "$199",
      period: "/month",
      popular: false,
      features: [
        { text: "Unlimited PhysioGPT consultations", included: true },
        { text: "Unlimited voice transcription", included: true },
        { text: "Advanced SOAP notes with AI", included: true },
        { text: "Comprehensive exercise library", included: true },
        { text: "Community forum access", included: true },
        { text: "AI movement analysis", included: true },
        { text: "Virtual patient simulations", included: true },
        { text: "Clinical competitions", included: true },
        { text: "Research paper analysis", included: true },
        { text: "Priority support", included: true },
      ],
    },
  ];

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If user already has an active subscription, show current plan
  if (subscriptionStatus?.hasSubscription && subscriptionStatus?.status === 'active') {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Your Subscription</h1>
          <p className="text-xl text-muted-foreground">
            You're currently on the <span className="font-semibold capitalize">{subscriptionStatus.tier}</span> plan
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold capitalize">{subscriptionStatus.tier} Plan</h2>
                <p className="text-muted-foreground">Active subscription</p>
              </div>
              <Badge className="text-lg px-4 py-2">Active</Badge>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your subscription renews on {new Date(subscriptionStatus.currentPeriodEnd * 1000).toLocaleDateString()}
              </p>
              <div className="flex gap-4">
                <Button 
                  onClick={() => apiRequest("POST", "/api/subscription/create-portal-session").then((data: any) => {
                    window.location.href = data.url;
                  })}
                >
                  Manage Subscription
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Start with a 14-day free trial. Cancel anytime.
        </p>
        {subscriptionStatus?.isOnTrial && (
          <Badge variant="secondary" className="mt-4 text-lg px-4 py-2">
            Currently on free trial - {subscriptionStatus.trialDaysRemaining} days remaining
          </Badge>
        )}
      </div>

      {/* Pricing Cards */}
      {!showPaymentForm ? (
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.tier}
              className={`relative p-8 ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Star className="w-4 h-4 mr-1" />
                  Most Popular
                </Badge>
              )}
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">{plan.period}</span>
                </div>
                {plan.tier === "premium" && (
                  <div className="flex items-center mt-2 text-sm text-primary">
                    <Crown className="w-4 h-4 mr-1" />
                    Best value for professionals
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={feature.included ? '' : 'text-muted-foreground'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSelectPlan(plan.tier)}
                disabled={createCheckoutMutation.isPending && selectedTier === plan.tier}
              >
                {createCheckoutMutation.isPending && selectedTier === plan.tier ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Start 14-Day Free Trial"
                )}
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        /* Payment Form */
        <div className="max-w-md mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Complete Your Subscription</h2>
            <p className="text-muted-foreground mb-6">
              Add your payment method to start your 14-day free trial. You won't be charged until the trial ends.
            </p>
            
            {clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentSetupForm 
                  clientSecret={clientSecret} 
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            )}
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>All plans include a 14-day free trial. No credit card required to start.</p>
        <p className="mt-2">Cancel anytime. No questions asked.</p>
      </div>
    </div>
  );
}