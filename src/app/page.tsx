"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";

export default function Home() {
  const { session, isLoading } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/auth/login');
      }
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground">Loading application...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-rows-[1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-1 items-center sm:items-start">
        <h1 className="text-3xl font-bold text-foreground">Triad Wellbeing</h1>
        <p className="text-muted-foreground">Redirecting...</p>
      </main>
      <MadeWithDyad />
    </div>
  );
}