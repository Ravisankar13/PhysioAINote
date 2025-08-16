import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingComplete() {
  const [, setLocation] = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        // Get session ID from URL
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");
        
        if (!sessionId) {
          throw new Error("No session ID found");
        }

        // Verify subscription with backend
        const response = await apiRequest("POST", "/api/verify-subscription", { 
          sessionId 
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsSuccess(true);
          
          // Update user's onboarding status
          await apiRequest("POST", "/api/complete-onboarding");
          
          toast({
            title: "Welcome to PhysioAI!",
            description: `Your ${data.tier || 'Basic'} plan trial has been activated. You have 14 days to explore all features.`,
          });
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            setLocation("/");
          }, 3000);
        } else {
          throw new Error("Failed to verify subscription");
        }
      } catch (error) {
        console.error("Subscription verification failed:", error);
        toast({
          title: "Verification Failed",
          description: "We couldn't verify your subscription. Please contact support.",
          variant: "destructive",
        });
        setIsSuccess(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [setLocation, toast]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Verifying Your Subscription</CardTitle>
            <CardDescription>Please wait while we activate your trial...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isSuccess ? (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Welcome to PhysioAI!</CardTitle>
              <CardDescription>
                Your 14-day free trial has been activated successfully.
                You now have full access to all features.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-2xl">Subscription Setup Incomplete</CardTitle>
              <CardDescription>
                There was an issue setting up your subscription. 
                Please try again or contact support.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuccess ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Your Trial Includes:</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✓ Full access to all PhysioGPT features</li>
                  <li>✓ Unlimited voice transcription</li>
                  <li>✓ AI-powered clinical analysis</li>
                  <li>✓ 3D virtual patient models</li>
                  <li>✓ 14 days free, cancel anytime</li>
                </ul>
              </div>
              <Button 
                className="w-full" 
                onClick={() => setLocation("/")}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue to Dashboard
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => setLocation("/pricing")}
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation("/")}
              >
                Go to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}