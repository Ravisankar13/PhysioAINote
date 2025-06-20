import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Star, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface TrialStatus {
  hasUsedTrial: boolean;
  isOnTrial: boolean;
  trialDaysRemaining: number;
  trialEndDate: string | null;
}

export default function TrialBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch trial status
  const { data: trialStatus, isLoading } = useQuery<TrialStatus>({
    queryKey: ["/api/trial/status"],
    enabled: !!user,
  });

  // Start trial mutation
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trial/start");
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trial/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Free Trial Activated!",
        description: "You now have 14 days of premium access to all features.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Trial Activation Failed",
        description: error.message || "Unable to start your free trial. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !trialStatus) {
    return null;
  }

  // Don't show if user already has premium membership (not trial)
  if (user?.membershipTier === "premium" && !trialStatus.isOnTrial) {
    return null;
  }

  // Show trial status if user is currently on trial
  if (trialStatus.isOnTrial) {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center justify-between">
            <span>
              <strong>Free Trial Active!</strong> You have {trialStatus.trialDaysRemaining} days remaining of premium access.
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {trialStatus.trialDaysRemaining} days left
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Don't show if trial has been used
  if (trialStatus.hasUsedTrial) {
    return null;
  }

  // Show trial offer for users who haven't used it
  return (
    <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Star className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-blue-900">
                Start Your 14-Day Free Trial
              </CardTitle>
              <CardDescription className="text-blue-700">
                Get full access to all premium features - no credit card required
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Limited Time
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <h4 className="font-medium text-blue-900">What's included:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                AI-powered PhysioGPT assistant
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Virtual patient case studies
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Advanced 3D anatomy tools
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Research library access
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-900">Trial benefits:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-blue-600" />
                14 days full access
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                No credit card required
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Cancel anytime
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                No commitment
              </li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => startTrialMutation.mutate()}
            disabled={startTrialMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            {startTrialMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Activating Trial...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Start Free Trial Now
              </>
            )}
          </Button>
        </div>
        
        <p className="text-xs text-blue-600 text-center mt-3">
          Your trial will automatically start when you click the button above.
          No payment information required.
        </p>
      </CardContent>
    </Card>
  );
}