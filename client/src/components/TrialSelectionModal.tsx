import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, CreditCard, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TrialSelectionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TrialSelectionModal({ open, onClose }: TrialSelectionModalProps) {
  const [selectedTier, setSelectedTier] = useState<string>("basic");
  const { toast } = useToast();

  const startTrialMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest("POST", "/api/trial/start", { tier });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Processing...",
          description: data.message || "Setting up your trial checkout...",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Trial Setup Failed",
        description: error.message || "Unable to set up your free trial. Please try again.",
        variant: "destructive",
      });
    },
  });

  const tiers = [
    {
      id: "basic",
      name: "Basic",
      price: "$39",
      features: [
        "10 PhysioGPT uses per month",
        "Unlimited voice transcription",
        "Basic SOAP notes",
        "Email support",
      ],
    },
    {
      id: "standard",
      name: "Standard",
      price: "$99",
      features: [
        "100 PhysioGPT uses per month",
        "Unlimited voice transcription",
        "Advanced SOAP notes",
        "Virtual patients",
        "Priority support",
      ],
      popular: true,
    },
    {
      id: "premium",
      name: "Premium",
      price: "$199",
      features: [
        "Unlimited PhysioGPT uses",
        "Unlimited voice transcription",
        "All features included",
        "3D anatomy tools",
        "Research library",
        "24/7 priority support",
      ],
    },
  ];

  const handleStartTrial = () => {
    startTrialMutation.mutate(selectedTier);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Start Your 14-Day Free Trial
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose your plan. Try it free for 14 days. Cancel anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Important Information Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>How it works:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• You'll be redirected to secure Stripe checkout</li>
                <li>• Enter your payment details (card required)</li>
                <li>• <strong>No charges today</strong> - your trial starts immediately</li>
                <li>• First payment will be charged after 14 days</li>
                <li>• Cancel anytime during the trial period to avoid charges</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Plan Selection */}
          <RadioGroup value={selectedTier} onValueChange={setSelectedTier}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map((tier) => (
                <Card
                  key={tier.id}
                  className={`relative cursor-pointer transition-all ${
                    selectedTier === tier.id
                      ? "border-blue-500 shadow-lg"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <RadioGroupItem value={tier.id} id={tier.id} />
                      <Label htmlFor={tier.id} className="cursor-pointer flex-1 ml-3">
                        <CardTitle className="text-lg">{tier.name}</CardTitle>
                        <div className="mt-2">
                          <span className="text-2xl font-bold">{tier.price}</span>
                          <span className="text-gray-600">/month</span>
                        </div>
                      </Label>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RadioGroup>

          {/* Trial Terms */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Trial Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 14-day free trial begins immediately upon signup</li>
                <li>• Credit card required for trial activation (processed securely via Stripe)</li>
                <li>• First payment will be charged on day 15 if not cancelled</li>
                <li>• Cancel anytime during the trial to avoid being charged</li>
                <li>• After trial, subscription continues at selected tier price</li>
                <li>• You can change plans or cancel anytime from your account settings</li>
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={startTrialMutation.isPending}
            >
              Cancel
            </Button>
            <div className="text-right">
              <p className="text-xs text-gray-600 mb-2">
                You'll be charged {tiers.find(t => t.id === selectedTier)?.price}/month after trial
              </p>
              <Button
                size="lg"
                onClick={handleStartTrial}
                disabled={startTrialMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {startTrialMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Setting up checkout...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Continue to Secure Checkout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}