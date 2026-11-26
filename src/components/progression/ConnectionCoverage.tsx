import {useRef,useState} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
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
    "state": "Browser lab implemented; classroom trial pending",
    "detail": "Listen-and-repeat with speech checking, dictation, timed speaking with AI practice feedback, an AI conversation partner and teacher-led live sessions are implemented for classroom and remote learners; hosted acceptance remains required. Live pair audio and teacher intercom are not included.",
    "next": "Trial with a real class on students' phones and headsets; decide whether pair/group audio is needed."
  },
  {
    "name": "Virtual tech labs",
    "state": "Browser labs implemented; cloud provider required",
    "detail": "Marked AI, Python, web, JavaScript, SQL, data and cyber exercises, an AI coach and teacher-led live sessions are implemented in the browser; hosted acceptance remains required. Managed cloud environments (Linux desktops, servers) remain separate.",
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
    "detail": "Independent marking, IQA, full submitted revision snapshots, personal feedback phrases, saved drafts and text citations are implemented. Marker and IQA queues use bounded data requests and paginated cards.",
    "next": "Complete PDF/DOCX inline annotation and institution-shared approved feedback. Verify large real queues and the review workflow with allocated staff accounts."
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
    "detail": "Offline startup, opt-in text packs, private course-file downloads and all-module progress sync are implemented with 24-hour device access. Coursework uploads can resume after interruption.",
    "next": "Verify the published service worker on student devices, private file downloads and reconnect sync with real enrolled accounts. External streaming, live classes and assessed submissions still require internet."
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
    "name": "Student application planning",
    "state": "Hosted activation required",
    "detail": "Public scholarship research, university comparison and calendar downloads are implemented. The private student planner has a separately gated reviewed database patch.",
    "next": "Rehearse the private planner patch against the actual predecessor schema; verify student ownership, centre separation and retention before enabling the server and browser gates."
  },
  {
    "name": "Public enquiry security",
    "state": "Hosted activation required",
    "detail": "Both contact handlers validate an active tenant and return safe public errors. The protected route has Turnstile and a durable quota, with a server-side legacy bypass prevention switch.",
    "next": "Verify hosted handlers, challenge and quota, CRM routing and the coordinated secure-only server and client switches."
  },
  {
    "name": "Facilities inspection records",
    "state": "Hosted activation required",
    "detail": "The facilities register is read-only by default in the interface; reviewed forward patches provide gated centre-specific asset and inspection reads.",
    "next": "Rehearse both facilities patches, verify physical security roles and server gates, and complete verified registration and inspection submission workflows. Do not infer compliance from planning entries."
  },
  {
    "name": "Public information",
    "state": "Institutional details required",
    "detail": "ATHE, Pearson BTEC and VTCT guidance does not establish centre approval or an available intake.",
    "next": "Verify the published WhatsApp, Facebook and Instagram links; confirm remaining official channel URLs and approved course claims, fees and intakes."
  }
];
export default function ConnectionCoverage(){
 const [filter,setFilter]=useState('all'),[search,setSearch]=useState('');
 const searchInput=useRef<HTMLInputElement>(null);
 const query=search.trim().toLowerCase();
 const rows=connectionCoverage.filter(r=>(filter==='all'||r.state===filter)&&`${r.name} ${r.state} ${r.detail} ${r.next}`.toLowerCase().includes(query));
 const filtered=!!search||filter!=='all';
 const clear=()=>{setFilter('all');setSearch('');searchInput.current?.focus();};
 return <details className="surface-card p-5 space-y-4">
  <summary className="min-h-11 font-semibold cursor-pointer">Implementation and connection guide · {connectionCoverage.length} areas</summary>
  <p className="text-sm text-muted-foreground">Source review: 26 November 2026. This guide describes implementation boundaries, not live health. Use the recorded checks above for evidence and decisions. Never put credentials in review notes.</p>
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="block text-sm font-medium">Find an integration<Input ref={searchInput} type="search" placeholder="Try recordings, payments or offline" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <label className="block text-sm font-medium">Filter implementation status<select className="mt-1 min-h-11 block w-full min-w-0 rounded-lg border p-2 bg-background" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All areas</option>{[...new Set(connectionCoverage.map(r=>r.state))].map(state=><option key={state}>{state}</option>)}</select></label>
  </div>
  <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" aria-atomic="true" className="text-sm text-muted-foreground">{rows.length} of {connectionCoverage.length} integration areas shown</p>{filtered&&rows.length>0&&<Button variant="outline" onClick={clear}>Clear integration filters</Button>}</div>
  {!rows.length&&<div className="rounded-xl border p-5"><h3 className="font-semibold">No integration areas match</h3><p className="mt-2 text-sm text-muted-foreground">Try another service name or clear the status filter to see every area.</p><Button variant="outline" className="mt-3" onClick={clear}>Clear integration filters</Button></div>}
  <div className="grid gap-3 md:grid-cols-2">{rows.map(r=><article aria-label={r.name} key={r.name} className="border rounded-xl p-4 space-y-2 min-w-0 break-words"><h3 className="font-semibold">{r.name}</h3><p className="text-sm font-medium text-muted-foreground">{r.state}</p><p className="text-sm leading-relaxed">{r.detail}</p><p className="text-sm leading-relaxed"><strong>Next step:</strong> {r.next}</p></article>)}</div>
 </details>;
}
