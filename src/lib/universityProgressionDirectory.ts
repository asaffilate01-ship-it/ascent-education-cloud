/** UniPathway internal progression directory snapshot: 19 October 2026.
 *
 * Internal staff evidence sources, intentionally not linked in the public UI:
 * OTHM: https://othm.org.uk/university-progression
 * Qualifi UK/international: https://qualifi.net/university-progression/
 * Qualifi USA: https://qualifi.net/university-progression-usa/
 *
 * OTHM says its listed arrangements were confirmed by the universities, for
 * particular qualifications/courses and sometimes overseas delivery campuses.
 * Qualifi lists universities with published progression paths or previous
 * progression; this must NOT imply signed deals with UniPathway or every award.
 * Verify university, campus, course, qualification, intake and credit before
 * making individual claims, offers, fee quotes or visa representations.
 */
export type ProgressionBody='OTHM'|'Qualifi';
export type ProgressionCountry='UK'|'USA'|'Australia'|'Canada';
export type ProgressionStatus='university_confirmed_othm_route'|'qualifi_published_progression';
export type ProgressionEntry={
  institution:string;country:ProgressionCountry;body:ProgressionBody;
  status:ProgressionStatus;route:string;institutionNote?:string;sourceKey:string;
};
type Tuple=[string,string,string?];
const othmSource='othm-university-progressions-2026';
const qualifiSource='qualifi-published-progression-2026';
const qualifiUsaSource='qualifi-usa-progression-2026';
const othmUk:Tuple[]=[
 ['Anglia Ruskin University','Level 3 Business Studies: selected bachelor entry; Level 7 Human Resource Management: MA top-up.'],
 ['Arden University','Level 3 Law, Level 4 Psychology; specified Level 5 Business, IT, Law and Project Management top-ups; Level 7 Accounting and MBA options.'],
 ['Aston University','Level 7 Accounting and Finance to MSc Professional Accounting & Finance top-up (part-time).'],
 ['Bangor University','Selected Level 3 business, accountancy and engineering; Level 4 business, law, hospitality and Level 5 diploma advanced routes.'],
 ['Buckinghamshire New University','Level 3 Fashion and Textiles: selected fashion bachelor programmes.'],
 ['Cardiff Metropolitan University','Level 7 Strategic Management and Leadership: advanced-entry MBA with specified optional units.'],
 ['Coventry University','Selected Level 3/4 IT and Level 5 business routes; published examples are delivered through PSB Academy, Singapore.','Overseas delivery arrangement; do not assume the UK campus offers identical advanced entry.'],
 ['De Montfort University','Selected Level 3 Business, Level 4 Hospitality and Level 5 Business/Accounting/Hospitality degree progression.'],
 ['Northumbria University','Selected Level 5 business/hospitality top-ups and Level 7 accounting, HR, logistics and strategy postgraduate pathways.'],
 ['Queen Margaret University','Level 4 Business and Level 5 Hospitality routes to specified bachelor years.'],
 ['Sheffield Hallam University','Selected Level 4 Business, Accounting, IT and Hospitality Year 2; Level 5 Business/Hospitality top-up routes.'],
 ['Teesside University','Level 5 Extended Diploma in Early Childhood Education to BA Childhood Studies (online top-up).'],
 ['Ulster University','Selected Level 7 Business, Accounting, HR, Tourism and Marketing routes to MBA/MSc options.'],
 ['University College Birmingham','Selected Level 5 Business, Accounting, Healthcare, Early Childhood and Contemporary Skin Rejuvenation top-ups.'],
 ['University of Chester','Level 7 Education Management and Leadership to final stage of MA Educational Leadership.'],
 ['University of Gloucestershire','Level 8 Strategic Management and Leadership Practice to Doctor in Business Administration.'],
 ['University of Greater Manchester','Level 3 Business/IT and Level 5 Business/Healthcare/IT options; selected Level 7 qualifications to MBA top-up.','Formerly University of Bolton; verify current course naming.'],
 ['University of Greenwich','Selected Level 6/7 Occupational Health and Safety and Environmental Management to relevant MSc routes.'],
 ['University of Hertfordshire','Level 3 Information Technology to BEng Robotics and AI via PSB Academy, Singapore.','Overseas delivery arrangement; do not imply direct UK-campus entry.'],
 ['University of Law','Level 3 Business/Law and selected Level 5 Business/Law/Accounting undergraduate or top-up paths.'],
 ['University of Northampton','Level 7 Accounting, HR or Strategic Management to specified MSc, MA or MBA top-up routes.'],
 ['University of South Wales','Level 5 Early Childhood Education to specified Education and Early Years undergraduate progression.'],
 ['University of Staffordshire','Level 4 Psychology, Level 5 Business/Cyber/Law/Healthcare and Level 7 Strategic Management to specified degrees/MBA.'],
 ['University of Sunderland','Level 3 Business/Higher Education; Level 4 Business and Level 5 Business/Healthcare/Hospitality; Level 7 management/healthcare postgraduate routes.'],
 ['University of the Highlands and Islands','Selected Level 5 Business, Accounting, IT, Hospitality and Health routes; Level 7 Tourism/Data Science MSc progression.'],
 ['University of Westminster','Level 5 Business Management to BA Global Trade and Business top-up.'],
 ['University of the West of England (UWE Bristol)','Selected Level 5 Accounting, IT, Cyber Security and Early Childhood top-up degrees.'],
];
const qualifiUk:string[]=[
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
const qualifiUsa:Tuple[]=[
 ['Thomas Edison State University','Qualifi-published USA progression; related bachelor credit/advanced standing depends on eligibility and the degree.'],
 ['Charter Oak State College','Qualifi-published USA progression; individual course credit review.'],
 ['Excelsior University','Qualifi-published USA progression; individual course and credit review.'],
 ['Indiana Tech','Qualifi-published USA progression; individual course and credit review.'],
 ['University of the People','Qualifi-published USA progression; online degree/credit pathway to be checked individually.'],
 ['Strayer University','Qualifi-published USA progression; programme-specific credit and entry review.'],
 ['William Paterson University','Qualifi-published USA progression; published advanced-standing MBA opportunity, individual entry check.'],
 ['Ottawa University (Kansas/Arizona)','Qualifi-published USA progression; U.S. institution, not the University of Ottawa in Canada.'],
];
const othmAustralia:Tuple[]=[
 ['Curtin University','Selected OTHM Level 3 Business, Engineering, IT, Accountancy and higher education foundation awards to Year 1 undergraduate study; confirm institution/campus.'],
 ['Edith Cowan University','OTHM Level 6 Occupational Health and Safety and Level 7 OH&S Management to relevant graduate certificate/diploma.'],
];
const qualifiAustralia:Tuple[]=[
 ['University of New England (Australia)','Qualifi-published progression; verify exact qualification, course, campus/online delivery and admissions requirements.'],
];
export const progressionRecords:ProgressionEntry[]=[
 ...othmUk.map(([institution,route,institutionNote])=>({institution,route,institutionNote,body:'OTHM' as const,country:'UK' as const,status:'university_confirmed_othm_route' as const,sourceKey:othmSource})),
 ...qualifiUk.map(institution=>({institution,route:'The institution appears on Qualifi’s published progression list. Ask for the exact award, degree, intake, credit and campus assessment.',body:'Qualifi' as const,country:'UK' as const,status:'qualifi_published_progression' as const,sourceKey:qualifiSource})),
 ...qualifiUsa.map(([institution,route])=>({institution,route,body:'Qualifi' as const,country:'USA' as const,status:'qualifi_published_progression' as const,sourceKey:qualifiUsaSource})),
 ...othmAustralia.map(([institution,route])=>({institution,route,body:'OTHM' as const,country:'Australia' as const,status:'university_confirmed_othm_route' as const,sourceKey:othmSource})),
 ...qualifiAustralia.map(([institution,route])=>({institution,route,body:'Qualifi' as const,country:'Australia' as const,status:'qualifi_published_progression' as const,sourceKey:qualifiSource})),
];
export const verifiedProgressionSnapshot='2026-10-19';
export const progressionCountries:ProgressionCountry[]=['UK','USA','Australia','Canada'];
export function normalizeUniversityName(name:string):string {
 return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
export type ProgressionInstitution={
 name:string;country:ProgressionCountry;records:ProgressionEntry[];
};
export function getProgressionInstitutions(records:ProgressionEntry[]=progressionRecords):ProgressionInstitution[]{
 const lookup=new Map<string,ProgressionInstitution>();
 for(const record of records){
  const key=record.country+':'+normalizeUniversityName(record.institution);
  const match=lookup.get(key);
  if(match)match.records.push(record);
  else lookup.set(key,{name:record.institution,country:record.country,records:[record]});
 }
 return [...lookup.values()].sort((a,b)=>a.country.localeCompare(b.country)||a.name.localeCompare(b.name));
}
