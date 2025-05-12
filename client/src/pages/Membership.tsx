import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import PayPalButton from "@/components/PayPalButton";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreditCard, CircleDollarSign } from "lucide-react";
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
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit-card' | 'paypal'>('credit-card');

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
        credentials: "include"
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
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    },
  });

  // Handle payment success (both PayPal and Stripe)
  const handlePaymentSuccess = (planId: number, transactionId: string, amount: string, method: 'PayPal' | 'Stripe' = 'PayPal') => {
    createPaymentMutation.mutate({
      planId,
      amount,
      paymentMethod: method,
      transactionId,
      status: "completed",
      paymentDate: new Date().toISOString(),
    });
  };

  // Handle Stripe payment errors
  const handlePaymentError = (error: Error) => {
    toast({
      title: "Payment Failed",
      description: error.message || "There was an error processing your payment.",
      variant: "destructive",
    });
  };
  
  // Render payment options based on selected method
  const renderPaymentOptions = () => {
    if (!selectedPlan) return null;
    
    return (
      <Tabs defaultValue="credit-card" className="w-full" onValueChange={(value) => setPaymentMethod(value as 'credit-card' | 'paypal')}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="credit-card" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Credit Card
          </TabsTrigger>
          <TabsTrigger value="paypal" className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4" />
            PayPal
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="credit-card" className="space-y-4">
          <div className="rounded-md">
            <StripeProvider>
              <StripeCheckoutButton 
                amount={selectedPlan.price}
                planId={selectedPlan.id}
                onPaymentSuccess={(planId, transactionId, amount) => 
                  handlePaymentSuccess(planId, transactionId, amount, 'Stripe')
                }
                onPaymentError={handlePaymentError}
              />
            </StripeProvider>
          </div>
        </TabsContent>
        
        <TabsContent value="paypal" className="space-y-4">
          <div className="flex justify-center border border-gray-200 rounded p-4">
            <PayPalButton 
              amount={selectedPlan.price}
              currency="USD"
              intent="CAPTURE"
            />
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  // Handle subscribing to a plan
  const handleSubscribe = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPaymentDialog(true);
  };

  const formatFeatures = (features: string) => {
    return features.split(', ').map((feature, index) => (
      <li key={index} className="mb-1">✓ {feature}</li>
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
    return `Your current plan: ${tier.charAt(0).toUpperCase() + tier.slice(1)} (expires: ${expiryDate})`;
  };

  // Check if user already has access to a tier
  const hasAccess = (planTier: string) => {
    if (!user || !subscription) return false;
    
    // Get numeric value for comparison
    const tierValues = {
      none: 0,
      basic: 1,
      standard: 2,
      premium: 3
    };
    
    const userTierValue = tierValues[subscription.tier as keyof typeof tierValues];
    const planTierValue = tierValues[planTier as keyof typeof tierValues];
    
    return userTierValue >= planTierValue;
  };

  if (isLoadingPlans) {
    return <div className="container mx-auto p-8 text-center">Loading subscription plans...</div>;
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan: SubscriptionPlan) => (
          <Card key={plan.id} className={`flex flex-col h-full ${plan.tier === 'premium' ? 'border-blue-500 border-2' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{plan.name}</CardTitle>
                {plan.tier === 'premium' && <Badge className="bg-blue-500">Best Value</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-3xl font-bold mb-4">
                ${plan.price}
                <span className="text-sm font-normal text-gray-500">/{plan.interval}</span>
              </div>
              <ul className="text-sm text-gray-600 list-none pl-2">
                {formatFeatures(plan.features)}
              </ul>
            </CardContent>
            <CardFooter>
              {hasAccess(plan.tier) ? (
                <Button disabled className="w-full">Current Plan or Higher</Button>
              ) : user?.username === "Fateofjustice" ? (
                <Button disabled className="w-full">Free Special Access</Button>
              ) : (
                <Button 
                  onClick={() => handleSubscribe(plan)} 
                  className="w-full"
                  variant={plan.tier === 'premium' ? 'default' : 'outline'}
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
              You are subscribing to the {selectedPlan?.name} plan at ${selectedPlan?.price}/{selectedPlan?.interval}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <p className="mb-4 font-medium">Choose your payment method:</p>
            {renderPaymentOptions()}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}