import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import BulkEmailDashboard from '@/components/admin/BulkEmailDashboard';

export default function AdminBulkEmailPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Check if user is admin (Fateofjustice)
  if (!user || user.username !== 'Fateofjustice') {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BulkEmailDashboard />
    </div>
  );
}