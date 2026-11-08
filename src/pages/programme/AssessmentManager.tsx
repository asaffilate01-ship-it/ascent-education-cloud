import {useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {ManagerAllocationDetails, ManagerPublicationDetails} from '@/components/assessment/ManagerReviewDetails';
import {canUseActiveRole} from '@/lib/roleMembership';
import {matchesLocalSearch} from '@/lib/localSearch';
import {
  loadManagerAllocations, loadManagerAllocationTarget, loadManagerBriefs, loadManagerDirectory, loadManagerPublication,
  managerAssessmentTime, publicationBlockers, sameAllocationTarget, samePublicationContent, validIndependentAllocation,
  type ManagerAllocationReview, type ManagerAllocationTarget, type ManagerBriefStatus, type ManagerBriefSummary,
  type ManagerPublicationReview, type ManagerStaffRole,
} from '@/lib/assessment/managerWorkspace';
import {ShieldCheck} from 'lucide-react';

type Phase = 'loading' | 'ready' | 'changed' | 'uncertain' | 'done' | 'error';
type Review = {id: string; title: string; phase: Phase; message: string} & (
  {kind: 'publication'; snapshot: ManagerPublicationReview | null}
  | {kind: 'allocation'; marker: string; reviewer: string; snapshot: ManagerAllocationReview | null}
);
type LoadState<T> = {rows: T[] | null; loading: boolean; error: string};
const emptyLoad = {rows: null, loading: true, error: ''};
const PAGE_SIZE = 25;
const statusLabels: Record<ManagerBriefStatus, string> = {draft: 'Draft', published: 'Published', archived: 'Archived', all: 'All'};
const selectClass = 'mt-1 min-h-11 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-[min(0.75rem,12px)] py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const errorText = (error: unknown) => error instanceof Error ? error.message : 'The records could not be verified. Please try again.';

export default function AssessmentManager() {
  const {user, loading} = useAuth();
  const permitted = !loading && !!user?.id && !!user.tenantId && canUseActiveRole(user, ['programme_leader', 'centre_director', 'superadmin']);
  const scope = permitted ? JSON.stringify([user.id, user.tenantId, user.role, [...user.roles].sort()]) : null;
  // Invalidate old callbacks at render time, including an A → B → A role/account change.
  const liveScope = useRef<string | null>(scope);
  liveScope.current = scope;
  return <DashboardLayout title="Assessment Review and Allocation" subtitle="Review lecturer briefs and allocate independent assessment">
    {loading ? <p role="status" className="text-base">Verifying your assessment management access…</p>
      : !scope ? <p role="alert" className="rounded-lg border border-destructive p-4 text-base">A verified active Programme Leader, Centre Director or Superadmin role and a current centre are required.</p>
        : <ManagerWorkspace key={scope} scope={scope} liveScope={liveScope} tenant={user.tenantId!}/>}
  </DashboardLayout>;
}

function ManagerWorkspace({scope, liveScope, tenant}: {scope: string; liveScope: MutableRefObject<string | null>; tenant: string}) {
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const currentScope = useCallback(() => mounted.current && liveScope.current === scope, [liveScope, scope]);
  const [briefStatus, setBriefStatus] = useState<ManagerBriefStatus>('draft');
  const [briefs, setBriefs] = useState<LoadState<ManagerBriefSummary> & {status: ManagerBriefStatus}>({...emptyLoad, status: 'draft'});
  const [allocations, setAllocations] = useState<LoadState<ManagerAllocationTarget>>(emptyLoad);
  const [directory, setDirectory] = useState<LoadState<ManagerStaffRole>>(emptyLoad);
  const [briefReload, setBriefReload] = useState(0), [allocationReload, setAllocationReload] = useState(0), [directoryReload, setDirectoryReload] = useState(0);
  const [briefSearch, setBriefSearch] = useState(''), [submissionSearch, setSubmissionSearch] = useState('');
  const [briefPage, setBriefPage] = useState(1), [submissionPage, setSubmissionPage] = useState(1);
  const [choices, setChoices] = useState<Record<string, {marker: string; reviewer: string}>>({});
  const [review, setReview] = useState<Review | null>(null), [reviewOpen, setReviewOpen] = useState(false);
  const [pending, setPending] = useState<'checking' | 'publishing' | 'allocating' | null>(null);
  const operation = useRef<object | null>(null), reviewGeneration = useRef(0);
  const origin = useRef<HTMLElement | null>(null), queueHeading = useRef<HTMLHeadingElement | null>(null), dialogContent = useRef<HTMLDivElement | null>(null);
  const dialogHeading = useRef<HTMLHeadingElement | null>(null), retainedReviewAction = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let active = true;
    const current = () => active && currentScope();
    setBriefs({...emptyLoad, status: briefStatus});
    void loadManagerBriefs(tenant, briefStatus, current).then(rows => {
      if (current()) setBriefs({rows, loading: false, error: '', status: briefStatus});
    }).catch(error => {if (current()) setBriefs({rows: null, loading: false, error: errorText(error), status: briefStatus});});
    return () => {active = false;};
  }, [briefStatus, briefReload, currentScope, tenant]);

  useEffect(() => {
    let active = true;
    const current = () => active && currentScope();
    setAllocations(emptyLoad);
    void loadManagerAllocations(tenant, current).then(rows => {
      if (current()) setAllocations({rows, loading: false, error: ''});
    }).catch(error => {if (current()) setAllocations({rows: null, loading: false, error: errorText(error)});});
    return () => {active = false;};
  }, [allocationReload, currentScope, tenant]);

  useEffect(() => {
    let active = true;
    const current = () => active && currentScope();
    setDirectory(emptyLoad);
    void loadManagerDirectory(tenant, current).then(rows => {
      if (current()) setDirectory({rows, loading: false, error: ''});
    }).catch(() => {if (current()) setDirectory({rows: null, loading: false, error: 'The assessor and IQA directory could not be verified. Retry the lookup before reviewing an allocation.'});});
    return () => {active = false;};
  }, [directoryReload, currentScope, tenant]);

  useEffect(() => {
    if (reviewOpen && dialogContent.current) {dialogContent.current.scrollTop = 0; dialogHeading.current?.focus({preventScroll: true});}
  }, [reviewOpen, review?.snapshot]);

  const staff = directory.rows || [];
  const assessors = useMemo(() => [...new Set((directory.rows || []).filter(row => row.role === 'assessor').map(row => row.user_id))].sort(), [directory.rows]);
  const reviewers = useMemo(() => [...new Set((directory.rows || []).filter(row => row.role === 'iqa_officer').map(row => row.user_id))].sort(), [directory.rows]);
  const currentBriefs = briefs.status === briefStatus ? briefs : {...emptyLoad, status: briefStatus};
  const filteredBriefs = (currentBriefs.rows || []).filter(brief => matchesLocalSearch([brief.title, brief.id, brief.module_id, brief.lecturer_id, brief.assessment_type].join(' '), briefSearch));
  const filteredSubmissions = (allocations.rows || []).filter(({attempt, brief}) => matchesLocalSearch([brief.title, brief.id, brief.module_id, attempt.id, attempt.student_id, attempt.attempt_no].join(' '), submissionSearch));
  const briefPages = Math.max(1, Math.ceil(filteredBriefs.length / PAGE_SIZE)), submissionPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));
  const shownBriefPage = Math.min(briefPage, briefPages), shownSubmissionPage = Math.min(submissionPage, submissionPages);
  const blocked = !!pending || review?.phase === 'uncertain';

  const openReview = async (selection: Review, opener?: HTMLElement) => {
    if (operation.current || review?.phase === 'uncertain' || !currentScope()) return;
    if (opener) origin.current = opener;
    const generation = ++reviewGeneration.current;
    const current = () => currentScope() && generation === reviewGeneration.current;
    setReview({...selection, phase: 'loading', message: '', snapshot: null}); setReviewOpen(true);
    try {
      if (selection.kind === 'publication') {
        const snapshot = await loadManagerPublication(tenant, selection.id, current);
        if (current()) setReview({...selection, title: snapshot.brief.title, snapshot, phase: 'ready', message: ''});
      } else {
        const target = await loadManagerAllocationTarget(tenant, selection.id, current);
        const snapshot = {...target, marker: selection.marker, reviewer: selection.reviewer};
        if (current()) setReview({...selection, title: target.brief.title, snapshot, phase: target.allocation || target.attempt.status !== 'submitted' ? 'changed' : 'ready', message: target.allocation ? 'This submission already has an allocation. Reload the queue to see its current state.' : target.attempt.status !== 'submitted' ? 'This attempt is no longer awaiting allocation.' : ''});
      }
    } catch (error) {if (current()) setReview({...selection, snapshot: null, phase: 'error', message: errorText(error)});}
  };

  const closeReview = (open: boolean) => {
    setReviewOpen(open);
    if (!open && !operation.current && review?.phase !== 'uncertain' && review?.phase !== 'done') {
      reviewGeneration.current++; setReview(null);
    }
  };

  const performReviewAction = async (checkOnly = false) => {
    if (!review?.snapshot || operation.current || !currentScope()) return;
    if (checkOnly ? review.phase !== 'uncertain' : review.phase !== 'ready') return;
    if (!checkOnly && review.kind === 'publication' && publicationBlockers(review.snapshot).length) return;
    const captured = review, token = {}, generation = reviewGeneration.current;
    operation.current = token; setPending('checking');
    const current = () => currentScope() && generation === reviewGeneration.current && operation.current === token;
    let requested = false;
    try {
      if (captured.kind === 'publication') {
        const fresh = await loadManagerPublication(tenant, captured.id, current);
        if (!current()) return;
        if (fresh.brief.status === 'published') {
          setReview({...captured, phase: 'done', message: samePublicationContent(captured.snapshot!, fresh)
            ? 'Publication verified. This assessment is published; no further publication request is needed.'
            : 'This assessment is published, but its current content differs from this review snapshot. Close this review and open the published brief to inspect it.'});
          setBriefReload(value => value + 1); return;
        }
        if (fresh.brief.status !== 'draft' || !samePublicationContent(captured.snapshot!, fresh)) {
          setReview({...captured, phase: 'changed', message: 'The assessment or rubric changed since this review. Reload the current review and read it before publishing.'}); return;
        }
        if (checkOnly) {
          setReview({...captured, phase: 'ready', message: 'This assessment is still a draft with the same reviewed content. You may confirm publication again.'}); return;
        }
        const blockers = publicationBlockers(fresh);
        if (blockers.length) {setReview({...captured, message: blockers.join(' ')}); return;}
        setPending('publishing'); requested = true;
        const reply = await db.rpc('publish_unipathway_assessment_brief', {p_brief: captured.id});
        if (!current()) return;
        // This authorised RPC intentionally RETURNS void: null data + no error is success.
        if (!reply || reply.error !== null) {
          setReview({...captured, phase: 'uncertain', message: `Publication was not confirmed.${reply?.error?.message ? ' ' + reply.error.message : ''} Check publication status before trying again.`}); return;
        }
        setReview({...captured, phase: 'done', message: 'Assessment published. Enrolled students can now access the brief and its frozen rubric and policy.'});
        setBriefReload(value => value + 1);
      } else {
        const target = await loadManagerAllocationTarget(tenant, captured.id, current);
        if (!current()) return;
        if (target.allocation) {
          const matches = target.allocation.marker_id === captured.marker && target.allocation.qa_reviewer_id === captured.reviewer;
          setReview({...captured, phase: matches ? 'done' : 'changed', message: matches
            ? 'Allocation verified. The reviewed assessor and IQA are assigned; no further request is needed.'
            : `This submission is already allocated to different staff. Assessor: ${target.allocation.marker_id}. IQA: ${target.allocation.qa_reviewer_id}. No allocation was replaced.`});
          setAllocationReload(value => value + 1); return;
        }
        if (!sameAllocationTarget(captured.snapshot!, target) || target.attempt.status !== 'submitted') {
          setReview({...captured, phase: 'changed', message: 'The submission or assessment changed since this review. Reload the current review before allocating.'}); return;
        }
        if (checkOnly) {
          setReview({...captured, phase: 'ready', message: 'No allocation is currently recorded for this submission. You may confirm the same reviewed staff again.'}); return;
        }
        const roles = await loadManagerDirectory(tenant, current, [captured.marker, captured.reviewer]);
        if (!current()) return;
        if (!validIndependentAllocation({...target, marker: captured.marker, reviewer: captured.reviewer}, roles)) {
          setReview({...captured, phase: 'changed', message: 'The reviewed independent staff roles could not be verified. Close this review, refresh the staff directory and choose eligible staff.'}); return;
        }
        setPending('allocating'); requested = true;
        const reply = await db.rpc('allocate_unipathway_independent_marker', {p_attempt: captured.id, p_marker: captured.marker, p_quality_reviewer: captured.reviewer});
        if (!current()) return;
        // Allocation also intentionally RETURNS void; never demand a fabricated row receipt.
        if (!reply || reply.error !== null) {
          setReview({...captured, phase: 'uncertain', message: `Allocation was not confirmed.${reply?.error?.message ? ' ' + reply.error.message : ''} Check allocation status before trying again.`}); return;
        }
        setReview({...captured, phase: 'done', message: 'Independent assessor and IQA allocated to this submission. Marking and result release remain separate.'});
        setAllocationReload(value => value + 1);
      }
    } catch (error) {
      if (current()) setReview({...captured, phase: requested || checkOnly ? 'uncertain' : 'ready', message: requested
        ? `The ${captured.kind === 'publication' ? 'publication' : 'allocation'} response was interrupted. Check its status before trying again. ${errorText(error)}`
        : `The current records could not be verified. ${errorText(error)}`});
    } finally {
      if (operation.current === token) {operation.current = null; if (currentScope()) setPending(null);}
    }
  };

  const blockers = review?.kind === 'publication' && review.snapshot && review.phase === 'ready' ? publicationBlockers(review.snapshot) : [];
  return <div className="min-w-0 space-y-6 text-base">
    <section className="min-w-0 rounded-xl border bg-primary/5 p-[min(1rem,12px)] sm:p-4" aria-label="Assessment responsibilities">
      <h2 className="flex items-start gap-2 font-semibold"><ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true"/>Review the brief, then assign independent staff</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Lecturers author the teaching brief and rubric. Programme leadership approves publication. A separate assessor marks each submission and a different IQA reviews it. Omniqora analysis remains advisory; students receive no provisional mark.</p>
    </section>

    {review && !reviewOpen && (pending || review.phase === 'uncertain' || review.phase === 'done') && <section className="min-w-0 space-y-3 rounded-xl border bg-card p-[min(1rem,12px)] sm:p-4" aria-label="Retained assessment review">
      <p className="font-semibold [overflow-wrap:anywhere]">{review.title}</p>
      <p className="text-sm" role="status">{pending ? 'The reviewed request is still in progress.' : review.phase === 'uncertain' ? 'The outcome still needs a status check. The reviewed details are kept in this workspace.' : review.message}</p>
      <Button ref={retainedReviewAction} variant="outline" onClick={() => setReviewOpen(true)}>{review.phase === 'done' ? 'View confirmed update' : 'Resume assessment review'}</Button>
    </section>}

    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-[min(1.25rem,12px)] sm:p-5" aria-labelledby="manager-briefs-heading">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72"><h2 id="manager-briefs-heading" ref={queueHeading} tabIndex={-1} className="text-lg font-semibold">Review assessment briefs</h2><p className="mt-1 text-sm text-muted-foreground">Read the complete teaching context, evidence requirements and marking policy before publication.</p></div>
        <Button variant="outline" disabled={currentBriefs.loading || !!pending} onClick={() => setBriefReload(value => value + 1)}>Refresh briefs</Button>
      </div>
      <div className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
        <label className="min-w-0 text-sm font-medium">Brief status<select className={selectClass} value={briefStatus} onChange={event => {setBriefStatus(event.target.value as ManagerBriefStatus); setBriefPage(1);}}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="min-w-0 text-sm font-medium">Find a brief<Input className="mt-1 min-w-0" type="search" placeholder="Title, module or assessment reference" value={briefSearch} onChange={event => {setBriefSearch(event.target.value); setBriefPage(1);}}/></label>
      </div>
      {currentBriefs.loading ? <p role="status">Loading all {briefStatus === 'all' ? '' : briefStatus + ' '}briefs visible in this centre…</p>
        : currentBriefs.error ? <div role="alert" className="space-y-3 rounded-lg border border-destructive p-3"><p>Assessment briefs could not be verified. {currentBriefs.error}</p><Button variant="outline" onClick={() => setBriefReload(value => value + 1)}>Retry briefs</Button></div>
          : <>
            <p className="text-sm text-muted-foreground" role="status">{filteredBriefs.length} matching briefs · {currentBriefs.rows!.length} in the selected status</p>
            {!currentBriefs.rows!.length ? <p className="text-sm">No {briefStatus === 'all' ? '' : briefStatus + ' '}briefs are visible in this centre.</p>
              : !filteredBriefs.length ? <p className="text-sm">No briefs match this search. Clear the search or choose another status.</p>
                : <div className="space-y-3">{filteredBriefs.slice((shownBriefPage - 1) * PAGE_SIZE, shownBriefPage * PAGE_SIZE).map(brief => <article key={brief.id} className="min-w-0 space-y-3 rounded-lg border p-[min(1rem,12px)] sm:p-4" aria-label={`Brief: ${brief.title} (${brief.id})`}>
                  <div className="min-w-0"><h3 className="font-semibold [overflow-wrap:anywhere]">{brief.title}</h3><p className="mt-1 text-sm capitalize">{brief.status} · {brief.assessment_type}</p></div>
                  <dl className="min-w-0 space-y-2 text-sm"><div><dt className="text-muted-foreground">Assessment reference</dt><dd className="break-all">{brief.id}</dd></div><div><dt className="text-muted-foreground">Module reference</dt><dd className="break-all">{brief.module_id}</dd></div><div><dt className="text-muted-foreground">Deadline · Pakistan time</dt><dd>{managerAssessmentTime(brief.due_at)}</dd></div></dl>
                  <Button variant="outline" disabled={blocked} aria-label={`Review brief: ${brief.title} (${brief.id})`} onClick={event => void openReview({kind: 'publication', id: brief.id, title: brief.title, phase: 'loading', message: '', snapshot: null}, event.currentTarget)}>Review brief</Button>
                </article>)}</div>}
            {filteredBriefs.length > PAGE_SIZE && <nav aria-label="Brief pages" className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={shownBriefPage <= 1} onClick={() => setBriefPage(shownBriefPage - 1)}>Previous briefs</Button><p className="text-sm">Page {shownBriefPage} of {briefPages}</p><Button variant="outline" disabled={shownBriefPage >= briefPages} onClick={() => setBriefPage(shownBriefPage + 1)}>Next briefs</Button></nav>}
          </>}
    </section>

    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-[min(1.25rem,12px)] sm:p-5" aria-labelledby="manager-allocation-heading">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1 basis-72"><h2 id="manager-allocation-heading" className="text-lg font-semibold">Allocate independent assessment</h2><p className="mt-1 text-sm text-muted-foreground">Submitted attempts without an allocation, oldest first. This queue is independent of the brief status filter.</p></div><Button variant="outline" disabled={allocations.loading || !!pending} onClick={() => setAllocationReload(value => value + 1)}>Refresh allocation queue</Button></div>
      <section className="min-w-0 space-y-3 rounded-lg border bg-muted/20 p-[min(1rem,12px)] sm:p-4" aria-label="Visible assessor and IQA directory">
        <h3 className="font-medium">Visible assessor and IQA directory</h3>
        {directory.loading ? <p role="status" className="text-sm">Verifying staff roles visible to your account…</p> : directory.error ? <p role="alert" className="text-sm">{directory.error}</p>
          : !assessors.length || !reviewers.length ? <p className="text-sm">No eligible {assessors.length ? 'IQA reviewers are' : reviewers.length ? 'assessors are' : 'assessor and IQA choices are'} visible to your account. Your role may have limited staff-directory access. Ask your centre director to verify eligible staff or complete the allocation.</p>
            : <p className="text-sm text-muted-foreground">{assessors.length} assessor accounts and {reviewers.length} IQA accounts are visible. Choices exclude the submitting student and teaching lecturer; the IQA must differ from the assessor.</p>}
        <Button variant="outline" disabled={directory.loading || !!pending} onClick={() => setDirectoryReload(value => value + 1)}>{directory.error ? 'Retry staff lookup' : 'Refresh staff directory'}</Button>
      </section>
      <label className="block min-w-0 text-sm font-medium">Find a submission<Input className="mt-1 min-w-0" type="search" placeholder="Assessment, student or submission reference" value={submissionSearch} onChange={event => {setSubmissionSearch(event.target.value); setSubmissionPage(1);}}/></label>
      {allocations.loading ? <p role="status">Checking all submitted attempts and their allocations…</p>
        : allocations.error ? <div role="alert" className="space-y-3 rounded-lg border border-destructive p-3"><p>The allocation queue could not be verified. {allocations.error}</p><Button variant="outline" onClick={() => setAllocationReload(value => value + 1)}>Retry allocation queue</Button></div>
          : <>
            <p role="status" className="text-sm text-muted-foreground">{filteredSubmissions.length} matching submissions · {allocations.rows!.length} awaiting independent allocation</p>
            {!allocations.rows!.length ? <p className="text-sm">No submitted attempts are awaiting allocation in the verified queue.</p> : !filteredSubmissions.length ? <p className="text-sm">No submissions match this search. Clear the search to see the allocation queue.</p> : <div className="space-y-3">{filteredSubmissions.slice((shownSubmissionPage - 1) * PAGE_SIZE, shownSubmissionPage * PAGE_SIZE).map(target => {
              const {attempt, brief} = target, choice = choices[attempt.id] || {marker: '', reviewer: ''};
              const eligibleMarkers = assessors.filter(id => id !== brief.lecturer_id && id !== attempt.student_id);
              const eligibleReviewers = reviewers.filter(id => id !== brief.lecturer_id && id !== attempt.student_id && id !== choice.marker);
              const canReview = !directory.loading && !directory.error && validIndependentAllocation({...target, ...choice}, staff);
              return <article key={attempt.id} className="min-w-0 space-y-3 rounded-lg border p-[min(1rem,12px)] sm:p-4" aria-label={`Submission: ${brief.title}, attempt ${attempt.attempt_no} (${attempt.id})`}>
                <h3 className="font-semibold [overflow-wrap:anywhere]">{brief.title} · attempt {attempt.attempt_no}</h3>
                <dl className="min-w-0 space-y-2 text-sm"><div><dt className="text-muted-foreground">Submission reference</dt><dd className="break-all">{attempt.id}</dd></div><div><dt className="text-muted-foreground">Student reference</dt><dd className="break-all">{attempt.student_id}</dd></div><div><dt className="text-muted-foreground">Submitted · Pakistan time</dt><dd>{managerAssessmentTime(attempt.submitted_at)}</dd></div></dl>
                <div className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
                  <label className="min-w-0 text-sm font-medium">Independent assessor<select aria-label={`Independent assessor for submission ${attempt.id}`} className={selectClass} disabled={directory.loading || !!directory.error || blocked} value={eligibleMarkers.includes(choice.marker) ? choice.marker : ''} onChange={event => {const marker = event.target.value; setChoices(previous => ({...previous, [attempt.id]: {marker, reviewer: choice.reviewer === marker ? '' : choice.reviewer}}));}}><option value="">Select approved assessor</option>{eligibleMarkers.map(id => <option key={id} value={id}>Assessor · {id}</option>)}</select>{choice.marker && <span className="mt-2 block font-normal">{eligibleMarkers.includes(choice.marker) ? 'Selected assessor' : 'Previous assessor, eligibility needs verification'}: <span className="break-all">{choice.marker}</span></span>}</label>
                  <label className="min-w-0 text-sm font-medium">IQA reviewer<select aria-label={`IQA reviewer for submission ${attempt.id}`} className={selectClass} disabled={directory.loading || !!directory.error || blocked} value={eligibleReviewers.includes(choice.reviewer) ? choice.reviewer : ''} onChange={event => {const reviewer = event.target.value; setChoices(previous => ({...previous, [attempt.id]: {...choice, reviewer}}));}}><option value="">Select approved IQA reviewer</option>{eligibleReviewers.map(id => <option key={id} value={id}>IQA · {id}</option>)}</select>{choice.reviewer && <span className="mt-2 block font-normal">{eligibleReviewers.includes(choice.reviewer) ? 'Selected IQA' : 'Previous IQA, eligibility needs verification'}: <span className="break-all">{choice.reviewer}</span></span>}</label>
                </div>
                {!directory.loading && !directory.error && (!eligibleMarkers.length || !eligibleReviewers.length) && <p className="text-sm text-muted-foreground">An independent assessor and a different IQA are not both visible for this submission. Ask your centre director to verify the allocation.</p>}
                <Button disabled={blocked || !canReview} aria-label={`Review allocation: ${brief.title}, attempt ${attempt.attempt_no} (${attempt.id})`} onClick={event => void openReview({kind: 'allocation', id: attempt.id, title: brief.title, ...choice, phase: 'loading', message: '', snapshot: null}, event.currentTarget)}>Review allocation</Button>
              </article>;
            })}</div>}
            {filteredSubmissions.length > PAGE_SIZE && <nav aria-label="Submission pages" className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={shownSubmissionPage <= 1} onClick={() => setSubmissionPage(shownSubmissionPage - 1)}>Previous submissions</Button><p className="text-sm">Page {shownSubmissionPage} of {submissionPages}</p><Button variant="outline" disabled={shownSubmissionPage >= submissionPages} onClick={() => setSubmissionPage(shownSubmissionPage + 1)}>Next submissions</Button></nav>}
          </>}
    </section>

    <Dialog open={reviewOpen && !!review} onOpenChange={closeReview}>
      <DialogContent ref={dialogContent} className="max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-3xl grid-cols-[minmax(0,1fr)] overflow-y-auto px-[min(1.5rem,16px)] py-5 text-base [overflow-wrap:anywhere] sm:px-6 [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:flex [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center" onOpenAutoFocus={event => {event.preventDefault(); dialogHeading.current?.focus({preventScroll: true});}} onCloseAutoFocus={event => {event.preventDefault(); if (retainedReviewAction.current) retainedReviewAction.current.focus(); else if (origin.current?.isConnected && !(origin.current instanceof HTMLButtonElement && origin.current.disabled)) origin.current.focus(); else queueHeading.current?.focus();}}>
        <DialogHeader className="min-w-0 pr-[max(2rem,44px)] text-left"><DialogTitle ref={dialogHeading} tabIndex={-1} className="leading-snug">{review?.kind === 'allocation' ? 'Review allocation' : 'Review assessment'}: {review?.title}</DialogTitle><DialogDescription>{review?.kind === 'allocation' ? 'Confirm the exact submission and independent staff accounts.' : 'Review the teaching context, full rubric and published submission policy.'}</DialogDescription></DialogHeader>
        {review?.phase === 'loading' && <p role="status">Loading the selected assessment and its current records…</p>}
        {review?.snapshot && (review.kind === 'publication' ? <ManagerPublicationDetails review={review.snapshot}/> : <ManagerAllocationDetails review={review.snapshot}/>)}
        {review?.message && <p className={`min-w-0 rounded-lg border p-[min(1rem,12px)] text-sm ${review.phase === 'done' ? 'border-success' : 'border-warning'}`} role={review.phase === 'done' ? 'status' : 'alert'}>{review.message}</p>}
        {!!blockers.length && <section aria-label="Publication requirements" className="min-w-0 rounded-lg border border-warning p-[min(1rem,12px)] text-sm"><h3 className="font-semibold">Publication requirements</h3><ul className="mt-2 list-disc space-y-2 pl-5">{blockers.map(message => <li key={message}>{message}</li>)}</ul></section>}
        {pending && <p role="status">{pending === 'publishing' ? 'Publishing the reviewed assessment…' : pending === 'allocating' ? 'Allocating the reviewed independent staff…' : 'Checking the current assessment records…'}</p>}
        {review?.snapshot && review.phase !== 'done' && <p className="text-sm text-muted-foreground">{review.kind === 'publication' ? 'Publication freezes the rubric and resubmission policy. Current records are checked again before the request.' : 'The reviewed staff and submission stay fixed during this request.'} {review.phase === 'uncertain' && 'Closing keeps this review for recovery. Changing your account, centre or active role ends this local review session.'}</p>}
        <div className="grid min-w-0 gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
          {review?.phase === 'ready' && review.snapshot && (review.kind === 'publication'
            ? <Button disabled={!!pending || !!blockers.length} onClick={() => void performReviewAction()}>Publish reviewed assessment</Button>
            : <Button disabled={!!pending} onClick={() => void performReviewAction()}>Confirm reviewed allocation</Button>)}
          {review?.phase === 'uncertain' && <Button disabled={!!pending} onClick={() => void performReviewAction(true)}>{review.kind === 'publication' ? 'Check publication status' : 'Check allocation status'}</Button>}
          {review && (review.phase === 'error' || review.phase === 'changed') && <Button variant="outline" disabled={!!pending} onClick={() => void openReview(review)}>{review.phase === 'error' ? 'Retry assessment review' : 'Reload current review'}</Button>}
          <Button variant="outline" onClick={() => closeReview(false)}>{pending || review?.phase === 'uncertain' ? 'Close and keep review' : 'Close review'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
