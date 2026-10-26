import {useState} from 'react';
export const connectionCoverage=[
  {
    "name": "Publishing and permissions",
    "state": "Verification required",
    "detail": "Merged code and database tests do not confirm the public deployment or real-account permissions.",
    "next": "Verify the published release, every role and cross-student/centre access, including class and material assignments."
  },
  {
    "name": "Admissions",
    "state": "Live journey required",
    "detail": "The guarded admission handover creates enrolment without inventing payments. It has synthetic database coverage.",
    "next": "Complete enquiry, assessment, documents, offer, funding, enrolment, class allocation and account activation with authorised test accounts."
  },
  {
    "name": "Omniqora AI",
    "state": "Credentials and deployment required",
    "detail": "Tutor, communications and assessment advisory code use Omniqora. Successful live gateway operation is unverified; marking suggestions require human review.",
    "next": "Configure compatible endpoint, tenant binding, credentials, approved model and budget; deploy and verify each AI purpose."
  },
  {
    "name": "Teams and recordings",
    "state": "Provider activation required",
    "detail": "Account provisioning and calendar workers are implemented. Source code does not establish account activation, licences, meeting delivery or recording playback.",
    "next": "Configure Microsoft consent and licences, host workers, reconcile active accounts, test invitations/cancellations and recording retrieval; finish weekly automation."
  },
  {
    "name": "Language lab",
    "state": "Implementation required",
    "detail": "Guided language activities are not a complete live language room.",
    "next": "Complete pair/group audio, teacher monitoring and intercom, reconnects and recording for classroom and remote learners."
  },
  {
    "name": "Virtual tech labs",
    "state": "Provider integration required",
    "detail": "Browser Python and JavaScript workspaces are implemented. Managed cloud environments remain separate.",
    "next": "Choose the cloud provider and complete provisioning, saved work, expiry, shutdown, capacity and cost limits."
  },
  {
    "name": "Pakistan payments",
    "state": "Merchant connection required",
    "detail": "Funding records separate sponsor commitments from student liabilities. Live merchant checkout and settlement are unverified.",
    "next": "Select the contracted gateway; implement and test Raast/JazzCash checkout, authenticated notifications, reconciliation and refunds."
  },
  {
    "name": "Institutional email",
    "state": "Hosted email activation required",
    "detail": "Dashboard communications, tasks, audit history and an IMAP/SMTP worker are implemented. Hosted mailboxes and delivery are unverified.",
    "next": "Configure unipathway.pk mailboxes and server credentials, host workers and test threading, attachments, delivery failures and history."
  },
  {
    "name": "Assessment",
    "state": "Further implementation required",
    "detail": "Independent marking, IQA, revision checks, personal feedback phrases, saved drafts and text evidence citations are implemented.",
    "next": "Complete PDF/DOCX annotation, shared approved feedback, fuller revision history and large-queue pagination."
  },
  {
    "name": "Learning content",
    "state": "Implementation required",
    "detail": "Structured lessons and editor history exist. SCORM/LTI compatibility is not established.",
    "next": "Implement and test content launch contracts, approved reusable units and controlled publication."
  },
  {
    "name": "Offline learning",
    "state": "Further implementation required",
    "detail": "Opt-in saved text works in an already-open workspace; resumable coursework uploads are implemented.",
    "next": "Complete offline startup, protected media downloads and broader synchronisation with permission expiry."
  },
  {
    "name": "Parents and funding",
    "state": "Live workflow verification required",
    "detail": "Guardian views and sponsor funding workflows have database coverage. This is not real-account acceptance.",
    "next": "Verify each child\u2019s permissions and results, commitments, funded places, claims, receipts and balances end to end."
  },
  {
    "name": "NADRA and CCTV",
    "state": "Approved provider details required",
    "detail": "Unapproved identity calls remain blocked. A camera gateway contract does not establish NVR compatibility.",
    "next": "Obtain authorised NADRA access and choose camera/NVR hardware; implement and verify consent, security-role viewing and playback."
  },
  {
    "name": "Public information",
    "state": "Institutional details required",
    "detail": "ATHE, Pearson BTEC and VTCT guidance does not establish centre approval or an available intake.",
    "next": "Supply approved course claims, fees/intakes, social URLs and WhatsApp number; leave TikTok unlinked until provided."
  }
];
export default function ConnectionCoverage(){
 const [filter,setFilter]=useState('all');const rows=connectionCoverage.filter(r=>filter==='all'||r.state===filter);
 return <details className="surface-card p-5 space-y-4"><summary className="font-semibold cursor-pointer">Implementation and connection guide · 14 areas</summary><p className="text-sm text-muted-foreground">Source review: 26 October 2026. This guide describes implementation boundaries, not live health. Use the recorded checks above for evidence and decisions. Never put credentials in review notes.</p><label className="block">Filter implementation status<select className="block w-full sm:w-auto max-w-full border rounded p-2 bg-background" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All areas</option>{[...new Set(connectionCoverage.map(r=>r.state))].map(state=><option key={state}>{state}</option>)}</select></label><div className="grid gap-3 md:grid-cols-2">{rows.map(r=><article key={r.name} className="border rounded p-4 space-y-2 min-w-0"><h3 className="font-medium">{r.name}</h3><p className="text-sm text-muted-foreground">{r.state}</p><p>{r.detail}</p><p className="text-sm"><strong>Next step:</strong> {r.next}</p></article>)}</div></details>;
}
