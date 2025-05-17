import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import StripeProvider from "@/components/StripeProvider";
import StripeCheckoutButton from "@/components/StripeCheckoutButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type SubscriptionPlan = {
  id: number;
  name: string;
  description: string;
  tier: "none" | "basic" | "standard" | "premium";
  price: string;
  interval: string;
  features: string;
  active: boolean;
};

type UserSubscription = {
  tier: "none" | "basic" | "standard" | "premium";
  expiry: string | null;
  subscriptionId: string | null;
};

export default function Membership() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch subscription plans
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const response = await fetch("/api/subscriptions");
      return response.json();
    },
  });

  // Fetch user's subscription status
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ["/api/user/subscription"],
    queryFn: async () => {
      const response = await fetch("/api/user/subscription", {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      return response.json();
    },
    enabled: !!user,
  });

  // Create payment record mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/user/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
      toast({
        title: "Payment Successful",
        description: "Your subscription has been successfully updated.",
        variant: "default",
      });
      setShowPaymentDialog(false);
    },
    onError: (error: any) => {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description:
          error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/user/subscription/cancel"
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been successfully cancelled.",
        variant: "default",
      });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      console.error("Cancellation error:", error);
      toast({
        title: "Cancellation Failed",
        description:
          error.message || "There was an error cancelling your subscription.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Handle payment success
  const handlePaymentSuccess = (
    planId: number,
    transactionId: string,
    amount: string
  ) => {
    createPaymentMutation.mutate({
      planId,
      amount,
      paymentMethod: "Stripe",
      transactionId,
      status: "completed",
      paymentDate: new Date().toISOString(),
    });
  };

  // Handle Stripe payment errors
  const handlePaymentError = (error: Error) => {
    toast({
      title: "Payment Failed",
      description:
        error.message || "There was an error processing your payment.",
      variant: "destructive",
    });
  };

  // Handle cancel subscription
  const handleCancelSubscription = () => {
    setIsProcessing(true);
    cancelSubscriptionMutation.mutate();
  };

  // Render credit card payment form
  const renderPaymentForm = () => {
    if (!selectedPlan) return null;

    return (
      <div className="rounded-md p-4">
        <StripeProvider>
          <StripeCheckoutButton
            amount={selectedPlan.price}
            planId={selectedPlan.id}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </StripeProvider>
      </div>
    );
  };

  // Handle subscribing to a plan
  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in or register to purchase a membership.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentDialog(true);
  };

  const formatFeatures = (features: string) => {
    return features.split(", ").map((feature, index) => (
      <li key={index} className="mb-1">
        ✓ {feature}
      </li>
    ));
  };

  // Get current subscription status message
  const getSubscriptionStatus = () => {
    if (!user) return "Please login to manage your subscription.";
    if (isLoadingSubscription) return "Loading subscription information...";
    if (!subscription) return "You don't have an active subscription.";

    const { tier, expiry } = subscription;
    if (tier === "none") return "You don't have an active subscription.";

    const expiryDate = expiry ? new Date(expiry).toLocaleDateString() : "N/A";
    return `Your current plan: ${
      tier.charAt(0).toUpperCase() + tier.slice(1)
    } (expires: ${expiryDate})`;
  };

  // Check if user already has access to a tier
  const hasAccess = (planTier: string) => {
    if (!user || !subscription) return false;

    // Get numeric value for comparison
    const tierValues = {
      none: 0,
      basic: 1,
      standard: 2,
      premium: 3,
    };

    const userTierValue =
      tierValues[subscription.tier as keyof typeof tierValues];
    const planTierValue = tierValues[planTier as keyof typeof tierValues];

    return userTierValue >= planTierValue;
  };

  if (isLoadingPlans) {
    return (
      <div className="container mx-auto p-8 text-center">
        Loading subscription plans...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Membership Plans</h1>
        <p className="text-lg text-gray-600 mb-6">
          Choose the plan that fits your needs
        </p>
        <div className="bg-gray-100 p-3 rounded-lg inline-block">
          {getSubscriptionStatus()}
          {subscription && subscription.tier !== "none" && (
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel Subscription
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan: SubscriptionPlan) => (
          <Card
            key={plan.id}
            className={`flex flex-col h-full ${
              plan.tier === "premium" ? "border-blue-500 border-2" : ""
            }`}
          >
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{plan.name}</CardTitle>
                {plan.tier === "premium" && (
                  <Badge className="bg-blue-500">Best Value</Badge>
                )}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-3xl font-bold mb-4">
                ${plan.price}
                <span className="text-sm font-normal text-gray-500">
                  /{plan.interval}
                </span>
              </div>
              <ul className="text-sm text-gray-600 list-none pl-2">
                {formatFeatures(plan.features)}
              </ul>
            </CardContent>
            <CardFooter>
              {hasAccess(plan.tier) ? (
                <Button disabled className="w-full">
                  Current Plan or Higher
                </Button>
              ) : user?.username === "Fateofjustice" ? (
                <Button disabled className="w-full">
                  Free Special Access
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubscribe(plan)}
                  className="w-full"
                  variant={plan.tier === "premium" ? "default" : "outline"}
                >
                  Subscribe
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Your Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              You are subscribing to the {selectedPlan?.name} plan at $
              {selectedPlan?.price}/{selectedPlan?.interval}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <p className="mb-4 font-medium">Enter your payment details:</p>
            <StripeProvider>
              <StripeCheckoutButton
                amount={selectedPlan?.price || "0"}
                planId={selectedPlan?.id || 0}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
              />
            </StripeProvider>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your {subscription?.tier}{" "}
              subscription? You'll lose access to premium features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between sm:justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Subscription"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
