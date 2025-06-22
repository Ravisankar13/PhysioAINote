import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch trial status
  const { data: trialStatus, isLoading } = useQuery<TrialStatus>({
    queryKey: ["/api/trial/status"],
    enabled: !!user,
  });

  // Auto-start trial after registration if user came from trial redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (user && params.get('autoStartTrial') === 'true' && trialStatus && !trialStatus.hasUsedTrial) {
      startTrialMutation.mutate();
      // Clean up URL
      navigate(location.pathname, { replace: true });
    }
  }, [user, trialStatus, location]);

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

  // Handle trial button click
  const handleStartTrial = () => {
    if (!user) {
      // Redirect to auth page with trial intent
      navigate('/auth?autoStartTrial=true&returnTo=' + encodeURIComponent(location.pathname));
      return;
    }
    startTrialMutation.mutate();
  };

  // Show for non-authenticated users or when trial status is loading for authenticated users
  if (user && (isLoading || !trialStatus)) {
    return null;
  }

  // Don't show if user already has premium membership (not trial)
  if (user?.membershipTier === "premium" && trialStatus && !trialStatus.isOnTrial) {
    return null;
  }

  // Show trial status if user is currently on trial
  if (user && trialStatus && trialStatus.isOnTrial) {
    return (
      <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-green-900">
                  🎉 Your 14-Day Free Trial is Active!
                </CardTitle>
                <CardDescription className="text-green-700">
                  You have full premium access to all features
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              {trialStatus.trialDaysRemaining} days remaining
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>PhysioGPT AI</span>
            </div>
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Virtual Patients</span>
            </div>
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>3D Anatomy Tools</span>
            </div>
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Research Library</span>
            </div>
          </div>
          <div className="mt-3 p-3 bg-white/50 rounded-lg border border-green-200">
            <p className="text-xs text-green-700 text-center">
              <strong>Trial expires:</strong> {new Date(trialStatus.trialEndDate!).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if user has used trial (only applies to authenticated users)
  if (user && trialStatus && trialStatus.hasUsedTrial) {
    return null;
  }

  // Show trial offer for users who haven't used it
  return (
    <Card className="mb-6 border-2 border-blue-300 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 shadow-lg">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Star className="h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <CardTitle className="text-xl text-white font-bold">
                🎉 Start Your 14-Day FREE Trial Now!
              </CardTitle>
              <CardDescription className="text-blue-100 text-base">
                Full premium access - no credit card required, cancel anytime
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-yellow-400 text-yellow-900 font-semibold px-3 py-1">
            FREE ACCESS
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
            onClick={handleStartTrial}
            disabled={startTrialMutation.isPending}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-10 py-4 text-lg font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            {startTrialMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                Activating Trial...
              </>
            ) : (
              <>
                <Star className="h-5 w-5 mr-3 text-yellow-300" />
                {user ? "🚀 START FREE TRIAL NOW" : "🚀 SIGN UP & START FREE TRIAL"}
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