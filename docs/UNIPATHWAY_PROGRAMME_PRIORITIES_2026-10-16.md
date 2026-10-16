# Programme priorities and adult residential operations

## Agreed scope

Primary: OTHM, Qualifi, accountancy and IT training. Supporting provision: English, maths, chemistry, biology and physics tuition; IELTS; Pakistan-funded course enquiries and international opportunities. University progression targets: UK, USA, Australia, Canada and Germany. No new university contracts, funded places or commission rates are assumed.

OTHM / Qualifi: two 14-day visits per academic year, remaining learning online. Annual residential component: 72 teaching hours plus up to three optional private-support hours. All residential learners are adults (18+). One centre with 50 main teaching places and ten separate support places. Separate accommodation for up to 200 students per intake plus staff beds, with segregated male/female sections and staff rooms. Staff may share the accommodation location; teaching, trips and overnight duties need separate rest-aware allocations.

Activities annually: two full-day Lahore trips, two full-day Islamabad trips, one picnic and one evening outing. Trips stagger by group. Season: mid-October to mid-April excluding Ramadan and Muharram. September 2027 intake remains a planning assumption; no dated calendar has been approved.

## Built in this phase

- `/study`: searchable, category-filtered study priorities, all five destination targets, and honest funding enquiry messaging. Linked from shared public navigation and homepage.
- Public catalogue: tenant-scoped active programme reads with pagination, awarding-body filters, explicit load failures and no fallback sample diplomas. Course enquiries stay within the selected centre. Delivery descriptions updated in public and residential pages.
- `/director/residential-planner`: role-protected scenario calculator, repeatable relative-day teaching rota and CSV export. Five 200-person cohorts require ten fortnight visits (20 operating weeks). Four groups of 50 each receive ten 3.5-hour lessons plus one hour per visit. No main teaching overlaps; two teaching-free trip days are suggested per group. Inputs reject invalid values and show insufficient capacity.
- Existing residential booking page: correct authenticated tenant ID rather than visit ID, tenant filters, stale-read suppression, error states and in-flight duplicate-click protection. Removed invented accommodation/catering prices and on-campus promises. Booking records do not allocate beds or teaching shifts.
- Existing private signed-agreement workflow: optional flat-per-enrolment or percentage commission terms, currency validation, zero distinct from unknown, percentage upper bound, and agreement display. Uses existing columns and authorization. Does not calculate earned commission or create payments.

## Outstanding operational work

The planner is an in-memory draft with CSV export, not a persisted scheduling engine. It does not reserve dates, allocate rooms or tutors, enforce booking capacity atomically, or book trips. Qualification and level splits may require different group sizes and tutors. Breaks within the stated teaching sessions require replacement teaching time. Picnic/evening and private-support duty rotas remain to be allocated. Centre occupancy includes support learners in addition to main classes; staff/fire occupancy requires its own assessment.

Need dated calendar and holiday exclusions, programme delivery approval, room/transport/staff contracts, accommodation allocation and capacity enforcement, attendance by teaching group, and authenticated staging acceptance. Existing residential RLS has not received a full audit in this increment.

Funding entries are enquiries: no specific government scheme integration or eligibility decision is claimed. University partner and pathway verification remains in the existing workflow. Commission terms are contractual data only; earning triggers, currency-separated receivables, invoice matching and clawback settlement need a later finance phase. No live deployment or migrations are performed here.
