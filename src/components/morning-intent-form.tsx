"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { useSupabase } from './providers/session-context-provider';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  intention: z.string().min(10, {
    message: "Intention must be at least 10 characters.",
  }).max(500, {
    message: "Intention must not be longer than 500 characters.",
  }),
});

interface MorningIntentFormProps {
  onComplete: () => void;
  initialIntention?: string;
}

export function MorningIntentForm({ onComplete, initialIntention = '' }: MorningIntentFormProps) {
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      intention: initialIntention,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!session?.user?.id) {
      toast.error('You must be logged in to set an intention.');
      router.push('/auth/login');
      return;
    }

    setIsSaving(true);
    const userId = session.user.id;

    // Check if an intention for today already exists
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: existingCheckIn, error: fetchError } = await supabase
      .from('check_ins')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'morning_intent')
      .gte('checked_in_at', `${today}T00:00:00.000Z`)
      .lte('checked_in_at', `${today}T23:59:59.999Z`)
      .maybeSingle();

    let error;
    if (existingCheckIn) {
      // Update existing intention
      const { error: updateError } = await supabase
        .from('check_ins')
        .update({ content: { intention: values.intention }, checked_in_at: new Date().toISOString() })
        .eq('id', existingCheckIn.id);
      error = updateError;
    } else {
      // Insert new intention
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert({
          user_id: userId,
          type: 'morning_intent',
          content: { intention: values.intention },
          checked_in_at: new Date().toISOString(),
        });
      error = insertError;
    }

    if (error) {
      toast.error('Failed to save morning intention: ' + error.message);
    } else {
      toast.success('Morning intention saved successfully!');
      onComplete();
    }
    setIsSaving(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <FormField
          control={form.control}
          name="intention"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What is your intention for today?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., 'Focus on mindful presence and complete my key tasks.'"
                  className="resize-y min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Set Intention'}
        </Button>
      </form>
    </Form>
  );
}