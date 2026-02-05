"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PILLARS, DEFAULT_MICRO_ACTIVITIES } from '@/lib/constants';
import { toast } from 'sonner';
import { useSupabase } from './providers/session-context-provider';
import { useRouter } from 'next/navigation';

interface ActivitySelectorProps {
  onComplete: () => void;
}

export function ActivitySelector({ onComplete }: ActivitySelectorProps) {
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const [selectedActivities, setSelectedActivities] = useState<Record<string, string[]>>(() => {
    const initialSelection: Record<string, string[]> = {};
    PILLARS.forEach(pillar => {
      initialSelection[pillar.name] = DEFAULT_MICRO_ACTIVITIES[pillar.name as keyof typeof DEFAULT_MICRO_ACTIVITIES].map(activity => activity.name);
    });
    return initialSelection;
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleCheckboxChange = (pillarName: string, activityName: string, checked: boolean) => {
    setSelectedActivities(prev => {
      const currentPillarActivities = prev[pillarName] || [];
      if (checked) {
        return {
          ...prev,
          [pillarName]: [...currentPillarActivities, activityName],
        };
      } else {
        return {
          ...prev,
          [pillarName]: currentPillarActivities.filter(name => name !== activityName),
        };
      }
    });
  };

  const handleSaveActivities = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to save activities.');
      router.push('/auth/login');
      return;
    }

    setIsSaving(true);
    const userId = session.user.id;
    const activitiesToInsert: { user_id: string; pillar_id: string; name: string; description?: string }[] = [];

    for (const pillar of PILLARS) {
      const selectedNames = selectedActivities[pillar.name] || [];
      const defaultActivitiesForPillar = DEFAULT_MICRO_ACTIVITIES[pillar.name as keyof typeof DEFAULT_MICRO_ACTIVITIES];

      for (const activityName of selectedNames) {
        const defaultActivity = defaultActivitiesForPillar.find(a => a.name === activityName);
        activitiesToInsert.push({
          user_id: userId,
          pillar_id: pillar.id,
          name: activityName,
          description: defaultActivity?.description,
        });
      }
    }

    // First, delete existing activities for the user to prevent duplicates on re-setup
    const { error: deleteError } = await supabase
      .from('micro_activities')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      toast.error('Failed to clear existing activities: ' + deleteError.message);
      setIsSaving(false);
      return;
    }

    // Then insert the new selection
    const { error: insertError } = await supabase
      .from('micro_activities')
      .insert(activitiesToInsert);

    if (insertError) {
      toast.error('Failed to save activities: ' + insertError.message);
    } else {
      toast.success('Activities saved successfully!');
      onComplete();
    }
    setIsSaving(false);
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Choose Your Micro-Activities</CardTitle>
        <CardDescription className="text-center">
          Select the small, consistent actions you want to track for each pillar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {PILLARS.map(pillar => (
          <div key={pillar.id} className="border rounded-md p-4">
            <h3 className="text-xl font-semibold mb-2 text-primary">{pillar.name}</h3>
            <p className="text-muted-foreground text-sm mb-4">{pillar.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEFAULT_MICRO_ACTIVITIES[pillar.name as keyof typeof DEFAULT_MICRO_ACTIVITIES].map(activity => (
                <div key={activity.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${pillar.id}-${activity.name}`}
                    checked={selectedActivities[pillar.name]?.includes(activity.name)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(pillar.name, activity.name, checked as boolean)
                    }
                  />
                  <Label htmlFor={`${pillar.id}-${activity.name}`} className="flex flex-col">
                    <span className="font-medium">{activity.name}</span>
                    <span className="text-xs text-muted-foreground">{activity.description}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button onClick={handleSaveActivities} className="w-full" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Activities & Continue'}
        </Button>
      </CardContent>
    </Card>
  );
}