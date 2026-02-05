"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/session-context-provider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SynergyWheel } from '@/components/synergy-wheel';
import { DailyCheckIn } from '@/components/daily-check-in';
import { PILLARS } from '@/lib/constants';
import { format } from 'date-fns';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Trophy } from 'lucide-react';
import { MorningIntentForm } from '@/components/morning-intent-form';
import { EveningReflectionForm } from '@/components/evening-reflection-form';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Streak {
  pillar_id: string | null;
  current_streak: number;
  longest_streak: number;
}

export default function DashboardPage() {
  const { supabase, session, isLoading } = useSupabase();
  const router = useRouter();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [spiritualProgress, setSpiritualProgress] = useState(0);
  const [mentalProgress, setMentalProgress] = useState(0);
  const [physicalProgress, setPhysicalProgress] = useState(0);
  const [isCheckInSheetOpen, setIsCheckInSheetOpen] = useState(false);
  const [isMorningIntentSheetOpen, setIsMorningIntentSheetOpen] = useState(false);
  const [isEveningReflectionSheetOpen, setIsEveningReflectionSheetOpen] = useState(false);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [morningIntention, setMorningIntention] = useState<string>('');
  const [eveningReflection, setEveningReflection] = useState<string>('');

  const fetchPillarProgressAndStreaksAndCheckIns = useCallback(async (userId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Fetch all pillars to map IDs
    const { data: pillarsData, error: pillarsError } = await supabase
      .from('pillars')
      .select('id, name');

    if (pillarsError) {
      toast.error('Error fetching pillars: ' + pillarsError.message);
      return;
    }

    const pillarIdMap = new Map(pillarsData.map(p => [p.id, p.name]));

    // Fetch user's selected micro-activities
    const { data: microActivities, error: activitiesError } = await supabase
      .from('micro_activities')
      .select('id, pillar_id')
      .eq('user_id', userId);

    if (activitiesError) {
      toast.error('Error fetching micro-activities: ' + activitiesError.message);
      return;
    }

    // Fetch today's activity logs
    const { data: activityLogs, error: logsError } = await supabase
      .from('activity_logs')
      .select('micro_activity_id')
      .eq('user_id', userId)
      .gte('logged_at', `${today}T00:00:00.000Z`)
      .lte('logged_at', `${today}T23:59:59.999Z`);

    if (logsError) {
      toast.error('Error fetching activity logs: ' + logsError.message);
      return;
    }

    const completedActivityIds = new Set(activityLogs.map(log => log.micro_activity_id));

    const pillarActivityCounts: Record<string, { total: number; completed: number }> = {
      Spiritual: { total: 0, completed: 0 },
      Mental: { total: 0, completed: 0 },
      Physical: { total: 0, completed: 0 },
    };

    microActivities.forEach(activity => {
      const pillarName = pillarIdMap.get(activity.pillar_id);
      if (pillarName && pillarActivityCounts[pillarName]) {
        pillarActivityCounts[pillarName].total++;
        if (completedActivityIds.has(activity.id)) {
          pillarActivityCounts[pillarName].completed++;
        }
      }
    });

    setSpiritualProgress(pillarActivityCounts.Spiritual.total > 0 ? (pillarActivityCounts.Spiritual.completed / pillarActivityCounts.Spiritual.total) * 100 : 0);
    setMentalProgress(pillarActivityCounts.Mental.total > 0 ? (pillarActivityCounts.Mental.completed / pillarActivityCounts.Mental.total) * 100 : 0);
    setPhysicalProgress(pillarActivityCounts.Physical.total > 0 ? (pillarActivityCounts.Physical.completed / pillarActivityCounts.Physical.total) * 100 : 0);

    // Fetch streaks
    const { data: userStreaks, error: streaksError } = await supabase
      .from('streaks')
      .select('pillar_id, current_streak, longest_streak')
      .eq('user_id', userId);

    if (streaksError) {
      toast.error('Error fetching streaks: ' + streaksError.message);
      return;
    }
    setStreaks(userStreaks || []);

    // Fetch today's morning intention
    const { data: morningIntentData, error: morningIntentError } = await supabase
      .from('check_ins')
      .select('content')
      .eq('user_id', userId)
      .eq('type', 'morning_intent')
      .gte('checked_in_at', `${today}T00:00:00.000Z`)
      .lte('checked_in_at', `${today}T23:59:59.999Z`)
      .maybeSingle();

    if (morningIntentError) {
      console.error('Error fetching morning intention:', morningIntentError.message);
    } else if (morningIntentData?.content && typeof morningIntentData.content === 'object' && 'intention' in morningIntentData.content) {
      setMorningIntention(morningIntentData.content.intention as string);
    } else {
      setMorningIntention('');
    }

    // Fetch today's evening reflection
    const { data: eveningReflectionData, error: eveningReflectionError } = await supabase
      .from('check_ins')
      .select('content')
      .eq('user_id', userId)
      .eq('type', 'evening_reflection')
      .gte('checked_in_at', `${today}T00:00:00.000Z`)
      .lte('checked_in_at', `${today}T23:59:59.999Z`)
      .maybeSingle();

    if (eveningReflectionError) {
      console.error('Error fetching evening reflection:', eveningReflectionError.message);
    } else if (eveningReflectionData?.content && typeof eveningReflectionData.content === 'object' && 'reflection' in eveningReflectionData.content) {
      setEveningReflection(eveningReflectionData.content.reflection as string);
    } else {
      setEveningReflection('');
    }

  }, [supabase]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/auth/login'); // Redirect unauthenticated users to login
      return;
    }

    const checkOnboardingStatus = async () => {
      if (session?.user?.id) {
        // Check if user has selected micro-activities
        const { data: activities, error: activitiesError } = await supabase
          .from('micro_activities')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);

        if (activitiesError) {
          toast.error('Error checking activities: ' + activitiesError.message);
          setCheckingOnboarding(false);
          return;
        }

        // Check if user has set reminder windows
        const { data: reminders, error: remindersError } = await supabase
          .from('reminder_windows')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);

        if (remindersError) {
          toast.error('Error checking reminders: ' + remindersError.message);
          setCheckingOnboarding(false);
          return;
        }

        if (activities && activities.length > 0 && reminders && reminders.length > 0) {
          setIsOnboardingComplete(true);
          fetchPillarProgressAndStreaksAndCheckIns(session.user.id); // Fetch all data once onboarding is confirmed
        } else {
          router.push('/onboarding'); // Redirect to onboarding if not complete
        }
      }
      setCheckingOnboarding(false);
    };

    if (session && !isLoading) {
      checkOnboardingStatus();
    }
  }, [session, isLoading, router, supabase, fetchPillarProgressAndStreaksAndCheckIns]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out: ' + error.message);
    } else {
      toast.success('Signed out successfully!');
      router.push('/auth/login');
    }
  };

  const handleCheckInComplete = () => {
    setIsCheckInSheetOpen(false);
    if (session?.user?.id) {
      fetchPillarProgressAndStreaksAndCheckIns(session.user.id); // Re-fetch all data after check-in
    }
  };

  const handleMorningIntentComplete = () => {
    setIsMorningIntentSheetOpen(false);
    if (session?.user?.id) {
      fetchPillarProgressAndStreaksAndCheckIns(session.user.id); // Re-fetch all data after intent
    }
  };

  const handleEveningReflectionComplete = () => {
    setIsEveningReflectionSheetOpen(false);
    if (session?.user?.id) {
      fetchPillarProgressAndStreaksAndCheckIns(session.user.id); // Re-fetch all data after reflection
    }
  };

  const getPillarNameById = (pillarId: string | null) => {
    if (pillarId === null) return 'Harmony';
    return PILLARS.find(p => p.id === pillarId)?.name || 'Unknown Pillar';
  };

  if (isLoading || checkingOnboarding || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
      <h1 className="text-4xl font-bold mb-8">Your Triad Wellbeing</h1>
      <p className="text-lg mb-4">Track your Spiritual, Mental, and Physical harmony.</p>
      
      <div className="w-full max-w-md aspect-square mb-8">
        <SynergyWheel
          spiritualProgress={spiritualProgress}
          mentalProgress={mentalProgress}
          physicalProgress={physicalProgress}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <Sheet open={isMorningIntentSheetOpen} onOpenChange={setIsMorningIntentSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">Set Morning Intention</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Morning Intention</SheetTitle>
              <SheetDescription>
                What do you want to focus on today?
              </SheetDescription>
            </SheetHeader>
            <MorningIntentForm onComplete={handleMorningIntentComplete} initialIntention={morningIntention} />
          </SheetContent>
        </Sheet>

        <Sheet open={isCheckInSheetOpen} onOpenChange={setIsCheckInSheetOpen}>
          <SheetTrigger asChild>
            <Button>Log Daily Activities</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Daily Check-in</SheetTitle>
              <SheetDescription>
                Mark the micro-activities you completed today.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-full">
            <DailyCheckIn onComplete={handleCheckInComplete} />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <Sheet open={isEveningReflectionSheetOpen} onOpenChange={setIsEveningReflectionSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">Evening Reflection</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Evening Reflection</SheetTitle>
              <SheetDescription>
                Reflect on your day and what you've learned.
              </SheetDescription>
            </SheetHeader>
            <EveningReflectionForm onComplete={handleEveningReflectionComplete} initialReflection={eveningReflection} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mb-8">
        {streaks.map((streak) => (
          <Card key={streak.pillar_id || 'harmony'} className="text-center">
            <CardHeader>
              <CardTitle className="text-xl">{getPillarNameById(streak.pillar_id)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-2">
              <div className="flex items-center text-lg font-semibold">
                <Flame className="h-5 w-5 text-orange-500 mr-2" />
                <span>Current: {streak.current_streak} days</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                <span>Longest: {streak.longest_streak} days</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={handleSignOut} variant="destructive">
        Sign Out
      </Button>
    </div>
  );
}