import { useAuth } from './use-auth';
import { useQuery } from '@tanstack/react-query';

// Define membership tier hierarchy
const TIER_LEVELS = {
  none: 0,
  basic: 1,
  standard: 2,
  premium: 3
};

// Define feature access by tier
const FEATURE_ACCESS = {
  aiNotes: ['basic', 'standard', 'premium'],
  research: ['standard', 'premium'],
  skeletonTools: ['premium']
};

export function useMembership() {
  const { user } = useAuth();
  
  // Fetch user's subscription status
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['/api/user/subscription'],
    queryFn: async () => {
      if (!user) return { tier: 'none', expiry: null };
      
      const response = await fetch('/api/user/subscription', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        return { tier: 'none', expiry: null };
      }
      
      return response.json();
    },
    enabled: !!user,
  });
  
  // Get user's tier
  const getUserTier = () => {
    if (isLoading) return 'loading';
    if (!user) return 'none';
    
    // Special case for Fateofjustice user
    if (user.username === 'Fateofjustice') return 'premium';
    
    return subscription?.tier || 'none';
  };
  
  // Check if user has access to a specific feature
  const hasAccess = (feature: keyof typeof FEATURE_ACCESS) => {
    const tier = getUserTier();
    
    // While loading, assume no access
    if (tier === 'loading') return false;
    
    // Special case for Fateofjustice user
    if (user?.username === 'Fateofjustice') return true;
    
    // Handle subscription expiry
    if (subscription?.expiry) {
      const expiryDate = new Date(subscription.expiry);
      if (expiryDate < new Date()) {
        return false;
      }
    }
    
    // Check if user's tier grants access to the feature
    const requiredTiers = FEATURE_ACCESS[feature];
    return requiredTiers.includes(tier as string);
  };
  
  // Check if user's tier is at least at a specific level
  const hasMinimumTier = (requiredTier: keyof typeof TIER_LEVELS) => {
    const userTier = getUserTier();
    
    // While loading, assume no access
    if (userTier === 'loading') return false;
    
    // Special case for Fateofjustice user
    if (user?.username === 'Fateofjustice') return true;
    
    // Handle subscription expiry
    if (subscription?.expiry) {
      const expiryDate = new Date(subscription.expiry);
      if (expiryDate < new Date()) {
        return false;
      }
    }
    
    // Check if user's tier is at least at the required level
    const userTierLevel = TIER_LEVELS[userTier as keyof typeof TIER_LEVELS] || 0;
    const requiredTierLevel = TIER_LEVELS[requiredTier];
    
    return userTierLevel >= requiredTierLevel;
  };
  
  return {
    tier: getUserTier(),
    hasAccess,
    hasMinimumTier,
    isLoading,
    subscription
  };
}