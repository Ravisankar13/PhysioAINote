import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import SessionManager from '@/components/sessions/SessionManager';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const SessionsPage: React.FC = () => {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Please log in to access your patient sessions and clinical notes.
        </p>
        <Button onClick={() => navigate('/auth')}>
          Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Patient Sessions</h1>
          <p className="text-muted-foreground mt-2">
            Manage your patient sessions, record audio, generate transcripts, and create SOAP notes.
          </p>
        </div>
        
        <SessionManager />
      </div>
    </div>
  );
};

export default SessionsPage;