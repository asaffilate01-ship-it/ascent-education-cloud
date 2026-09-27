-- Add Biology as a first-class Years 9-12 Tuition Academy subject.
-- Subjects remain track/board/version specific; this seeds Biology only for existing active tracks.
insert into public.school_tuition_subjects(tenant_id,track_id,subject,exam_board,practical_required,active)
select t.tenant_id,t.id,'Biology',t.curriculum_route,true,true
from public.school_tuition_tracks t
where t.active=true
and not exists(select 1 from public.school_tuition_subjects s where s.track_id=t.id and lower(s.subject)='biology');

-- Biology practical/lab competency can be used by teacher approval and timetable matching.
comment on table public.school_tuition_subjects is
'Board/version-specific Years 9-12 subjects including Maths, Physics, Chemistry, Biology, English and Computing/Technology.';
