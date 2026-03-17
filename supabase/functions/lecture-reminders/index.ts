import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  if (!rateLimit(ip, 5, 60_000)) return rateLimitResponse();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Current time in PKT (UTC+5)
    const now = new Date();
    const pktOffset = 5 * 60 * 60 * 1000;
    const pktNow = new Date(now.getTime() + pktOffset);

    const pktDay = pktNow.getUTCDay();
    if (pktDay === 0 || pktDay === 6) {
      return new Response(JSON.stringify({ message: 'Weekend, no lectures' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const dayOfWeek = pktDay;
    const currentHours = pktNow.getUTCHours();
    const currentMinutes = pktNow.getUTCMinutes();
    const currentTotalMin = currentHours * 60 + currentMinutes;
    const today = pktNow.toISOString().slice(0, 10);

    const { data: lectures, error } = await supabase
      .from('scheduled_lectures')
      .select('id, module_id, lecturer_id, tenant_id, start_time, end_time, modules(title, programme_id)')
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);

    if (error) throw error;

    let notificationsSent = 0;

    for (const lecture of lectures || []) {
      const [h, m] = (lecture.start_time as string).split(':').map(Number);
      const lectureMin = h * 60 + m;
      const diff = lectureMin - currentTotalMin;

      const reminders: { type: string; minutesBefore: number }[] = [];
      if (diff >= 18 && diff <= 22) reminders.push({ type: '20min', minutesBefore: 20 });
      if (diff >= 8 && diff <= 12) reminders.push({ type: '10min', minutesBefore: 10 });

      for (const reminder of reminders) {
        const { data: existing } = await supabase
          .from('lecture_reminders')
          .select('id')
          .eq('scheduled_lecture_id', lecture.id)
          .eq('reminder_type', reminder.type)
          .eq('lecture_date', today)
          .single();

        if (existing) continue;

        const moduleTitle = (lecture as any).modules?.title || 'Lecture';
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const msg = `${moduleTitle} starts in ${reminder.minutesBefore} minutes at ${timeStr} PKT`;

        await supabase.from('notifications').insert({
          user_id: lecture.lecturer_id,
          tenant_id: lecture.tenant_id,
          title: `⏰ ${moduleTitle} in ${reminder.minutesBefore}min`,
          message: msg,
          type: 'academic',
          severity: reminder.type === '10min' ? 'warning' : 'info',
        });

        const programmeId = (lecture as any).modules?.programme_id;
        if (programmeId) {
          const { data: enrolments } = await supabase
            .from('student_enrolments')
            .select('student_id')
            .eq('programme_id', programmeId)
            .eq('status', 'active');

          for (const e of enrolments || []) {
            await supabase.from('notifications').insert({
              user_id: e.student_id,
              tenant_id: lecture.tenant_id,
              title: `⏰ ${moduleTitle} in ${reminder.minutesBefore}min`,
              message: msg,
              type: 'academic',
              severity: reminder.type === '10min' ? 'warning' : 'info',
            });
          }
        }

        await supabase.from('lecture_reminders').insert({
          scheduled_lecture_id: lecture.id,
          reminder_type: reminder.type,
          lecture_date: today,
        });

        notificationsSent++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: notificationsSent, lectures_checked: lectures?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
