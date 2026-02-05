"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSupabase } from './providers/session-context-provider';
import { PILLARS } from '@/lib/constants';
import { format } from 'date-fns';

interface DailyCheckInProps {
  onComplete: () => void;
}

interface MicroActivity {
  id: string;
  name: string;
  description: string | null;
  pillar_id: string;
}

export function DailyCheckIn({ onComplete }: DailyCheckInProps) {
  const { supabase, session } = useSupabase();
  const [userActivities, setUserActivities] = useState<MicroActivity[]>([]);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  const fetchUserActivitiesAndLogs = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to log activities.');
      return;
    }

    setIsLoadingActivities(true);
    const userId = session.user.id;
    const today = format(new Date(), 'yyyy-MM-dd');

    // Fetch user's selected micro-activities
    const { data: activities, error: activitiesError } = await supabase
      .from('micro_activities')
      .select('id, name, description, pillar_id')
      .eq('user_id', userId);

    if (activitiesError) {
      toast.error('Error fetching micro-activities: ' + activitiesError.message);
      setIsLoadingActivities(false);
      return;
    }
    setUserActivities(activities || []);

    // Fetch today's activity logs
    const { data: logs, error: logsError } = await supabase
      .from('activity_logs')
      .select('micro_activity_id')
      .eq('user_id', userId)
      .gte('logged_at', `${today}T00:00:00.000Z`)
      .lte('logged_at', `${today}T23:59:59.999Z`);

    if (logsError) {
      toast.error('Error fetching activity logs: ' + logsError.message);
      setIsLoadingActivities(false);
      return;
    }

    const initialCompleted = new Set(logs.map(log => log.micro_activity_id));
    setCompletedActivities(initialCompleted);
    setIsLoadingActivities(false);
  };

  useEffect(() => {
    if (session) {
      fetchUserActivitiesAndLogs();
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckboxChange = (activityId: string, checked: boolean) => {
    setCompletedActivities(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(activityId);
      } else {
        newSet.delete(activityId);
      }
      return newSet;
    });
  };

  const handleSaveCheckIn = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to save activities.');
      return;
    }

    setIsSaving(true);
    const userId = session.user.id;
    const today = format(new Date(), 'yyyy-MM-dd');

    // First, delete all existing logs for today for this user
    const { error: deleteError } = await supabase
      .from('activity_logs')
      .delete()
      .eq('user_id', userId)
      .gte('logged_at', `${today}T00:00:00.000Z`)
      .lte('logged_at', `${today}T23:59:59.999Z`);

    if (deleteError) {
      toast.error('Failed to clear existing logs: ' + deleteError.message);
      setIsSaving(false);
      return;
    }

    // Then insert the newly selected completed activities
    const activitiesToInsert = Array.from(completedActivities).map(activityId => ({
      user_id: userId,
      micro_activity_id: activityId,
      logged_at: new Date().toISOString(),
    }));

    if (activitiesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('activity_logs')
        .insert(activitiesToInsert);

      if (insertError) {
        toast.error('Failed to save activities: ' + insertError.message);
        setIsSaving(false);
        return;
      }
    }

    // Invoke the streak calculation edge function
    const { data, error: streakError } = await supabase.functions.invoke('calculate-streaks', {
      body: { userId }, // The edge function will get the user from the JWT, but this is good practice
    });

    if (streakError) {
      toast.error('Failed to update streaks: ' + streakError.message);
      console.error('Streak calculation error:', streakError);
    } else {
      console.log('Streak calculation successful:', data);
    }

    toast.success('Daily activities logged successfully!');
    setIsSaving(false);
    onComplete();
  };

  if (isLoadingActivities) {
    return <div className="p-4 text-center text-muted-foreground">Loading activities...</div>;
  }

  if (userActivities.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No micro-activities selected. Please complete the onboarding to choose your activities.
      </div>
    );
  }

  const activitiesByPillar: Record<string, MicroActivity[]> = PILLARS.reduce((acc, pillar) => {
    acc[pillar.id] = userActivities.filter(activity => activity.pillar_id === pillar.id);
    return acc;
  }, {} as Record<string, MicroActivity[]>);

  return (
    <div className="space-y-6 px-4 py-10">
      {PILLARS.map(pillar => (
        <div key={pillar.id} className="border rounded-md p-4">
          <h3 className="text-xl font-semibold mb-2 text-primary">{pillar.name}</h3>
          <div className="grid grid-cols-1 gap-4">
            {activitiesByPillar[pillar.id]?.map(activity => (
              <div key={activity.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`activity-${activity.id}`}
                  checked={completedActivities.has(activity.id)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(activity.id, checked as boolean)
                  }
                />
                <Label htmlFor={`activity-${activity.id}`} className="flex flex-col">
                  <span className="font-medium">{activity.name}</span>
                  <span className="text-xs text-muted-foreground">{activity.description}</span>
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={handleSaveCheckIn} className="w-full" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Daily Check-in'}
      </Button>
    </div>
  );
}