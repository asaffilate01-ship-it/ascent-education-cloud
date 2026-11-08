import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {BookOpen, Plus, ShieldCheck} from 'lucide-react';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows, rowsByIds} from '@/lib/pagedRows';
import {canUseActiveRole} from '@/lib/roleMembership';
import {formatPakistanAcademicDate} from '@/lib/assessment/courseworkQueue';
import {
  TEACHING_MODULE_COLUMNS, LECTURER_BRIEF_COLUMNS, LECTURER_BRIEF_RECEIPT_COLUMNS, LECTURER_CRITERION_COLUMNS,
  teachingModule, lecturerBrief, lecturerCriterion, emptyBriefForm, emptyCriterionForm,
  reviewLecturerBrief, reviewLecturerCriterion, confirmedLecturerCreation, definiteLecturerInsertError,
  briefReviewIdentity, rubricReviewIdentity,
  type TeachingModule, type LecturerBrief, type LecturerCriterion, type BriefForm, type CriterionForm, type NewLecturerBrief,
} from '@/lib/assessment/lecturerBriefs';

type Creation = ({kind: 'brief'; payload: NewLecturerBrief} | {kind: 'criterion'; payload: LecturerCriterion; brief: LecturerBrief; rubricIdentity: string})
  & {moduleTitle: string; moduleId: string; uncertain: boolean; conflict: boolean};
const LECTURER_ROLES = ['lecturer', 'programme_leader', 'centre_director', 'superadmin'] as const;
const fieldClass = 'mt-1 min-w-0 max-w-full px-[min(0.75rem,12px)] sm:px-3';
const selectClass = 'mt-1 min-h-11 w-full min-w-0 max-w-full rounded-md border bg-background px-[min(0.75rem,12px)] py-2 text-base sm:px-3';
const buttonClass = 'h-auto min-h-11 max-w-full gap-[min(0.5rem,8px)] px-[min(1rem,16px)] whitespace-normal [overflow-wrap:anywhere]';

function verifiedRows<T extends {id: string}>(rows: unknown[], parse: (row: unknown) => T | null): T[] {
  const parsed = rows.map(parse);
  if (parsed.some(row => row === null) || new Set(parsed.map(row => row?.id)).size !== parsed.length) throw Error('The assigned assessment records could not be verified. Retry the assessment list.');
  return parsed as T[];
}
const message = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export default function LecturerAssessmentBriefs() {
  const {user, loading} = useAuth();
  const [params] = useSearchParams();
  const filter = params.get('module') || '';
  const memberships = Array.isArray(user?.roles) ? [...user.roles].sort() : null;
  return <BriefsWorkspace key={JSON.stringify([user?.id, user?.tenantId, user?.role, memberships, loading, filter])} moduleFilter={filter}/>;
}

function BriefsWorkspace({moduleFilter}: {moduleFilter: string}) {
  const {user, loading: authLoading} = useAuth();
  const uid = user?.id || '', tenant = user?.tenantId || '';
  const active = !authLoading && !!uid && !!tenant && !!user && canUseActiveRole(user, LECTURER_ROLES);
  const scope = useMemo(() => ({userId: uid, tenantId: tenant}), [uid, tenant]);
  const [modules, setModules] = useState<TeachingModule[]>([]);
  const [briefs, setBriefs] = useState<LecturerBrief[]>([]);
  const [criteria, setCriteria] = useState<LecturerCriterion[]>([]);
  const [lookup, setLookup] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<BriefForm>(() => emptyBriefForm(moduleFilter));
  const [selected, setSelected] = useState('');
  const [criterionDrafts, setCriterionDrafts] = useState<Record<string, CriterionForm>>({});
  const [formIssue, setFormIssue] = useState(''), [savedMessage, setSavedMessage] = useState('');
  const [reviewed, setReviewed] = useState<Creation | null>(null), [reviewOpen, setReviewOpen] = useState(false);
  const [issue, setIssue] = useState('');
  const [pending, setPending] = useState<'review' | 'save' | 'check' | null>(null);
  const mounted = useRef(true), generation = useRef(0), operation = useRef<object | null>(null), reviewRef = useRef<Creation | null>(null);
  const opener = useRef<HTMLElement | null>(null), reviewHeading = useRef<HTMLHeadingElement | null>(null), workspaceHeading = useRef<HTMLHeadingElement | null>(null), recoveryButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {const requests = generation; mounted.current = true; return () => {mounted.current = false; requests.current++;};}, []);
  const replaceReview = (next: Creation | null) => {reviewRef.current = next; setReviewed(next);};

  const load = useCallback(async () => {
    const token = ++generation.current;
    const current = () => mounted.current && token === generation.current;
    if (!active) return;
    setLookup('loading'); setLoadError('');
    try {
      const moduleRows = await pagedRows<unknown>(() => {
        let query = db.from('modules').select(TEACHING_MODULE_COLUMNS).eq('tenant_id', tenant).eq('lecturer_id', uid);
        if (moduleFilter) query = query.eq('id', moduleFilter);
        return query;
      }, current);
      if (!current()) return;
      const assigned = verifiedRows(moduleRows, row => teachingModule(row, scope));
      if (moduleFilter && assigned.some(row => row.id !== moduleFilter)) throw Error('The selected teaching module could not be verified.');
      const moduleIds = assigned.map(row => row.id);
      const briefRows = await rowsByIds<unknown>(moduleIds, ids => () => db.from('unipathway_assessment_briefs').select(LECTURER_BRIEF_COLUMNS)
        .eq('tenant_id', tenant).eq('lecturer_id', uid).in('module_id', ids), current);
      if (!current()) return;
      const mine = verifiedRows(briefRows, row => lecturerBrief(row, scope, moduleIds));
      const briefIds = mine.map(row => row.id);
      const criterionRows = await rowsByIds<unknown>(briefIds, ids => () => db.from('unipathway_assessment_criteria').select(LECTURER_CRITERION_COLUMNS)
        .eq('tenant_id', tenant).in('brief_id', ids), current);
      if (!current()) return;
      const rubric = verifiedRows(criterionRows, row => lecturerCriterion(row, tenant, briefIds));
      setModules(assigned.sort((a, b) => a.title.localeCompare(b.title)));
      setBriefs(mine.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)));
      setCriteria(rubric.sort((a, b) => a.display_order - b.display_order)); setLookup('ready');
    } catch (error) {
      if (!current()) return;
      setModules([]); setBriefs([]); setCriteria([]); setLookup('error');
      setLoadError(message(error, 'Your assigned assessment records could not be loaded. Retry the assessment list.'));
    }
  }, [active, moduleFilter, scope, tenant, uid]);
  useEffect(() => {const requests = generation; void load(); return () => {requests.current++;};}, [load]);

  async function verifyModule(moduleId: string) {
    const result = await db.from('modules').select(TEACHING_MODULE_COLUMNS).eq('id', moduleId).eq('tenant_id', tenant).eq('lecturer_id', uid).maybeSingle();
    const module = teachingModule(result.data, scope);
    if (result.error || !module || module.id !== moduleId || (moduleFilter && module.id !== moduleFilter)) throw Error('This teaching module is no longer available to your account. Refresh the assessment list.');
    return module;
  }
  async function verifyBrief(brief: LecturerBrief, current: () => boolean) {
    const result = await db.from('unipathway_assessment_briefs').select(LECTURER_BRIEF_COLUMNS).eq('id', brief.id)
      .eq('tenant_id', tenant).eq('lecturer_id', uid).eq('module_id', brief.module_id).maybeSingle();
    if (!current()) throw Error('Request superseded');
    const checked = lecturerBrief(result.data, scope, [brief.module_id]);
    if (result.error || !checked || checked.id !== brief.id || checked.status !== 'draft') throw Error('This assessment is no longer an available unpublished draft. Refresh the assessment list.');
    const rows = await pagedRows<unknown>(() => db.from('unipathway_assessment_criteria').select(LECTURER_CRITERION_COLUMNS)
      .eq('tenant_id', tenant).eq('brief_id', brief.id), current);
    return {brief: checked, criteria: verifiedRows(rows, row => lecturerCriterion(row, tenant, [brief.id]))};
  }

  const changeForm = (field: keyof BriefForm, value: string) => {
    if (operation.current || reviewRef.current) return;
    setFormIssue(''); setSavedMessage('');
    setForm(previous => ({...previous, [field]: value, ...(field === 'attempts' && value === '1' ? {penalty: '0'} : {})}));
  };
  const changeCriterion = (field: keyof CriterionForm, value: string) => {
    if (operation.current || reviewRef.current || !selected) return;
    setFormIssue(''); setSavedMessage('');
    setCriterionDrafts(previous => ({...previous, [selected]: {...(previous[selected] || emptyCriterionForm()), [field]: value}}));
  };
  const chooseBrief = (id: string) => {
    if (operation.current || reviewRef.current || !briefs.some(brief => brief.id === id)) return;
    setSelected(id); setFormIssue(''); setSavedMessage('');
  };
  const chosen = briefs.find(brief => brief.id === selected);
  const ownCriteria = criteria.filter(criterion => criterion.brief_id === selected);
  const criterionForm = criterionDrafts[selected] || emptyCriterionForm();

  async function prepareBrief() {
    if (!active || lookup !== 'ready' || operation.current || reviewRef.current) return;
    const module = modules.find(row => row.id === form.moduleId);
    if (!module) {setFormIssue('Choose an assigned teaching module before reviewing this brief.'); return;}
    const ticket = {}; operation.current = ticket; setPending('review'); setFormIssue(''); setSavedMessage('');
    const current = () => mounted.current && operation.current === ticket;
    try {
      const payload = reviewLecturerBrief({...form}, module, scope, crypto.randomUUID());
      const freshModule = await verifyModule(module.id);
      if (!current()) return;
      replaceReview({kind: 'brief', payload, moduleTitle: freshModule.title, moduleId: freshModule.id, uncertain: false, conflict: false});
      setIssue(''); setReviewOpen(true);
    } catch (error) {if (current()) setFormIssue(message(error, 'The brief could not be reviewed. Your draft is kept.'));}
    finally {if (current()) {operation.current = null; setPending(null);}}
  }
  async function prepareCriterion() {
    if (!active || lookup !== 'ready' || operation.current || reviewRef.current || !chosen) return;
    const ticket = {}; operation.current = ticket; setPending('review'); setFormIssue(''); setSavedMessage('');
    const current = () => mounted.current && operation.current === ticket;
    try {
      const requestId = crypto.randomUUID(), draft = {...criterionForm};
      reviewLecturerCriterion(draft, chosen, ownCriteria, scope, requestId);
      const module = await verifyModule(chosen.module_id);
      if (!current()) return;
      const fresh = await verifyBrief(chosen, current);
      if (!current()) return;
      const payload = reviewLecturerCriterion(draft, fresh.brief, fresh.criteria, scope, requestId);
      replaceReview({kind: 'criterion', payload, brief: fresh.brief, rubricIdentity: rubricReviewIdentity(fresh.criteria), moduleTitle: module.title, moduleId: module.id, uncertain: false, conflict: false});
      setIssue(''); setReviewOpen(true);
    } catch (error) {if (current()) setFormIssue(message(error, 'The criterion could not be reviewed. Your draft is kept.'));}
    finally {if (current()) {operation.current = null; setPending(null);}}
  }

  async function saveOrCheck(checkOnly = false) {
    const target = reviewRef.current;
    if (!active || operation.current || !target || target.payload.tenant_id !== tenant || (!checkOnly && target.conflict)) return;
    const ticket = {}; operation.current = ticket; setPending(checkOnly ? 'check' : 'save'); setIssue('');
    const current = () => mounted.current && operation.current === ticket;
    const table = target.kind === 'brief' ? 'unipathway_assessment_briefs' : 'unipathway_assessment_criteria';
    const columns = target.kind === 'brief' ? LECTURER_BRIEF_RECEIPT_COLUMNS : LECTURER_CRITERION_COLUMNS;
    let confirmed = false;
    try {
      if (target.uncertain || checkOnly) {
        let query = db.from(table).select(columns).eq('id', target.payload.id).eq('tenant_id', tenant);
        query = target.kind === 'brief' ? query.eq('lecturer_id', uid).eq('module_id', target.moduleId) : query.eq('brief_id', target.brief.id);
        const result = await query.maybeSingle();
        if (!current()) return;
        if (result.error || result.data === undefined) throw Error('The saved record could not be checked. Keep these reviewed details and retry the check.');
        if (result.data !== null) {
          if (!confirmedLecturerCreation(result.data, target.payload)) {
            replaceReview({...target, uncertain: true, conflict: true});
            throw Error('The saved record does not match these reviewed details. Keep this reference and ask programme management to check it.');
          }
          confirmed = true;
        } else if (checkOnly) {
          replaceReview({...target, uncertain: true, conflict: false});
          setIssue('No matching record is visible yet. The save remains unconfirmed. Retry the same record to keep this reference and avoid a duplicate.');
        }
      }
      if (!confirmed && !checkOnly) {
        const module = await verifyModule(target.moduleId);
        if (!current()) return;
        if (module.title !== target.moduleTitle) throw Error('The module details changed after review. Check the assigned module before saving.');
        if (target.kind === 'brief') {
          if (Date.parse(target.payload.due_at) <= Date.now()) throw Error(target.uncertain
            ? 'The original due date has passed and the save remains unconfirmed. Keep this reference and ask programme management to check it.'
            : 'The reviewed due date is no longer in the future. Return to the draft and set a new deadline.');
        } else {
          const fresh = await verifyBrief(target.brief, current);
          if (!current()) return;
          if (briefReviewIdentity(fresh.brief) !== briefReviewIdentity(target.brief) || rubricReviewIdentity(fresh.criteria) !== target.rubricIdentity) throw Error(target.uncertain
            ? 'The assessment or rubric changed and the original save remains unconfirmed. Keep this reference and ask programme management to check it.'
            : 'The assessment or rubric changed after review. Return to the draft and review this criterion again.');
        }
        // Every uncertain retry retains this UUID and exact payload. INSERT never overwrites an existing record.
        replaceReview({...target, uncertain: true});
        const result = await db.from(table).insert(target.payload).select(columns).maybeSingle();
        if (!current()) return;
        if (result.error) {
          if (!target.uncertain && definiteLecturerInsertError(result.error)) {
            replaceReview({...target, uncertain: false});
            const detail = typeof result.error.message === 'string' ? ': ' + result.error.message : '';
            throw Error('The save was rejected' + detail + '. Your draft is kept; check the details or refresh your assigned assessments before trying again.');
          }
          throw Error('The save was not confirmed. Your reviewed details are kept. Check the saved record before retrying the same record.');
        }
        if (!confirmedLecturerCreation(result.data, target.payload)) throw Error('The save returned no matching receipt. Your reviewed details are kept. Check the saved record before retrying the same record.');
        confirmed = true;
      }
      if (confirmed && current()) {
        replaceReview(null); setReviewOpen(false); setIssue('');
        if (target.kind === 'brief') {setForm(emptyBriefForm(target.moduleId)); setSelected(target.payload.id);}
        else setCriterionDrafts(previous => ({...previous, [target.brief.id]: emptyCriterionForm()}));
        const success = target.kind === 'brief' ? 'Assessment brief saved as an unpublished draft. Complete its rubric for programme-leader approval.' : `Criterion ${target.payload.criterion_code} saved to ${target.brief.title}.`;
        setSavedMessage(success); await load();
      }
    } catch (error) {if (current()) setIssue(message(error, 'The save could not be confirmed. Your reviewed details are kept; check the saved record.'));}
    finally {if (current()) {operation.current = null; setPending(null);}}
  }

  const closeReview = () => {
    if (operation.current) return;
    setReviewOpen(false);
    if (!reviewRef.current?.uncertain) {replaceReview(null); setIssue('');}
  };
  const locked = pending !== null || reviewed !== null;
  const allowCreate = lookup === 'ready' && modules.length > 0;
  const refresh = () => {if (!operation.current && !reviewRef.current) void load();};

  return <DashboardLayout title="Lecturer Teaching and Assessment Briefs" subtitle="Document precisely what was taught; separate assessors and IQA will mark and approve the work">
    <div className="min-w-0 space-y-5 text-sm [overflow-wrap:anywhere] [&_fieldset]:min-w-0 [&_label]:min-w-0">
      {active && <ModuleJourney moduleId={moduleFilter} teacher/>}
      <section className="min-w-0 rounded-xl border bg-primary/5 p-4">
        <h2 ref={workspaceHeading} tabIndex={-1} className="flex items-start gap-2 font-semibold focus:outline-none"><ShieldCheck className="size-5 shrink-0"/>Lecturer sets learning standards — not student grades</h2>
        <p className="mt-2 text-muted-foreground">Record the lesson progress, outcomes, student expectations and acceptable evidence. Add a transparent criterion rubric. A different assessor evaluates coursework, and IQA separately approves the final mark. Resubmissions and any penalties require a manager-approved written policy.</p>
      </section>
      {!active ? <p role={authLoading ? 'status' : 'alert'}>{authLoading ? 'Verifying your teaching access…' : 'A verified active lecturer, programme leader, centre director or superadmin role and assigned centre are required.'}</p> : <>
        {savedMessage && <p role="status" className="rounded-lg border bg-primary/5 p-3">{savedMessage}</p>}
        {reviewed && !reviewOpen && <section aria-label="Unconfirmed assessment save" className="space-y-3 rounded-xl border p-4">
          <p role="alert">This save is not yet confirmed. Your reviewed details and reference are kept while you remain in this workspace.</p>
          <p className="break-all">Reference: {reviewed.payload.id}</p>
          <Button ref={recoveryButton} className={buttonClass} onClick={() => setReviewOpen(true)}>Continue save check</Button>
        </section>}
        {lookup === 'loading' && <p role="status">Loading your teaching assignments…</p>}
        {lookup === 'error' && <div className="space-y-3"><p role="alert" className="rounded-lg border border-destructive p-4">{loadError}</p><Button variant="outline" className={buttonClass} disabled={locked} onClick={refresh}>Retry assessment list</Button></div>}
        {lookup === 'ready' && <>
          {!modules.length && <p className="rounded-lg border p-4">{moduleFilter ? 'This module is not currently assigned to you in this centre.' : 'No teaching modules are currently assigned to you in this centre.'} Ask programme management to check the teaching allocation.</p>}
          {formIssue && <p role="alert" className="rounded-lg border border-destructive p-4">{formIssue}</p>}
          {pending === 'review' && <p role="status">Checking the selected module and assessment before review…</p>}
          <section className="min-w-0 rounded-xl border bg-card px-[min(1rem,16px)] py-5 sm:p-5">
            <h2 className="flex items-start gap-2 font-semibold"><BookOpen className="size-5 shrink-0"/>Create assessment from taught material</h2>
            <p className="mt-2 text-muted-foreground">Deadlines use Pakistan Standard Time (PKT, UTC+05:00), wherever you are using this form.</p>
            <fieldset disabled={locked || !allowCreate} className="mt-3 min-w-0 space-y-3">
              <legend className="sr-only">New assessment brief details</legend>
              <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <label>Assigned teaching module<select aria-label="Assigned teaching module" value={form.moduleId} onChange={event => changeForm('moduleId', event.target.value)} className={selectClass}><option value="">Select module</option>{modules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
                <label>Assessment type<select value={form.kind} onChange={event => changeForm('kind', event.target.value)} className={selectClass}><option value="coursework">Coursework</option><option value="homework">Homework</option><option value="practical">Practical skills assessment</option></select></label>
                {form.moduleId && <p className="text-muted-foreground md:col-span-2">Selected module: {modules.find(module => module.id === form.moduleId)?.title || 'No longer available'}</p>}
                <label className="md:col-span-2">Assessment title<Input className={fieldClass} value={form.title} maxLength={180} onChange={event => changeForm('title', event.target.value)} placeholder="e.g. Physics mechanics: force and acceleration"/></label>
                {([
                  ['Lessons taught and progress', 'teaching', 'Summarise lessons, topics taught and what the lecturer demonstrated'],
                  ['Learning outcomes', 'outcomes', 'What learners should know or be able to do'],
                  ['Student expectations', 'expectations', 'Explain the required tasks, structure and standard of independent work'],
                  ['Required evidence and deliverables', 'required', 'What to submit: calculations, code, reasoning, practical observations, citations'],
                ] as const).map(([label, field, placeholder]) => <label className="md:col-span-2" key={field}>{label}<Textarea rows={3} className={fieldClass} maxLength={10000} value={form[field]} placeholder={placeholder} onChange={event => changeForm(field, event.target.value)}/></label>)}
                <label>First submission due (Pakistan time)<Input className={fieldClass} type="datetime-local" value={form.due} onChange={event => changeForm('due', event.target.value)}/></label>
                <label>Final submission cutoff (Pakistan time)<Input className={fieldClass} type="datetime-local" value={form.cutoff} onChange={event => changeForm('cutoff', event.target.value)}/></label>
                <label>Allowed attempts<select className={selectClass} value={form.attempts} onChange={event => changeForm('attempts', event.target.value)}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                <label>Approved penalty points per resubmission<Input className={fieldClass} type="number" min={0} max={30} step="any" disabled={form.attempts === '1'} value={form.penalty} onChange={event => changeForm('penalty', event.target.value)}/></label>
                <label className="md:col-span-2">Awarding-body or centre-approved assessment policy reference<Input className={fieldClass} value={form.policy} maxLength={200} onChange={event => changeForm('policy', event.target.value)} placeholder="Approved policy reference — do not invent penalties"/></label>
              </div>
              <Button className={buttonClass} onClick={() => void prepareBrief()}><Plus className="size-4 shrink-0"/>Review assessment brief</Button>
            </fieldset>
          </section>
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <section className="min-w-0 rounded-xl border bg-card px-[min(1rem,16px)] py-5 sm:p-5">
              <h2 className="font-semibold">My assessment briefs ({briefs.length})</h2>
              <Button className={'mt-3 ' + buttonClass} variant="outline" disabled={locked} onClick={refresh}>Refresh assessment briefs</Button>
              <div className="mt-3 space-y-2">{briefs.map(brief => <button type="button" key={brief.id} disabled={locked} aria-label={`Open assessment ${brief.title}`} aria-pressed={selected === brief.id} className={`min-h-11 w-full min-w-0 rounded-lg border p-3 text-left disabled:opacity-50 ${selected === brief.id ? 'border-primary bg-primary/5' : ''}`} onClick={() => chooseBrief(brief.id)}>
                <span className="block font-semibold">{brief.title}</span><span className="mt-1 block text-xs text-muted-foreground">{brief.assessment_type} · {brief.status} · Due {formatPakistanAcademicDate(brief.due_at)}</span>
              </button>)}</div>
              {!briefs.length && <p className="mt-3 text-muted-foreground">No teaching briefs drafted for your assigned modules yet.</p>}
            </section>
            <section className="min-w-0 rounded-xl border bg-card px-[min(1rem,16px)] py-5 sm:p-5">
              {!chosen ? <p className="text-muted-foreground">Select an assessment to see its frozen rubric or add criteria while in draft.</p> : <>
                <h2 className="font-bold">{chosen.title}</h2>
                <p className="mt-2 text-muted-foreground">{modules.find(module => module.id === chosen.module_id)?.title} · {chosen.status} · {chosen.max_attempts} attempts · {chosen.penalty_points_per_resubmission} penalty points per approved resubmission · policy {chosen.policy_reference}</p>
                <p className="mt-2 text-muted-foreground">Due {formatPakistanAcademicDate(chosen.due_at)} · Final cutoff {formatPakistanAcademicDate(chosen.submission_cutoff)}</p>
                <h3 className="mt-4 font-semibold">Marking criteria ({ownCriteria.reduce((total, criterion) => total + criterion.max_points, 0)}/100 points)</h3>
                <div className="mt-2 space-y-2">{ownCriteria.map(criterion => <div key={criterion.id} className="min-w-0 rounded-lg border p-3"><p className="font-semibold">{criterion.criterion_code}: {criterion.max_points} points</p><p className="mt-1">{criterion.learning_outcome}</p><p className="mt-1 text-muted-foreground">{criterion.criterion_description}</p></div>)}</div>
                {chosen.status === 'draft' ? <fieldset disabled={locked} className="mt-4 min-w-0 space-y-3">
                  <legend className="font-semibold">Add a criterion to {chosen.title}</legend>
                  <p className="text-muted-foreground">These draft fields stay with this assessment when you select another brief in this workspace.</p>
                  <label className="block">Criterion code<Input className={fieldClass} value={criterionForm.code} maxLength={35} placeholder="LO1.P1" onChange={event => changeCriterion('code', event.target.value)}/></label>
                  <label className="block">Criterion learning outcome<Input className={fieldClass} value={criterionForm.outcome} maxLength={1200} placeholder="Aligned official learning outcome" onChange={event => changeCriterion('outcome', event.target.value)}/></label>
                  <label className="block">Criterion evidence standard<Textarea className={fieldClass} value={criterionForm.description} maxLength={3000} placeholder="What demonstrates this criterion?" onChange={event => changeCriterion('description', event.target.value)}/></label>
                  <label className="block">Criterion marking guidance<Textarea className={fieldClass} value={criterionForm.guidance} maxLength={3000} placeholder="Exactly what deserves full, partial or zero marks?" onChange={event => changeCriterion('guidance', event.target.value)}/></label>
                  <label className="block">Maximum points<Input className={fieldClass} type="number" min={0} max={100} step="any" value={criterionForm.points} onChange={event => changeCriterion('points', event.target.value)}/></label>
                  <Button className={buttonClass} variant="outline" onClick={() => void prepareCriterion()}>Review criterion</Button>
                  <p className="text-xs text-muted-foreground">Two or more criteria totalling 100 points are required for programme-leader approval. No student scores are entered by the lecturer.</p>
                </fieldset> : <p className="mt-3 rounded-lg bg-secondary p-3">This published or archived rubric cannot be edited here. Changes require a new approved assessment version.</p>}
              </>}
            </section>
          </div>
        </>}
      </>}
    </div>
    <Dialog open={active && reviewOpen && reviewed !== null} onOpenChange={open => {if (!open) closeReview();}}>
      <DialogContent className="min-w-0 max-h-[calc(100dvh-2rem)] w-[calc(100vw_-_min(2rem,32px))] max-w-xl overflow-y-auto rounded-lg px-[min(1rem,16px)] py-4 text-sm [overflow-wrap:anywhere] sm:p-6 [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11 [&>button:last-child]:right-1 [&>button:last-child]:top-1"
        onOpenAutoFocus={event => {event.preventDefault(); opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; reviewHeading.current?.focus();}}
        onCloseAutoFocus={event => {event.preventDefault(); const target = recoveryButton.current || (opener.current?.isConnected && !opener.current.matches(':disabled') ? opener.current : workspaceHeading.current); target?.focus();}}
        onEscapeKeyDown={event => {if (operation.current) event.preventDefault();}} onInteractOutside={event => {if (operation.current) event.preventDefault();}}>
        <DialogHeader className="min-w-0 text-left"><DialogTitle ref={reviewHeading} tabIndex={-1} className="min-w-0 pr-12 leading-snug focus:outline-none">{reviewed?.kind === 'criterion' ? 'Review criterion' : 'Review brief'}</DialogTitle><DialogDescription>Confirm the named module and unpublished assessment details. This saves teaching standards; it does not publish an assessment or enter student grades.</DialogDescription></DialogHeader>
        {reviewed && <section aria-label="Reviewed assessment details" className="min-w-0 space-y-4">
          <dl className="min-w-0 space-y-3 rounded-lg border p-3">
            <div><dt className="text-muted-foreground">Teaching module</dt><dd className="font-semibold">{reviewed.moduleTitle}</dd></div>
            <div><dt className="text-muted-foreground">Assessment title</dt><dd className="font-semibold">{reviewed.kind === 'brief' ? reviewed.payload.title : reviewed.brief.title}</dd></div>
            {reviewed.kind === 'brief' ? <>
              <div><dt className="text-muted-foreground">Assessment type</dt><dd>{reviewed.payload.assessment_type}</dd></div>
              <div><dt className="text-muted-foreground">First submission due</dt><dd>{formatPakistanAcademicDate(reviewed.payload.due_at)}</dd></div>
              <div><dt className="text-muted-foreground">Final submission cutoff</dt><dd>{formatPakistanAcademicDate(reviewed.payload.submission_cutoff)}</dd></div>
              <div><dt className="text-muted-foreground">Approved resubmission policy</dt><dd>{reviewed.payload.max_attempts} allowed attempts · {reviewed.payload.penalty_points_per_resubmission} penalty points per resubmission · {reviewed.payload.policy_reference}</dd></div>
            </> : <><div><dt className="text-muted-foreground">Assessment reference</dt><dd className="break-all">{reviewed.brief.id}</dd></div><div><dt className="text-muted-foreground">Criterion code</dt><dd>{reviewed.payload.criterion_code}</dd></div><div><dt className="text-muted-foreground">Maximum points</dt><dd>{reviewed.payload.max_points}</dd></div></>}
            <div><dt className="text-muted-foreground">Centre reference</dt><dd className="break-all">{reviewed.payload.tenant_id}</dd></div>
            <div><dt className="text-muted-foreground">Record reference</dt><dd className="break-all">{reviewed.payload.id}</dd></div>
          </dl>
          {(reviewed.kind === 'brief' ? [
            ['Lessons taught and progress', reviewed.payload.teaching_summary], ['Learning outcomes', reviewed.payload.learning_outcomes],
            ['Student expectations', reviewed.payload.student_expectations], ['Required evidence and deliverables', reviewed.payload.required_evidence],
          ] : [['Criterion learning outcome', reviewed.payload.learning_outcome], ['Criterion evidence standard', reviewed.payload.criterion_description], ['Criterion marking guidance', reviewed.payload.scoring_guidance]]).map(([label, value]) => <details key={label} className="min-w-0 rounded-lg border p-3"><summary className="cursor-pointer font-semibold">{label}</summary><p className="mt-2 whitespace-pre-wrap">{value}</p></details>)}
          {reviewed.uncertain && <p className="text-muted-foreground">The save is not yet confirmed. These exact details and the same reference are kept for checking or retrying while you stay in this account, centre, role and module workspace.</p>}
          {issue && <p role="alert" className="rounded-lg border border-destructive p-3">{issue}</p>}
          {pending && <p role="status">{pending === 'check' ? 'Checking the saved record…' : 'Verifying and saving the reviewed details…'}</p>}
          <div className="flex flex-wrap gap-2">
            {reviewed.uncertain ? <>
              <Button className={buttonClass} variant="outline" disabled={pending !== null} onClick={() => void saveOrCheck(true)}>Check saved record</Button>
              <Button className={buttonClass} disabled={pending !== null || reviewed.conflict} onClick={() => void saveOrCheck()}>{reviewed.kind === 'brief' ? 'Retry same assessment brief' : 'Retry same criterion'}</Button>
              <Button className={buttonClass} variant="ghost" disabled={pending !== null} onClick={closeReview}>Close and keep save check</Button>
            </> : <>
              <Button className={buttonClass} disabled={pending !== null} onClick={() => void saveOrCheck()}>{reviewed.kind === 'brief' ? 'Save reviewed assessment brief' : 'Save reviewed criterion'}</Button>
              <Button className={buttonClass} variant="outline" disabled={pending !== null} onClick={closeReview}>Back to details</Button>
            </>}
          </div>
        </section>}
      </DialogContent>
    </Dialog>
  </DashboardLayout>;
}
