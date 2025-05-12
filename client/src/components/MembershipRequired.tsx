import React from 'react';
import { Link } from 'wouter';
import { useMembership } from '@/hooks/use-membership';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

type MembershipRequiredProps = {
  feature: 'aiNotes' | 'research' | 'skeletonTools';
  children: React.ReactNode;
};

export default function MembershipRequired({ feature, children }: MembershipRequiredProps) {
  const { hasAccess, tier } = useMembership();
  const { user } = useAuth();
  
  const featureToTierMap = {
    aiNotes: 'basic',
    research: 'standard',
    skeletonTools: 'premium'
  };
  
  const featureToNameMap = {
    aiNotes: 'AI Clinical Notes',
    research: 'Research Articles',
    skeletonTools: 'Skeleton Visualization Tools'
  };

  // If user has access, render the children
  if (hasAccess(feature)) {
    return <>{children}</>;
  }
  
  // If not authenticated, show sign in prompt
  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto my-8 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In Required</CardTitle>
          <CardDescription>
            You need to sign in to access this feature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">
            The {featureToNameMap[feature]} requires a {featureToTierMap[feature]} membership or higher.
            Please sign in to access this feature.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/auth">
            <Button size="lg">Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }
  
  // User is authenticated but doesn't have the right membership tier
  return (
    <Card className="max-w-2xl mx-auto my-8 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Membership Required</CardTitle>
        <CardDescription>
          Your current membership tier doesn't include access to this feature.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center mb-4">
          The {featureToNameMap[feature]} requires a {featureToTierMap[feature]} membership or higher.
          Your current tier is: <span className="font-semibold capitalize">{tier}</span>
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/membership">
          <Button size="lg">Upgrade Membership</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}