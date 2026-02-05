"use client";

import { useRouter } from 'next/navigation';
import { ActivitySelector } from '@/components/activity-selector';
import { useSupabase } from '@/components/providers/session-context-provider';
import { useEffect } from 'react';

export default function PillarSetupPage() {
  const router = useRouter();
  const { session, isLoading } = useSupabase();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/auth/login'); // Redirect unauthenticated users
    }
  }, [session, isLoading, router]);

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  const handlePillarSetupComplete = () => {
    router.push('/onboarding/reminder-setup'); // Navigate to the next step
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
      <ActivitySelector onComplete={handlePillarSetupComplete} />
    </div>
  );
}