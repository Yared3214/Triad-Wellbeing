"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSupabase } from '@/components/providers/session-context-provider';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginPage() {
  const { supabase, session, isLoading } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session) {
      router.push('/dashboard'); // Redirect authenticated users to dashboard
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-foreground">Welcome to Triad Wellbeing</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers unless specified
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                  brandButtonText: 'hsl(var(--primary-foreground))',
                  defaultButtonBackground: 'hsl(var(--secondary))',
                  defaultButtonBackgroundHover: 'hsl(var(--secondary-foreground))',
                  defaultButtonBorder: 'hsl(var(--border))',
                  defaultButtonText: 'hsl(var(--secondary-foreground))',
                  inputBackground: 'hsl(var(--input))',
                  inputBorder: 'hsl(var(--border))',
                  inputBorderHover: 'hsl(var(--ring))',
                  inputBorderFocus: 'hsl(var(--ring))',
                  inputText: 'hsl(var(--foreground))',
                  inputLabelText: 'hsl(var(--muted-foreground))',
                  messageText: 'hsl(var(--foreground))',
                  messageBackground: 'hsl(var(--background))',
                  anchorTextColor: 'hsl(var(--primary))',
                  anchorTextHoverColor: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme="light" // Default to light theme
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email address',
                password_label: 'Password',
                email_input_placeholder: 'Your email address',
                password_input_placeholder: 'Your password',
                button_label: 'Sign in',
                social_provider_text: 'Sign in with {{provider}}',
                link_text: 'Already have an account? Sign in',
              },
              sign_up: {
                email_label: 'Email address',
                password_label: 'Create a password',
                email_input_placeholder: 'Your email address',
                password_input_placeholder: 'Your password',
                button_label: 'Sign up',
                social_provider_text: 'Sign up with {{provider}}',
                link_text: 'Don\'t have an account? Sign up',
              },
              forgotten_password: {
                email_label: 'Email address',
                password_label: 'Your password',
                email_input_placeholder: 'Your email address',
                button_label: 'Send reset instructions',
                link_text: 'Forgot your password?',
              },
              update_password: {
                password_label: 'New password',
                password_input_placeholder: 'Your new password',
                button_label: 'Update password',
              },
            },
          }}
          magicLink
          showLinks={true}
          onAuthStateChange={(event, session) => {
            if (event === 'SIGNED_IN') {
              toast.success('Successfully signed in!');
              router.push('/dashboard');
            } else if (event === 'SIGNED_UP') {
              toast.success('Account created! Please check your email for verification.');
            } else if (event === 'SIGNED_OUT') {
              toast.info('You have been signed out.');
              router.push('/auth/login');
            } else if (event === 'USER_UPDATED') {
              toast.success('Profile updated successfully!');
            } else if (event === 'PASSWORD_RECOVERY') {
              toast.info('Password recovery email sent. Check your inbox.');
            }
          }}
        />
      </div>
    </div>
  );
}