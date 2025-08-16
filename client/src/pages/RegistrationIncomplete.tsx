import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function RegistrationIncomplete() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // If user is not logged in, redirect to auth page
  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  const handleCompleteSetup = async () => {
    setIsRedirecting(true);
    try {
      // Get a new checkout session
      const response = await apiRequest("POST", "/api/trial/start", { 
        tier: "basic" 
      });
      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      setIsRedirecting(false);
    }
  };

  const handleSkipForNow = () => {
    // Allow user to go to home but they'll see the trial banner
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
          <CardDescription>
            To access PhysioAI's features, please complete your payment setup 
            for the 14-day free trial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Why Payment Details?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 14-day free trial - no charges today</li>
              <li>• Cancel anytime during the trial</li>
              <li>• Only charged if you continue after trial</li>
              <li>• Instant access to all premium features</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-600 text-center">
              <strong>Selected Plan:</strong> Basic ($39/month after trial)
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleCompleteSetup}
            disabled={isRedirecting}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {isRedirecting ? "Redirecting..." : "Complete Payment Setup"}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleSkipForNow}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Skip for Now (Limited Access)
          </Button>
          
          <p className="text-xs text-center text-gray-500">
            Secure payment processing by Stripe. 
            Your information is encrypted and safe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}