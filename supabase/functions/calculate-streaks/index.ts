// import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// import { format, subDays, isSameDay } from 'https://esm.sh/date-fns@3.6.0';

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response(null, { headers: corsHeaders });
//   }

//   console.log("[calculate-streaks] Function invoked.");

//   const authHeader = req.headers.get('Authorization');
//   if (!authHeader) {
//     console.error("[calculate-streaks] Unauthorized: Missing Authorization header.");
//     return new Response('Unauthorized', { status: 401, headers: corsHeaders });
//   }

//   const token = authHeader.replace('Bearer ', '');
//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL') ?? '',
//     Deno.env.get('SUPABASE_ANON_KEY') ?? '',
//     {
//       global: {
//         headers: { Authorization: `Bearer ${token}` },
//       },
//     }
//   );

//   let userId: string | undefined;
//   try {
//     const { data: { user }, error: userError } = await supabase.auth.getUser();
//     if (userError || !user) {
//       console.error("[calculate-streaks] Error getting user from token:", userError?.message);
//       return new Response('Unauthorized: Invalid token', { status: 401, headers: corsHeaders });
//     }
//     userId = user.id;
//     console.log(`[calculate-streaks] Processing streaks for user: ${userId}`);
//   } catch (e: any) {
//     console.error("[calculate-streaks] Error verifying user token:", e.message);
//     return new Response('Unauthorized: Token verification failed', { status: 401, headers: corsHeaders });
//   }

//   if (!userId) {
//     console.error("[calculate-streaks] User ID not found after authentication.");
//     return new Response('User ID not found', { status: 400, headers: corsHeaders });
//   }

//   const today = new Date();
//   const yesterday = subDays(today, 1);
//   const todayFormatted = format(today, 'yyyy-MM-dd');

//   try {
//     // 1. Fetch all pillars
//     const { data: pillars, error: pillarsError } = await supabase
//       .from('pillars')
//       .select('id, name');

//     if (pillarsError) throw pillarsError;
//     console.log(`[calculate-streaks] Fetched ${pillars.length} pillars.`);

//     // 2. Fetch user's micro-activities
//     const { data: microActivities, error: microActivitiesError } = await supabase
//       .from('micro_activities')
//       .select('id, pillar_id')
//       .eq('user_id', userId);

//     if (microActivitiesError) throw microActivitiesError;
//     console.log(`[calculate-streaks] Fetched ${microActivities.length} micro-activities for user ${userId}.`);

//     const userPillarActivities = new Map<string, string[]>(); // pillar_id -> [activity_id]
//     microActivities.forEach(activity => {
//       if (!userPillarActivities.has(activity.pillar_id)) {
//         userPillarActivities.set(activity.pillar_id, []);
//       }
//       userPillarActivities.get(activity.pillar_id)?.push(activity.id);
//     });

//     // 3. Fetch today's activity logs
//     const { data: activityLogsToday, error: logsTodayError } = await supabase
//       .from('activity_logs')
//       .select('micro_activity_id')
//       .eq('user_id', userId)
//       .gte('logged_at', `${todayFormatted}T00:00:00.000Z`)
//       .lte('logged_at', `${todayFormatted}T23:59:59.999Z`);

//     if (logsTodayError) throw logsTodayError;
//     console.log(`[calculate-streaks] Fetched ${activityLogsToday.length} activity logs for today for user ${userId}.`);

//     const completedActivityIdsToday = new Set(activityLogsToday.map(log => log.micro_activity_id));

//     // Determine completion status for each pillar and overall harmony
//     const pillarCompletionStatus: Map<string, boolean> = new Map(); // pillar_id -> completed_today
//     let harmonyCompletedToday = false;

//     for (const pillar of pillars) {
//       const activitiesForPillar = userPillarActivities.get(pillar.id) || [];
//       const completedForPillar = activitiesForPillar.some(activityId => completedActivityIdsToday.has(activityId));
//       pillarCompletionStatus.set(pillar.id, completedForPillar);
//       if (completedForPillar) {
//         harmonyCompletedToday = true;
//       }
//     }

//     // Process streaks for each pillar and overall harmony
//     const streakUpdates = [];

//     // Iterate over all pillars (including those the user might not have activities for, to reset streaks)
//     for (const pillar of pillars) {
//       const pillarId = pillar.id;
//       const completedToday = pillarCompletionStatus.get(pillarId) || false;

//       const { data: existingStreak, error: fetchStreakError } = await supabase
//         .from('streaks')
//         .select('*')
//         .eq('user_id', userId)
//         .eq('pillar_id', pillarId)
//         .maybeSingle();

//       if (fetchStreakError) throw fetchStreakError;

//       let currentStreak = existingStreak?.current_streak || 0;
//       let longestStreak = existingStreak?.longest_streak || 0;
//       let lastLoggedDate = existingStreak?.last_logged_date ? new Date(existingStreak.last_logged_date) : null;

//       if (completedToday) {
//         if (lastLoggedDate && isSameDay(lastLoggedDate, yesterday)) {
//           currentStreak++;
//         } else if (!lastLoggedDate || !isSameDay(lastLoggedDate, today)) { // Only start new streak if not already logged today
//           currentStreak = 1;
//         }
//         lastLoggedDate = today;
//         longestStreak = Math.max(longestStreak, currentStreak);
//       } else {
//         // If not completed today, and last logged was before yesterday, reset streak
//         if (lastLoggedDate && !isSameDay(lastLoggedDate, yesterday) && !isSameDay(lastLoggedDate, today)) {
//           currentStreak = 0;
//         }
//       }

//       const streakData = {
//         user_id: userId,
//         pillar_id: pillarId,
//         current_streak: currentStreak,
//         longest_streak: longestStreak,
//         last_logged_date: lastLoggedDate ? format(lastLoggedDate, 'yyyy-MM-dd') : null,
//         updated_at: new Date().toISOString(),
//       };

//       if (existingStreak) {
//         streakUpdates.push(
//           supabase.from('streaks').update(streakData).eq('id', existingStreak.id)
//         );
//       } else {
//         streakUpdates.push(
//           supabase.from('streaks').insert(streakData)
//         );
//       }
//       console.log(`[calculate-streaks] Pillar ${pillar.name} streak: current=${currentStreak}, longest=${longestStreak}`);
//     }

//     // Process overall Harmony streak (pillar_id = NULL)
//     const { data: existingHarmonyStreak, error: fetchHarmonyStreakError } = await supabase
//       .from('streaks')
//       .select('*')
//       .eq('user_id', userId)
//       .is('pillar_id', null)
//       .maybeSingle();

//     if (fetchHarmonyStreakError) throw fetchHarmonyStreakError;

//     let harmonyCurrentStreak = existingHarmonyStreak?.current_streak || 0;
//     let harmonyLongestStreak = existingHarmonyStreak?.longest_streak || 0;
//     let harmonyLastLoggedDate = existingHarmonyStreak?.last_logged_date ? new Date(existingHarmonyStreak.last_logged_date) : null;

//     if (harmonyCompletedToday) {
//       if (harmonyLastLoggedDate && isSameDay(harmonyLastLoggedDate, yesterday)) {
//         harmonyCurrentStreak++;
//       } else if (!harmonyLastLoggedDate || !isSameDay(harmonyLastLoggedDate, today)) {
//         harmonyCurrentStreak = 1;
//       }
//       harmonyLastLoggedDate = today;
//       harmonyLongestStreak = Math.max(harmonyLongestStreak, harmonyCurrentStreak);
//     } else {
//       if (harmonyLastLoggedDate && !isSameDay(harmonyLastLoggedDate, yesterday) && !isSameDay(harmonyLastLoggedDate, today)) {
//         harmonyCurrentStreak = 0;
//       }
//     }

//     const harmonyStreakData = {
//       user_id: userId,
//       pillar_id: null, // Overall harmony
//       current_streak: harmonyCurrentStreak,
//       longest_streak: harmonyLongestStreak,
//       last_logged_date: harmonyLastLoggedDate ? format(harmonyLastLoggedDate, 'yyyy-MM-dd') : null,
//       updated_at: new Date().toISOString(),
//     };

//     if (existingHarmonyStreak) {
//       streakUpdates.push(
//         supabase.from('streaks').update(harmonyStreakData).eq('id', existingHarmonyStreak.id)
//       );
//     } else {
//       streakUpdates.push(
//         supabase.from('streaks').insert(harmonyStreakData)
//       );
//     }
//     console.log(`[calculate-streaks] Overall Harmony streak: current=${harmonyCurrentStreak}, longest=${harmonyLongestStreak}`);

//     await Promise.all(streakUpdates);
//     console.log("[calculate-streaks] All streaks updated successfully.");

//     return new Response(JSON.stringify({ message: 'Streaks calculated and updated successfully' }), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       status: 200,
//     });

//   } catch (error: any) {
//     console.error("[calculate-streaks] Error calculating streaks:", error.message);
//     return new Response(JSON.stringify({ error: error.message }), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       status: 500,
//     });
//   }
// });