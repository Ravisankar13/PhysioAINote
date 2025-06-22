import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extended user type with trial information
type UserWithTrialInfo = SelectUser & {
  trialInfo?: {
    isInTrial: boolean;
    trialEndsAt: Date;
    daysRemaining: number;
  };
};

type AuthContextType = {
  user: UserWithTrialInfo | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserWithTrialInfo, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserWithTrialInfo, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password"> & { rememberMe: boolean };

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login with credentials:", {
        username: credentials.username,
      });
      try {
        // Special handling for Fateofjustice account - make sure to match the case
        const normUsername = credentials.username.toLowerCase();
        if (normUsername === 'fateofjustice') {
          credentials.username = 'Fateofjustice'; // Use the correct case
          console.log("Using special case for admin login:", credentials.username);
        }
        
        // Use fetch directly to have more control
        const res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include", // Important for cookies
        });

        if (!res.ok) {
          const errorData = await res.text();
          console.error("Login error response:", errorData);
          throw new Error(errorData || res.statusText);
        }

        const userData = await res.json();
        console.log("Login successful, user data:", userData);
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Setting user data in query cache");
      queryClient.setQueryData(["/api/user"], user);
      // Invalidate any queries that depend on authentication
      queryClient.invalidateQueries();
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log("Attempting to register user:", {
        username: credentials.username,
      });
      try {
        // Use fetch directly for more control
        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include", // Important for cookies
        });

        if (!res.ok) {
          const errorData = await res.text();
          console.error("Registration error response:", errorData);
          throw new Error(errorData || res.statusText);
        }

        const userData = await res.json();
        console.log("Registration successful, user data:", userData);
        return userData;
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Setting user data in query cache after registration");
      queryClient.setQueryData(["/api/user"], user);
      // Invalidate any queries that depend on authentication
      queryClient.invalidateQueries();
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
    },
    onError: (error: Error) => {
      console.error("Registration mutation error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting to log out");
      try {
        // Use fetch directly for more control
        const res = await fetch("/api/logout", {
          method: "POST",
          credentials: "include", // Important for cookies
        });

        if (!res.ok) {
          const errorData = await res.text();
          console.error("Logout error response:", errorData);
          throw new Error(errorData || res.statusText);
        }

        console.log("Logout successful");
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Clearing user data from query cache");
      queryClient.setQueryData(["/api/user"], null);
      // Invalidate any queries that depend on authentication
      queryClient.invalidateQueries();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Logout mutation error:", error);
      toast({
        title: "Logout failed",
        description: error.message || "Failed to log out",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
