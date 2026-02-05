import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { format, subDays, isSameDay } from 'date-fns';

export async function POST(req: NextRequest) {
  console.log("[calculate-streaks] Function invoked.");

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("[calculate-streaks] Unauthorized: Missing Authorization header.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client with the token
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return (await cookies()).get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // Server cookies can't be set in API routes like this
            // We'll handle auth via token instead
          },
          remove(name: string, options: any) {
            // Same as above
          },
        },
      }
    );

    // Set the auth header for this request
    supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[calculate-streaks] Error getting user from token:", userError?.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401, headers: corsHeaders });
    }

    const userId = user.id;
    console.log(`[calculate-streaks] Processing streaks for user: ${userId}`);

    const today = new Date();
    const yesterday = subDays(today, 1);
    const todayFormatted = format(today, 'yyyy-MM-dd');

    // 1. Fetch all pillars
    const { data: pillars, error: pillarsError } = await supabase
      .from('pillars')
      .select('id, name');

    if (pillarsError) throw pillarsError;
    console.log(`[calculate-streaks] Fetched ${pillars?.length || 0} pillars.`);

    // 2. Fetch user's micro-activities
    const { data: microActivities, error: microActivitiesError } = await supabase
      .from('micro_activities')
      .select('id, pillar_id')
      .eq('user_id', userId);

    if (microActivitiesError) throw microActivitiesError;
    console.log(`[calculate-streaks] Fetched ${microActivities?.length || 0} micro-activities for user ${userId}.`);

    const userPillarActivities = new Map<string, string[]>(); // pillar_id -> [activity_id]
    microActivities?.forEach((activity: any) => {
      if (!userPillarActivities.has(activity.pillar_id)) {
        userPillarActivities.set(activity.pillar_id, []);
      }
      userPillarActivities.get(activity.pillar_id)?.push(activity.id);
    });

    // 3. Fetch today's activity logs
    const { data: activityLogsToday, error: logsTodayError } = await supabase
      .from('activity_logs')
      .select('micro_activity_id')
      .eq('user_id', userId)
      .gte('logged_at', `${todayFormatted}T00:00:00.000Z`)
      .lte('logged_at', `${todayFormatted}T23:59:59.999Z`);

    if (logsTodayError) throw logsTodayError;
    console.log(`[calculate-streaks] Fetched ${activityLogsToday?.length || 0} activity logs for today for user ${userId}.`);

    const completedActivityIdsToday = new Set(activityLogsToday?.map((log: any) => log.micro_activity_id));

    // Determine completion status for each pillar and overall harmony
    const pillarCompletionStatus: Map<string, boolean> = new Map(); // pillar_id -> completed_today
    let harmonyCompletedToday = false;

    for (const pillar of pillars || []) {
      const activitiesForPillar = userPillarActivities.get(pillar.id) || [];
      const completedForPillar = activitiesForPillar.some(activityId => completedActivityIdsToday.has(activityId));
      pillarCompletionStatus.set(pillar.id, completedForPillar);
      if (completedForPillar) {
        harmonyCompletedToday = true;
      }
    }

    // Process streaks for each pillar and overall harmony
    const streakUpdates = [];

    // Iterate over all pillars
    for (const pillar of pillars || []) {
      const pillarId = pillar.id;
      const completedToday = pillarCompletionStatus.get(pillarId) || false;

      const { data: existingStreak, error: fetchStreakError } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .eq('pillar_id', pillarId)
        .maybeSingle();

      if (fetchStreakError) throw fetchStreakError;

      let currentStreak = existingStreak?.current_streak || 0;
      let longestStreak = existingStreak?.longest_streak || 0;
      let lastLoggedDate = existingStreak?.last_logged_date ? new Date(existingStreak.last_logged_date) : null;

      if (completedToday) {
        if (lastLoggedDate && isSameDay(lastLoggedDate, yesterday)) {
          currentStreak++;
        } else if (!lastLoggedDate || !isSameDay(lastLoggedDate, today)) {
          currentStreak = 1;
        }
        lastLoggedDate = today;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        // If not completed today, and last logged was before yesterday, reset streak
        if (lastLoggedDate && !isSameDay(lastLoggedDate, yesterday) && !isSameDay(lastLoggedDate, today)) {
          currentStreak = 0;
        }
      }

      const streakData = {
        user_id: userId,
        pillar_id: pillarId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_logged_date: lastLoggedDate ? format(lastLoggedDate, 'yyyy-MM-dd') : null,
        updated_at: new Date().toISOString(),
      };

      if (existingStreak) {
        streakUpdates.push(
          supabase.from('streaks').update(streakData).eq('id', existingStreak.id)
        );
      } else {
        streakUpdates.push(
          supabase.from('streaks').insert(streakData)
        );
      }
      console.log(`[calculate-streaks] Pillar ${pillar.name} streak: current=${currentStreak}, longest=${longestStreak}`);
    }

    // Process overall Harmony streak (pillar_id = NULL)
    const { data: existingHarmonyStreak, error: fetchHarmonyStreakError } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .is('pillar_id', null)
      .maybeSingle();

    if (fetchHarmonyStreakError) throw fetchHarmonyStreakError;

    let harmonyCurrentStreak = existingHarmonyStreak?.current_streak || 0;
    let harmonyLongestStreak = existingHarmonyStreak?.longest_streak || 0;
    let harmonyLastLoggedDate = existingHarmonyStreak?.last_logged_date ? new Date(existingHarmonyStreak.last_logged_date) : null;

    if (harmonyCompletedToday) {
      if (harmonyLastLoggedDate && isSameDay(harmonyLastLoggedDate, yesterday)) {
        harmonyCurrentStreak++;
      } else if (!harmonyLastLoggedDate || !isSameDay(harmonyLastLoggedDate, today)) {
        harmonyCurrentStreak = 1;
      }
      harmonyLastLoggedDate = today;
      harmonyLongestStreak = Math.max(harmonyLongestStreak, harmonyCurrentStreak);
    } else {
      if (harmonyLastLoggedDate && !isSameDay(harmonyLastLoggedDate, yesterday) && !isSameDay(harmonyLastLoggedDate, today)) {
        harmonyCurrentStreak = 0;
      }
    }

    const harmonyStreakData = {
      user_id: userId,
      pillar_id: null, // Overall harmony
      current_streak: harmonyCurrentStreak,
      longest_streak: harmonyLongestStreak,
      last_logged_date: harmonyLastLoggedDate ? format(harmonyLastLoggedDate, 'yyyy-MM-dd') : null,
      updated_at: new Date().toISOString(),
    };

    if (existingHarmonyStreak) {
      streakUpdates.push(
        supabase.from('streaks').update(harmonyStreakData).eq('id', existingHarmonyStreak.id)
      );
    } else {
      streakUpdates.push(
        supabase.from('streaks').insert(harmonyStreakData)
      );
    }
    console.log(`[calculate-streaks] Overall Harmony streak: current=${harmonyCurrentStreak}, longest=${harmonyLongestStreak}`);

    await Promise.all(streakUpdates);
    console.log("[calculate-streaks] All streaks updated successfully.");

    return NextResponse.json(
      { message: 'Streaks calculated and updated successfully' },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("[calculate-streaks] Error calculating streaks:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Also handle GET requests if needed
export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Use POST to calculate streaks' });
}