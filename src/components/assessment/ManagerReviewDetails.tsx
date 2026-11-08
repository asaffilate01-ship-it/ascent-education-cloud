import type {ReactNode} from 'react';
import {managerAssessmentTime, managerRubricTotal, type ManagerAllocationReview, type ManagerPublicationReview} from '@/lib/assessment/managerWorkspace';

function Reference({label, children}: {label: string; children: ReactNode}) {
  return <div className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 break-all text-sm">{children}</dd></div>;
}

function WrittenSection({title, text}: {title: string; text: string}) {
  return <section className="min-w-0 space-y-2" aria-label={title}>
    <h3 className="font-semibold">{title}</h3>
    <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{text || 'Not available'}</p>
  </section>;
}

export function ManagerPublicationDetails({review}: {review: ManagerPublicationReview}) {
  const {brief, criteria} = review;
  const total = managerRubricTotal(criteria);
  return <div className="min-w-0 space-y-6" role="region" aria-label="Reviewed assessment brief">
    <dl className="grid min-w-0 gap-3 rounded-lg border bg-muted/30 p-[min(1rem,12px)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))] sm:p-4">
      <div className="min-w-0"><dt className="text-sm text-muted-foreground">Assessment title</dt><dd className="mt-1 font-semibold [overflow-wrap:anywhere]">{brief.title}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Type · reviewed status</dt><dd className="mt-1 text-sm capitalize">{brief.assessment_type} · {brief.status}</dd></div>
      <Reference label="Assessment reference">{brief.id}</Reference>
      <Reference label="Module reference">{brief.module_id}</Reference>
      <Reference label="Teaching lecturer reference">{brief.lecturer_id}</Reference>
      <div><dt className="text-sm text-muted-foreground">Teaching date · Pakistan time</dt><dd className="mt-1 text-sm">{managerAssessmentTime(brief.teaching_date)}</dd></div>
    </dl>
    <WrittenSection title="Teaching summary" text={brief.teaching_summary}/>
    <WrittenSection title="Learning outcomes" text={brief.learning_outcomes}/>
    <WrittenSection title="Student expectations" text={brief.student_expectations}/>
    <WrittenSection title="Required evidence" text={brief.required_evidence}/>
    <section className="min-w-0 space-y-3 rounded-lg border p-[min(1rem,12px)] sm:p-4" aria-label="Submission window and policy">
      <h3 className="font-semibold">Submission window and policy</h3>
      <p className="text-sm text-muted-foreground">All dates and times below are Pakistan time (Asia/Karachi).</p>
      <dl className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
        <div><dt className="text-sm text-muted-foreground">Submission deadline</dt><dd className="mt-1 text-sm">{managerAssessmentTime(brief.due_at)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Submission cutoff</dt><dd className="mt-1 text-sm">{managerAssessmentTime(brief.submission_cutoff)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Maximum attempts</dt><dd className="mt-1 text-sm">{brief.max_attempts} total, including the first submission</dd></div>
        <div><dt className="text-sm text-muted-foreground">Resubmission penalty</dt><dd className="mt-1 text-sm">{brief.penalty_points_per_resubmission} points per resubmission</dd></div>
        <div className="min-w-0"><dt className="text-sm text-muted-foreground">Policy reference</dt><dd className="mt-1 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{brief.policy_reference || 'Not available'}</dd></div>
        <div className="min-w-0"><dt className="text-sm text-muted-foreground">Rubric version</dt><dd className="mt-1 text-sm [overflow-wrap:anywhere]">{brief.rubric_version || 'Not available'}</dd></div>
      </dl>
    </section>
    <section className="min-w-0 space-y-3" aria-label="Full marking rubric">
      <h3 className="font-semibold">Full marking rubric</h3>
      <p className="text-sm">{criteria.length} criteria · {Number.isFinite(total) ? total : 'Unverified'} / 100 points</p>
      {!criteria.length && <p className="text-sm text-muted-foreground">No rubric criteria are available for this assessment.</p>}
      {criteria.map(criterion => <article key={criterion.id} className="min-w-0 space-y-3 rounded-lg border p-[min(1rem,12px)] sm:p-4" aria-label={`Rubric criterion ${criterion.criterion_code}`}>
        <h4 className="font-semibold [overflow-wrap:anywhere]">{criterion.display_order}. {criterion.criterion_code} · {criterion.max_points} points</h4>
        <dl className="min-w-0 space-y-3 text-sm">
          <div><dt className="font-medium">Linked learning outcome</dt><dd className="mt-1 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{criterion.learning_outcome || 'Not available'}</dd></div>
          <div><dt className="font-medium">Criterion description</dt><dd className="mt-1 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{criterion.criterion_description || 'Not available'}</dd></div>
          <div><dt className="font-medium">Scoring guidance</dt><dd className="mt-1 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{criterion.scoring_guidance || 'Not available'}</dd></div>
        </dl>
      </article>)}
    </section>
  </div>;
}

export function ManagerAllocationDetails({review}: {review: ManagerAllocationReview}) {
  return <div className="min-w-0 space-y-4" role="region" aria-label="Reviewed independent allocation">
    <p className="font-semibold [overflow-wrap:anywhere]">{review.brief.title} · attempt {review.attempt.attempt_no}</p>
    <dl className="grid min-w-0 gap-4 rounded-lg border p-[min(1rem,12px)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))] sm:p-4">
      <Reference label="Submission reference">{review.attempt.id}</Reference>
      <Reference label="Student reference">{review.attempt.student_id}</Reference>
      <Reference label="Assessment reference">{review.brief.id}</Reference>
      <Reference label="Module reference">{review.brief.module_id}</Reference>
      <Reference label="Teaching lecturer reference">{review.brief.lecturer_id}</Reference>
      <div><dt className="text-sm text-muted-foreground">Submitted · Pakistan time</dt><dd className="mt-1 text-sm">{managerAssessmentTime(review.attempt.submitted_at)}</dd></div>
      <Reference label="Reviewed independent assessor">{review.marker}</Reference>
      <Reference label="Reviewed IQA reviewer">{review.reviewer}</Reference>
    </dl>
    <p className="text-sm text-muted-foreground">The assessor and IQA must be different people, and neither may be the teaching lecturer or submitting student. Allocation does not mark, approve or release a result.</p>
  </div>;
}
