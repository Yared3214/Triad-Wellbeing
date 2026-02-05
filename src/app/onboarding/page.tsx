"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/session-context-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingPage() {
  const { session, isLoading } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/auth/login'); // Redirect unauthenticated users
    }
    // TODO: Check if onboarding is complete and redirect to dashboard
  }, [session, isLoading, router]);

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground">Loading onboarding...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Welcome to Triad Wellbeing!</CardTitle>
          <CardDescription className="text-center">
            Let's set up your personal wellbeing journey.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <p className="text-muted-foreground">
            We'll guide you through selecting micro-activities for your Spiritual, Mental, and Physical pillars, and set up your reminder windows.
          </p>
          <Button onClick={() => router.push('/onboarding/pillar-setup')}>
            Start Setup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}