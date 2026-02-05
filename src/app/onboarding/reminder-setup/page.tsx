"use client";

import { useRouter } from 'next/navigation';
import { ReminderSetter } from '@/components/reminder-setter';
import { useSupabase } from '@/components/providers/session-context-provider';
import { useEffect } from 'react';

export default function ReminderSetupPage() {
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

  const handleReminderSetupComplete = () => {
    router.push('/dashboard'); // Onboarding complete, go to dashboard
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
      <ReminderSetter onComplete={handleReminderSetupComplete} />
    </div>
  );
}