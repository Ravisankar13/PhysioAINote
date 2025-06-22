import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, ArrowRight, Sparkles } from "lucide-react";

export default function TrialWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if user is not in trial or not authenticated
    if (!user || !user.trialInfo?.isInTrial) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user?.trialInfo?.isInTrial) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Redirecting...</div>
    </div>;
  }

  const handleGetStarted = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-4">
            <Sparkles className="h-4 w-4" />
            Welcome to Your Free Trial!
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to PhysioAI, {user.fullName || user.username}!
          </h1>
          <p className="text-xl text-gray-600">
            Your 14-day free trial has started. Explore all premium features at no cost.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-800">Trial Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {user.trialInfo.daysRemaining} Days
                </div>
                <p className="text-green-700">Remaining in your free trial</p>
                <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                  Trial Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What's Included</CardTitle>
              <CardDescription>
                Full access to all premium features during your trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>AI-powered clinical documentation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>3D skeletal analysis tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Motion capture technology</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Virtual patient simulations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>PhysioGPT AI assistant</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Research database access</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg p-6 border shadow-sm mb-8">
          <h3 className="text-lg font-semibold mb-4">Quick Start Guide</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium mb-2">Explore AI Documentation</h4>
              <p className="text-sm text-gray-600">Start with our clinical notes feature to see AI-powered documentation</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h4 className="font-medium mb-2">Try 3D Analysis</h4>
              <p className="text-sm text-gray-600">Use our 3D skeletal tool for advanced patient assessment</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h4 className="font-medium mb-2">Chat with PhysioGPT</h4>
              <p className="text-sm text-gray-600">Get instant answers to clinical questions from our AI assistant</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button 
            onClick={handleGetStarted}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            Start Exploring
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required during trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}