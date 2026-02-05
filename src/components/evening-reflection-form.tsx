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
  reflection: z.string().min(10, {
    message: "Reflection must be at least 10 characters.",
  }).max(500, {
    message: "Reflection must not be longer than 500 characters.",
  }),
});

interface EveningReflectionFormProps {
  onComplete: () => void;
  initialReflection?: string;
}

export function EveningReflectionForm({ onComplete, initialReflection = '' }: EveningReflectionFormProps) {
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reflection: initialReflection,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!session?.user?.id) {
      toast.error('You must be logged in to save a reflection.');
      router.push('/auth/login');
      return;
    }

    setIsSaving(true);
    const userId = session.user.id;

    // Check if a reflection for today already exists
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: existingCheckIn, error: fetchError } = await supabase
      .from('check_ins')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'evening_reflection')
      .gte('checked_in_at', `${today}T00:00:00.000Z`)
      .lte('checked_in_at', `${today}T23:59:59.999Z`)
      .maybeSingle();

    let error;
    if (existingCheckIn) {
      // Update existing reflection
      const { error: updateError } = await supabase
        .from('check_ins')
        .update({ content: { reflection: values.reflection }, checked_in_at: new Date().toISOString() })
        .eq('id', existingCheckIn.id);
      error = updateError;
    } else {
      // Insert new reflection
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert({
          user_id: userId,
          type: 'evening_reflection',
          content: { reflection: values.reflection },
          checked_in_at: new Date().toISOString(),
        });
      error = insertError;
    }

    if (error) {
      toast.error('Failed to save evening reflection: ' + error.message);
    } else {
      toast.success('Evening reflection saved successfully!');
      onComplete();
    }
    setIsSaving(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <FormField
          control={form.control}
          name="reflection"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How was your day? What did you learn or achieve?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., 'Today was productive. I learned to be more patient during challenges.'"
                  className="resize-y min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Reflection'}
        </Button>
      </form>
    </Form>
  );
}