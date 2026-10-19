/**
 * Internal, reviewed awarding-body university progression directory.
 * Source references are kept for staff verification but NOT rendered as
 * outbound links for public visitors.
 *
 * IMPORTANT: published lists establish reported progression pathways only.
 * They do not prove a contract with UniPathway, automatic admissions, universal
 * OTHM/Qualifi acceptance, visa support or eligibility for every qualification.
 * Review source freshness and the exact degree before making an offer.
 */
export type ProgressionCountry = 'UK' | 'USA' | 'Australia' | 'Canada';
export type ProgressionBody = 'OTHM' | 'Qualifi';
export type NamedUniversity = {
  id:string;
  name:string;
  country:Exclude<ProgressionCountry,'Canada'>;
  bodies:ProgressionBody[];
  bodyNotes:Partial<Record<ProgressionBody,string>>;
  /** Internal-source references are for staff QA, not public links. */
  evidence:Partial<Record<ProgressionBody,string>>;
  lastReviewedOn:string;
};
export const PROGRESSION_SOURCE={
  OTHM:'https://othm.org.uk/university-progression',
  QualifiUK:'https://qualifi.net/university-progression/',
  QualifiUSA:'https://qualifi.net/university-progression-usa/',
} as const;
const reviewedOn='2026-10-19';

/** OTHM's published named university arrangements, scoped to target countries.
 * UK universities delivered through an overseas campus/partner are annotated.
 */
const othmUK:[string,string][]=[
  ['Anglia Ruskin University','Examples: Level 3 Business entry; Level 7 HRM master’s progression.'],
  ['Arden University','Examples: selected Level 4/5 Business, IT and Law top-ups; Level 7 master’s/MBA progression.'],
  ['Aston University','Example: Level 7 Accounting & Finance to a professional accounting MSc top-up.'],
  ['Bangor University','Examples: selected Level 3 direct entry, Level 4 second-year entry, and Level 4/5 top-ups.'],
  ['Buckinghamshire New University','Example: Level 3 Fashion and Textiles to selected first-year fashion courses.'],
  ['Cardiff Metropolitan University','Example: Level 7 Strategic Management and Leadership to MBA advanced entry, with required units.'],
  ['Coventry University','Examples: selected IT and Business pathways delivered through PSB Academy, Singapore; not necessarily UK campus entry.'],
  ['De Montfort University','Examples: Level 4/5 Business, Accounting and Tourism progression into related degrees.'],
  ['Northumbria University','Examples: Level 4/5 Business, Accounting, Logistics and Level 7 master’s progression.'],
  ['Queen Margaret University Edinburgh','Examples: Level 4 Business and Level 5 Tourism and Hospitality advanced entry.'],
  ['Sheffield Hallam University','Examples: Level 4 Accounting, Business, IT, Tourism year-2 routes, and Level 4/5 degree top-ups.'],
  ['Teesside University','Example: Level 4/5 Early Childhood Education to online Childhood Studies top-up.'],
  ['Ulster University','Examples: selected Level 7 Management, HR, Marketing, Accounting and Tourism into MBA/MSc routes.'],
  ['University College Birmingham','Examples: Level 4/5 Aesthetics, Health & Social Care, Business and Childhood Studies top-ups.'],
  ['University of Chester','Example: Level 7 Education Management and Leadership to final stage of MA Educational Leadership.'],
  ['University of Gloucestershire','Example: Level 8 Strategic Management and Leadership Practice to DBA.'],
  ['University of Greater Manchester','Examples: Level 3 undergraduate entry, Level 4/5 degree top-ups and Level 7 MBA.'],
  ['University of Greenwich','Examples: Level 6/7 Occupational Health and Safety and Level 7 sustainability to MSc routes.'],
  ['University of Hertfordshire','Example: Level 3 IT Foundation to Robotics/AI engineering via PSB Academy, Singapore; campus differs.'],
  ['University of Law','Examples: Level 3 Law or Business entry and Level 4/5 Law, Business and Accounting top-ups.'],
  ['University of Northampton','Examples: Level 7 Accounting, HR and Strategic Management to master’s/MBA top-ups.'],
  ['University of South Wales','Example: Level 4/5 Early Childhood Education to BA Early Years Education top-up.'],
  ['University of Staffordshire','Examples: selected Level 4/5 Business, Cyber Security, Law, Psychology and Health & Social Care routes.'],
  ['University of Sunderland','Examples: Level 3 entry, Level 4 Business year 2, Level 4/5 Business and Health top-ups, and Level 7 MBA.'],
  ['University of the Highlands and Islands','Examples: selected Level 4/5 Business, IT, Tourism, Health and Level 7 Tourism/Data progression.'],
  ['University of Westminster','Example: Level 5 Business Management to BA Global Trade and Business top-up.'],
  ['University of the West of England (UWE Bristol)','Examples: Level 4/5 Accounting, Childhood Education, IT and Cyber Security top-ups.'],
];
const othmAustralia:[string,string][]=[
 ['Curtin University','Published Level 3 Business, Accountancy, Engineering and IT foundation routes to selected year-one degree entry.'],
 ['Edith Cowan University','Published Level 6/7 Occupational Health and Safety routes to relevant graduate certificate or diploma.'],
];

/** The general Qualifi list does not specify a universal qualification match:
 * mark as individual route verification needed on each card.
 */
const qualifiUK:string[]=[
 'University of Central Lancashire',
 'University of Leicester',
 'Anglia Ruskin University',
 'University of Wolverhampton',
 'University of Derby',
 'Arden University',
 'University of Law',
 'Plymouth Marjon University',
 'BPP University',
 'Buckinghamshire New University',
 'University of the West of Scotland',
 'De Montfort University',
 'Glasgow Caledonian University',
 'University of East London',
 'Leeds Beckett University',
 'Liverpool John Moores University',
 'London South Bank University',
 'Northumbria University',
 'University of Staffordshire',
 'Bath Spa University',
 'University of Bedfordshire',
 'University of Greater Manchester',
 'University of Gloucestershire',
 'University of Cumbria',
 'University of Huddersfield',
 'University of Chichester',
 'University of Lincoln',
 'University of Suffolk',
 'Bangor University',
 'Wrexham University',
 'Birmingham City University',
 'The Open University',
];
const qualifiUSA:string[]=[
  'Thomas Edison State University',
  'Charter Oak State College',
  'Excelsior University',
  'Indiana Tech',
  'University of the People',
  'Strayer University',
  'William Paterson University',
  'Ottawa University',
];
const qualifiAustralia:string[]=[
  'University of New England',
];

const aliases:Record<string,string>={
  'university of bolton':'University of Greater Manchester',
  'staffordshire university':'University of Staffordshire',
  'university of west of scotland':'University of the West of Scotland',
};
function canonical(name:string){return aliases[name.toLowerCase()]||name;}
const entries:NamedUniversity[]=[];
function register(country:Exclude<ProgressionCountry,'Canada'>,body:ProgressionBody,
 name:string,note:string,source:string){
  const correct=canonical(name);
  let university=entries.find(u=>u.country===country && u.name.toLowerCase()===correct.toLowerCase());
  if(!university){
   const id=(country+'-'+correct).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
   university={id,name:correct,country,bodies:[],bodyNotes:{},evidence:{},lastReviewedOn:reviewedOn};
   entries.push(university);
  }
  if(!university.bodies.includes(body))university.bodies.push(body);
  university.bodyNotes[body]=note;
  university.evidence[body]=source;
}
for(const [name,note] of othmUK) register('UK','OTHM',name,note,PROGRESSION_SOURCE.OTHM);
for(const [name,note] of othmAustralia) register('Australia','OTHM',name,note,PROGRESSION_SOURCE.OTHM);
for(const name of qualifiUK) register('UK','Qualifi',name,
  'Named on Qualifi’s progression list; the matching qualification, degree, campus and advanced-entry arrangement must be checked individually.',
  PROGRESSION_SOURCE.QualifiUK);
for(const name of qualifiUSA) register('USA','Qualifi',name,
  'Named on Qualifi’s USA progression list; eligible qualification and awarded transfer credits depend on individual admission assessment.',
  PROGRESSION_SOURCE.QualifiUSA);
for(const name of qualifiAustralia) register('Australia','Qualifi',name,
  'Named on Qualifi’s international progression list; relevant programme, entry and award-credit details need confirmation.',
  PROGRESSION_SOURCE.QualifiUK);

export const universityProgressionDirectory=entries.sort((a,b)=>a.country.localeCompare(b.country)||a.name.localeCompare(b.name));
export const progressionCountries:ProgressionCountry[]=['UK','USA','Australia','Canada'];
export function filterProgressionUniversities({country='All',body='All',search=''}:{
 country:ProgressionCountry|'All';body:ProgressionBody|'All';search:string;
}):NamedUniversity[]{
 const term=search.trim().toLowerCase();
 return universityProgressionDirectory.filter(u=>(country==='All'||u.country===country)
   &&(body==='All'||u.bodies.includes(body))
   &&(!term||[u.name,u.country,...u.bodies,...Object.values(u.bodyNotes)].join(' ').toLowerCase().includes(term)));
}
export const canadaProgressionStatus='No university in Canada was identified on the reviewed public OTHM and Qualifi progression lists. Students can still ask UniPathway to assess Canadian institution-specific credit policies independently.';
