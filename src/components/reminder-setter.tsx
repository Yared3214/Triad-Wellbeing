"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useSupabase } from './providers/session-context-provider';
import { useRouter } from 'next/navigation';

interface ReminderSetterProps {
  onComplete: () => void;
}

export function ReminderSetter({ onComplete }: ReminderSetterProps) {
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const [reminders, setReminders] = useState([
    { name: 'Morning', start_time: '07:00', end_time: '09:00' },
    { name: 'Evening', start_time: '20:00', end_time: '22:00' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleTimeChange = (index: number, field: 'start_time' | 'end_time', value: string) => {
    const newReminders = [...reminders];
    newReminders[index] = { ...newReminders[index], [field]: value };
    setReminders(newReminders);
  };

  const handleSaveReminders = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to save reminders.');
      router.push('/auth/login');
      return;
    }

    setIsSaving(true);
    const userId = session.user.id;

    const remindersToInsert = reminders.map(r => ({
      user_id: userId,
      name: r.name,
      start_time: r.start_time + ':00', // Add seconds for TIME type
      end_time: r.end_time + ':00',     // Add seconds for TIME type
    }));

    // First, delete existing reminders for the user
    const { error: deleteError } = await supabase
      .from('reminder_windows')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      toast.error('Failed to clear existing reminders: ' + deleteError.message);
      setIsSaving(false);
      return;
    }

    // Then insert the new reminders
    const { error: insertError } = await supabase
      .from('reminder_windows')
      .insert(remindersToInsert);

    if (insertError) {
      toast.error('Failed to save reminders: ' + insertError.message);
    } else {
      toast.success('Reminder windows saved successfully!');
      onComplete();
    }
    setIsSaving(false);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Set Your Reminder Windows</CardTitle>
        <CardDescription className="text-center">
          Choose the timeframes when you'd like to receive gentle nudges for your activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {reminders.map((reminder, index) => (
          <div key={index} className="border rounded-md p-4">
            <h3 className="text-xl font-semibold mb-4 text-primary">{reminder.name}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`start-time-${index}`}>Start Time</Label>
                <Input
                  id={`start-time-${index}`}
                  type="time"
                  value={reminder.start_time}
                  onChange={(e) => handleTimeChange(index, 'start_time', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`end-time-${index}`}>End Time</Label>
                <Input
                  id={`end-time-${index}`}
                  type="time"
                  value={reminder.end_time}
                  onChange={(e) => handleTimeChange(index, 'end_time', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
        <Button onClick={handleSaveReminders} className="w-full" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Reminders & Go to Dashboard'}
        </Button>
      </CardContent>
    </Card>
  );
}