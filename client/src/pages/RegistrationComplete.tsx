import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function RegistrationComplete() {
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { refetch } = useAuth();

  useEffect(() => {
    const completeRegistration = async () => {
      try {
        // Get session ID from URL
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");
        
        if (!sessionId) {
          throw new Error("No session ID found in URL");
        }

        console.log("Completing registration with session ID:", sessionId);

        // Complete registration with backend
        const response = await apiRequest("GET", `/api/registration-complete?session_id=${sessionId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Registration completion successful:", data);
          
          setIsSuccess(true);
          
          // Refetch user data to update auth state
          await refetch();
          
          toast({
            title: "Welcome to PhysioGPT!",
            description: "Your account has been created successfully and your 14-day trial is now active!",
          });
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            setLocation("/");
          }, 3000);
        } else {
          const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(errorData.message || "Failed to complete registration");
        }
      } catch (error: any) {
        console.error("Registration completion failed:", error);
        setError(error.message || "Failed to complete registration");
        toast({
          title: "Registration Failed",
          description: error.message || "We couldn't complete your registration. Please try again or contact support.",
          variant: "destructive",
        });
        setIsSuccess(false);
      } finally {
        setIsProcessing(false);
      }
    };

    completeRegistration();
  }, [setLocation, toast, refetch]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Completing Your Registration</CardTitle>
            <CardDescription>Please wait while we set up your account...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Registration Failed</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => setLocation("/auth")}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Welcome to PhysioGPT!</CardTitle>
          <CardDescription>
            Your account has been created successfully and your 14-day free trial is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">Your Trial Includes:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✓ Full access to all PhysioGPT features</li>
              <li>✓ AI-powered clinical decision support</li>
              <li>✓ Voice transcription and SOAP note generation</li>
              <li>✓ 3D virtual patient analysis</li>
              <li>✓ Movement analysis and body scanning</li>
              <li>✓ Research integration and evidence-based protocols</li>
              <li>✓ 14 days free, cancel anytime</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 text-center">
              <strong>🎉 Registration Complete!</strong><br />
              You'll be redirected to your dashboard in a few seconds.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={() => setLocation("/")}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}