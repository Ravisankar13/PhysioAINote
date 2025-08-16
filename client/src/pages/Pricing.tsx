import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Loader2, Crown, CreditCard, AlertCircle, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TrialBanner from "@/components/TrialBanner";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// Type definitions
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
          return_url: `${window.location.origin}/pricing`,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Start Free Trial"
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Your card will be charged after the 14-day trial ends. Cancel anytime.
      </p>
    </form>
  );
}

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium" | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Query subscription status
  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
  });

  // Mutation to create checkout session
  const createCheckoutMutation = useMutation({
    mutationFn: async (tier: string) => {
      return await apiRequest("POST", "/api/subscription/create-checkout-session", { tier });
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
      setShowPaymentForm(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      });
    },
  });

  // Mutation to cancel subscription
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/subscription/cancel");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will end at the end of the current billing period.",
      });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  // Mutation to manage billing portal
  const manageBillingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/subscription/portal");
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (tier: "basic" | "standard" | "premium") => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in or register to purchase a membership.",
        variant: "destructive",
      });
      return;
    }

    // Check if admin user has special access
    if (user.username === "Fateofjustice") {
      toast({
        title: "Special Access",
        description: "You have free unlimited access to all features.",
      });
      return;
    }

    setSelectedTier(tier);
    createCheckoutMutation.mutate(tier);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  };

  const getSubscriptionStatus = () => {
    if (!user) return "Please login to manage your subscription.";
    if (statusLoading) return "Loading subscription information...";
    if (!subscriptionStatus) return "You don't have an active subscription.";

    const { tier, status, currentPeriodEnd, cancelAtPeriodEnd, isOnTrial, trialDaysRemaining } = subscriptionStatus;
    
    if (!subscriptionStatus.hasSubscription) return "You don't have an active subscription.";
    
    if (isOnTrial && trialDaysRemaining) {
      return `Free trial active: ${trialDaysRemaining} days remaining`;
    }

    const planName = tier.charAt(0).toUpperCase() + tier.slice(1);
    const expiryDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toLocaleDateString() : "N/A";
    
    if (cancelAtPeriodEnd) {
      return `${planName} plan (cancelling on ${expiryDate})`;
    }
    
    return `${planName} plan (renews ${expiryDate})`;
  };

  const hasAccess = (planTier: string) => {
    if (!user || !subscriptionStatus) return false;
    
    // Admin has access to everything
    if (user.username === "Fateofjustice") return true;

    const tierValues = {
      none: 0,
      basic: 1,
      standard: 2,
      premium: 3,
    };

    const userTierValue = tierValues[subscriptionStatus.tier as keyof typeof tierValues] || 0;
    const planTierValue = tierValues[planTier as keyof typeof tierValues];

    return userTierValue >= planTierValue;
  };

  const tiers = [
    {
      name: "Basic",
      tier: "basic",
      price: "$39",
      interval: "month",
      description: "Perfect for individual practitioners",
      features: [
        "10 PhysioGPT consultations per month",
        "Unlimited voice transcription",
        "Basic SOAP note generation",
        "Limited virtual patient simulations",
        "Email support",
      ],
      notIncluded: [
        "Advanced AI movement analysis",
        "Research database access",
        "Complex case competitions",
      ],
    },
    {
      name: "Standard",
      tier: "standard",
      price: "$99",
      interval: "month",
      description: "Ideal for growing practices",
      popular: true,
      features: [
        "100 PhysioGPT consultations per month",
        "Unlimited voice transcription",
        "Advanced SOAP note generation",
        "Full virtual patient simulations",
        "AI movement analysis",
        "Research database access",
        "Priority email support",
      ],
      notIncluded: [
        "Unlimited PhysioGPT consultations",
        "Complex case competitions",
      ],
    },
    {
      name: "Premium",
      tier: "premium",
      price: "$199",
      interval: "month",
      description: "Complete solution for clinics",
      features: [
        "Unlimited PhysioGPT consultations",
        "Unlimited voice transcription",
        "Advanced SOAP note generation",
        "Full virtual patient simulations",
        "AI movement analysis",
        "Research database access",
        "Complex case competitions",
        "Diagnosis duel tournaments",
        "Priority phone & email support",
        "Custom integrations",
      ],
      notIncluded: [],
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Start with a 14-day free trial. Cancel anytime.
        </p>
        
        {/* Current subscription status */}
        {user && (
          <div className="bg-muted/50 p-4 rounded-lg inline-block mb-6">
            <p className="font-medium">{getSubscriptionStatus()}</p>
            {subscriptionStatus?.hasSubscription && !subscriptionStatus?.cancelAtPeriodEnd && (
              <div className="mt-2 space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => manageBillingMutation.mutate()}
                >
                  Manage Billing
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Subscription
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Free Trial Banner */}
        <div className="max-w-5xl mx-auto mb-8">
          <TrialBanner />
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {tiers.map((tier) => (
          <Card
            key={tier.tier}
            className={`relative ${tier.popular ? "border-primary shadow-lg" : ""}`}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="pb-6">
              <div className="mb-6">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground">/{tier.interval}</span>
              </div>
              
              {/* Features included */}
              <div className="space-y-3 mb-4">
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              
              {/* Features not included */}
              {tier.notIncluded.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  {tier.notIncluded.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <X className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              {user?.username === "Fateofjustice" ? (
                <Button disabled className="w-full">
                  <Crown className="mr-2 h-4 w-4" />
                  Free Special Access
                </Button>
              ) : hasAccess(tier.tier) ? (
                <Button disabled className="w-full">
                  Current Plan
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubscribe(tier.tier as "basic" | "standard" | "premium")}
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  disabled={createCheckoutMutation.isPending}
                >
                  {createCheckoutMutation.isPending && selectedTier === tier.tier ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : subscriptionStatus?.isOnTrial ? (
                    `Upgrade to ${tier.name}`
                  ) : (
                    "Start Free Trial"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Trust badges */}
      <div className="mt-12 text-center">
        <div className="flex justify-center items-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="text-sm">Secure Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm">14-Day Free Trial</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <span className="text-sm">Cancel Anytime</span>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
            <DialogDescription>
              Enter your payment details to start your 14-day free trial.
            </DialogDescription>
          </DialogHeader>
          
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentSetupForm
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your {subscriptionStatus?.tier} subscription? 
              You'll continue to have access until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSubscriptionMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}