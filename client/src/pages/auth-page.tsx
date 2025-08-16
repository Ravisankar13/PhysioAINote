import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Leaf,
  LockKeyhole,
  User,
  Mail,
  ArrowRight,
  Loader2,
} from "lucide-react";

// Define the login form schema
const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().default(false),
});

// Define the registration form schema
const registerSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  fullName: z.string().optional().or(z.literal("")),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [currentLocation, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Check if user is coming from trial banner
  const params = new URLSearchParams(window.location.search);
  const isTrialFlow = params.get('autoStartTrial') === 'true';
  
  // Set default tab to register if coming from trial flow
  useEffect(() => {
    if (isTrialFlow) {
      setActiveTab("register");
    }
  }, [isTrialFlow]);

  // Create the login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Create the registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      fullName: "",
    },
  });

  // Handle login form submission
  function onLoginSubmit(data: LoginFormValues) {
    console.log("Login form submitted with:", data.username);

    // For the admin user, ensure correct case for username
    const isAdmin = data.username.toLowerCase() === "fateofjustice";
    const loginPayload = {
      ...data,
      // Set proper case for admin username
      username: isAdmin ? "Fateofjustice" : data.username,
      // Use the actual password provided by the user
      password: data.password,
    };

    console.log("Sending login payload with username:", loginPayload.username);

    loginMutation.mutate(loginPayload, {
      onSuccess: () => {
        console.log("Login success - redirecting");
        setLocation("/");
      },
    });
  }

  // Handle registration form submission
  function onRegisterSubmit(data: RegisterFormValues) {
    registerMutation.mutate(data, {
      onSuccess: () => {
        // Simply redirect to home page after registration
        // Users will need to explicitly start trial through Stripe checkout
        setLocation("/");
      },
    });
  }

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // If user is already logged in, don't render the component
  if (user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>PhysioAI - Sign In or Register</title>
        <meta
          name="description"
          content="Sign in or register for PhysioAI to access the AI-powered clinical note generation tool for physiotherapists."
        />
      </Helmet>

      {/* Rest of the component remains the same */}
      <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
        {/* Form Section */}
        <div className="flex flex-col justify-center px-4 py-12 lg:w-1/2 lg:px-20">
          {/* Your existing form content */}
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="space-y-2 text-center">
              <div className="inline-block rounded-full bg-primary/10 p-2 text-primary">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold">
                {isTrialFlow ? "Create Your Account" : "Welcome to PhysioAI"}
              </h1>
              <p className="text-muted-foreground">
                {isTrialFlow 
                  ? "Create your account, then choose a subscription plan with a 14-day free trial"
                  : "Sign in to your account or create a new one to access the AI-powered clinical note generation"
                }
              </p>
              {isTrialFlow && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <div className="font-medium mb-1">After creating your account:</div>
                  <ul className="text-xs space-y-0.5">
                    <li>• Choose from Basic ($39), Standard ($99), or Premium ($199) plans</li>
                    <li>• Get 14 days free with payment details required</li>
                    <li>• First payment after your trial ends</li>
                    <li>• Cancel anytime during your trial</li>
                  </ul>
                </div>
              )}
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sign In</CardTitle>
                    <CardDescription>
                      Enter your credentials to access your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...loginForm}>
                      <form
                        onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    placeholder="Enter your username"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder="Enter your password"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="rememberMe"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Keep me logged in</FormLabel>
                                <FormDescription>
                                  Stay signed in for 30 days
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="mr-2 h-4 w-4" />
                          )}
                          Sign In
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {isTrialFlow ? "Start Your 14-Day Free Trial" : "Create an Account"}
                    </CardTitle>
                    <CardDescription>
                      {isTrialFlow 
                        ? "Complete registration to instantly access all premium features for 14 days"
                        : "Register to access AI-powered clinical note generation"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...registerForm}>
                      <form
                        onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                        className="space-y-4"
                      >
                        {/* Register form fields remain the same */}
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    placeholder="Choose a username"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder="Create a password"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Password must be at least 6 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="Your email address"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Your full name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className={`w-full ${isTrialFlow ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="mr-2 h-4 w-4" />
                          )}
                          {isTrialFlow ? "Start 14-Day Free Trial" : "Create Account"}
                        </Button>
                        {isTrialFlow && (
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            No payment information required • Cancel anytime
                          </p>
                        )}
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Hero Section */}
        <div className="hidden bg-gradient-to-br from-primary to-secondary p-12 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center">
          {/* Hero content remains the same */}
          <div className="mx-auto max-w-md text-center text-white">
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-white/10 p-4 backdrop-blur-sm">
                <Leaf className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              PhysioAI Conversation
            </h2>
            <p className="mt-4 text-lg">
              Transform your physiotherapy practice with our AI-powered clinical
              documentation platform. Generate comprehensive SOAP notes and
              collaborate with other professionals.
            </p>
            <div className="mt-10">
              <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm border border-white/20">
                <h3 className="font-semibold text-xl mb-4">Features</h3>
                <ul className="space-y-3 text-left">
                  <li className="flex items-start">
                    <div className="mr-2 rounded-full bg-secondary/70 p-1">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="4"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </div>
                    <span>AI-powered SOAP note generation</span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-2 rounded-full bg-secondary/70 p-1">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="4"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </div>
                    <span>Voice transcription for patient sessions</span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-2 rounded-full bg-secondary/70 p-1">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="4"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </div>
                    <span>
                      Share notes and collaborate with other professionals
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-2 rounded-full bg-secondary/70 p-1">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="4"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </div>
                    <span>Secure and HIPAA-compliant data storage</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
