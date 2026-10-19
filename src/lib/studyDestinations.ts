/** Public educational guidance; university examples are NOT signed UniPathway partners.
 * Check institution, specific programme, academic equivalency, language test, visa
 * and current government requirements at the official source before relying on a route.
 */
export type DestinationKey='pakistan'|'uk'|'germany'|'usa'|'canada'|'australia';
type Route={title:string;detail:string};
type Resource={label:string;url:string};
export type Destination={
 key:DestinationKey;name:string;flag:string;headline:string;intro:string;
 routes:Route[];languages:Route[];documentChecklist:string[];
 practical:Route[];support:Route[];universityExamples:string[];
 official:Resource[];
};
export const studyDestinations:Record<DestinationKey,Destination>={
 pakistan:{
  key:'pakistan',name:'Pakistan',flag:'🇵🇰',headline:'University progression, qualifications and practical careers in Pakistan',
  intro:'Explore recognised Pakistan universities, distance learning, professional education, scholarships and nationally recognised skills. University status AND each teaching campus should be checked with HEC. UniPathway does not claim automatic admission or an agreement with listed universities.',
  routes:[
   {title:'Matric, Intermediate and FSc',detail:'Match subject combinations and HSSC marks to each university course. Medicine, engineering and competitive programmes can have their own merit criteria and tests.'},
   {title:'Cambridge O/A Levels',detail:'Check applicable IBCC equivalency, required subject combinations and university admission policy.'},
   {title:'Entry tests and interviews',detail:'Research NET, ECAT, MDCAT or university-specific assessments only where required for your exact field.'},
   {title:'Vocational and degree progression',detail:'Compare NVQF/NAVTTC pathways, professional exam preparation, skills diplomas and recognised university degrees without conflating them.'},
  ],
  languages:[{title:'English, Urdu and programme language',detail:'Check the teaching language and university admissions test. IELTS is not automatically a requirement for all Pakistan university applicants.'}],
  documentChecklist:['Matric/HSSC or A-Level transcript and certificates','IBCC equivalence where applicable','CNIC/identity and current photographs','Entry-test results if required','Application deadlines, fees and scholarship records','Personal statement, portfolio or references where requested'],
  practical:[
   {title:'Study modes',detail:'Compare campus attendance, blended delivery, distance learning and programme-specific practical requirements.'},
   {title:'Work and placements',detail:'Access CV preparation and employer introductions only for genuinely verified vacancies or internships.'},
   {title:'Student financial support',detail:'Review institution scholarships and eligibility through official university channels.'},
  ],
  support:[{title:'Degree and subject selection',detail:'Adviser helps match interests and subjects to eligible institutions.'},{title:'HEC verification',detail:'Check the exact university and campus rather than relying on names or logos.'},{title:'Career readiness',detail:'Practical interview and workplace-skills learning, with approved placement partners where confirmed.'}],
  universityExamples:['NUST','COMSATS University Islamabad','Quaid-i-Azam University','University of the Punjab','FAST-NUCES','UET Lahore','Virtual University of Pakistan','Fatima Jinnah Women University'],
  official:[{label:'HEC recognised universities',url:'https://www.hec.gov.pk/english/universities/Pages/recognised.aspx'},{label:'HEC recognised campuses',url:'https://www.hec.gov.pk/english/universities/Pages/DAIs/HEC-recognized-Campuses.aspx'},{label:'NAVTTC training programmes',url:'https://navttc.gov.pk/programs/'}],
 },
 uk:{
  key:'uk',name:'United Kingdom',flag:'🇬🇧',headline:'Undergraduate, master’s and verified UK progression routes',
  intro:'Explore foundation, degree, top-up and postgraduate courses. UK universities assess international certificates, language evidence, transcripts and advanced standing individually.',
  routes:[{title:'After HSSC or Matric',detail:'Consider foundation or first-year routes subject to university recognition and required subjects.'},{title:'Cambridge/A-Level entry',detail:'Check grades, subject combinations and course-specific prerequisites through UCAS or the institution.'},{title:'OTHM/Qualifi advanced entry',detail:'Send the qualification specification, learning outcomes and unit transcript; top-up and credit transfer are never automatic.'},{title:'Postgraduate study',detail:'Assess bachelor equivalence, academic discipline, references and professional prerequisites.'}],
  languages:[{title:'English for admission',detail:'IELTS Academic, TOEFL iBT, PTE Academic and some Cambridge qualifications may be accepted; each course sets its required results and component scores.'},{title:'English for student visa',detail:'Degree sponsors may assess language under applicable rules; approved SELTs can be required in other circumstances. Check GOV.UK for the current route.'}],
  documentChecklist:['Awarding-body certificates, transcripts and unit specifications','Passport, statement, references and CV','Accepted English-language evidence','Course and scholarship applications','Visa sponsorship, financial and identity evidence as required'],
  practical:[{title:'Housing and arrival',detail:'Compare halls and checked rentals; review deposits, arrival steps and student support.'},{title:'Banking and National Insurance',detail:'Provide official process guidance only. UniPathway does not open accounts or issue NI numbers.'},{title:'Part-time and post-study work',detail:'Working rights and graduate/skilled routes depend on current immigration permission and policy.'}],
  support:[{title:'UCAS / direct application preparation',detail:'Use official forms and authentic references.'},{title:'Academic language preparation',detail:'IELTS and English tutorial support.'},{title:'Housing and career guidance',detail:'Coordinate independent checklists and refer regulated immigration advice.'}],
  universityExamples:['University of Manchester','University of Hertfordshire','Coventry University'],
  official:[{label:'Study UK / British Council',url:'https://study-uk.britishcouncil.org/'},{label:'UCAS',url:'https://www.ucas.com/'},{label:'GOV.UK student visa English requirements',url:'https://www.gov.uk/student-visa/knowledge-of-english'}],
 },
 germany:{
  key:'germany',name:'Germany',flag:'🇩🇪',headline:'Studienkolleg, applied sciences and university routes to Germany',
  intro:'Study at research universities and universities of applied sciences in German or English. Recognition depends on your school-leaving qualification, discipline and institutional decision.',
  routes:[{title:'School qualifications',detail:'Check DAAD/Anabin and institutional criteria for recognised entrance certificates; some applicants require Studienkolleg or comparable university study.'},{title:'Studienkolleg and direct entry',detail:'Studienkolleg can require an entrance test and German B1–B2 before preparatory study.'},{title:'Undergraduate and master’s',detail:'Assess subject combinations, prior credits, study language and faculty requirements.'},{title:'Diploma progression',detail:'Submit full Level 4/5 award and transcripts for independent recognition; no automatic top-up is implied.'}],
  languages:[{title:'German-taught programmes',detail:'Many expect at least B2 and often C1-level evidence. TestDaF, DSH, telc Deutsch C1 Hochschule and selected Goethe certificates may be recognised.'},{title:'English-taught programmes',detail:'IELTS Academic or TOEFL may be required; knowledge of German remains helpful for daily life and employment.'}],
  documentChecklist:['Authenticated school/degree records and translations','Academic language certificates','CV, motivation and course-specific portfolio','uni-assist/VPD or institution-specific application documents','Financing, insurance and accommodation documentation where applicable'],
  practical:[{title:'Public and private institutions',detail:'Research tuition, semester fees, state exceptions and exact programme language.'},{title:'Accommodation, insurance, arrival',detail:'Prepare housing, health insurance, municipal registration and student-service checklists.'},{title:'Working during and after study',detail:'Eligibility depends on residence permit and current German immigration rules.'}],
  support:[{title:'German language academy',detail:'A1–C1 learning, Goethe, TestDaF, telc and DSH preparation.'},{title:'Recognition and admissions',detail:'DAAD, Anabin and uni-assist research.'},{title:'Practical pre-departure guidance',detail:'Housing, funding and insurance checklists with regulated referrals.'}],
  universityExamples:['Technical University of Munich','University of Stuttgart','HfWU Nürtingen-Geislingen'],
  official:[{label:'DAAD admissions overview',url:'https://www.daad.de/en/studying-in-germany/requirements/overview/'},{label:'DAAD language guidance',url:'https://www.daad.de/en/studying-in-germany/living-in-germany/german-language/'},{label:'uni-assist',url:'https://www.uni-assist.de/en/'}],
 },
 usa:{
  key:'usa',name:'United States',flag:'🇺🇸',headline:'U.S. colleges, bachelor’s degrees, graduate programmes and transfer routes',
  intro:'Choose by academic field, university or community college, affordability, scholarships and entry criteria. EducationUSA recommends a staged research, funding, application, visa and departure process.',
  routes:[{title:'First-year university applications',detail:'Review grades, courses, statements and admission tests such as SAT/ACT only where required.'},{title:'Community college / transfer',detail:'Compare transfer agreements carefully; credits and admission depend on receiving institutions.'},{title:'Graduate study',detail:'Verify bachelor equivalency, references, portfolio, research and GRE/GMAT requirements when applicable.'},{title:'OTHM/Qualifi',detail:'Request an individual credential review; U.S. college credit from UK diplomas is not guaranteed.'}],
  languages:[{title:'English-language evidence',detail:'Many institutions accept TOEFL iBT, IELTS Academic or other specified tests such as Duolingo English Test. Minimum scores and exemptions vary by programme.'}],
  documentChecklist:['School/degree transcripts and any required evaluation','Passport and personal essays','English testing and programme tests where required','Recommendations and work/portfolio evidence','Scholarship and financial documentation','Institution-issued study-visa documents once admitted'],
  practical:[{title:'Accommodation and campus planning',detail:'Compare housing, insurance and city costs.'},{title:'F-1 and employment information',detail:'Use government advice for study status and authorised employment; do not assume part-time jobs are automatically permitted.'},{title:'Career options',detail:'Explore academic careers and institution-specific authorised internships.'}],
  support:[{title:'Five-step admissions plan',detail:'Research, finance, apply, understand study visa and prepare for departure.'},{title:'Language preparation',detail:'Tutor-supported English and academic writing.'},{title:'Scholarships',detail:'Review verified institutional financial-aid opportunities.'}],
  universityExamples:['Arizona State University','University of Houston','University of Texas at Arlington'],
  official:[{label:'EducationUSA five steps',url:'https://educationusa.state.gov/your-5-steps-us-study'},{label:'EducationUSA language guidance',url:'https://educationusa.state.gov/english-language'},{label:'Study in the States',url:'https://studyinthestates.dhs.gov/'}],
 },
 canada:{
  key:'canada',name:'Canada',flag:'🇨🇦',headline:'Canadian university, college, English and French study pathways',
  intro:'Investigate institutions and permitted campuses, course eligibility, provincial conditions and study permits separately. EduCanada explains academic and language requirements.',
  routes:[{title:'College and vocational qualifications',detail:'Review the programme, designated learning institution, learning location and credit-transfer rules.'},{title:'University undergraduate study',detail:'Check Pakistan HSSC, A-Level or prior school equivalency and subject prerequisites.'},{title:'Postgraduate routes',detail:'Assess bachelor equivalency, programme subject, references and academic experience.'},{title:'Transfer credits',detail:'Canadian institutions independently decide how previously completed qualifications count.'}],
  languages:[{title:'English-language programmes',detail:'Institutions may accept IELTS Academic, TOEFL iBT, CAEL or Cambridge English tests, with course-specific thresholds.'},{title:'French-language programmes',detail:'Institutions determine accepted French assessments. Postgraduation immigration evidence has separate rules.'}],
  documentChecklist:['School and university records','Institution-specific English/French proficiency evidence','Passport, personal statement and references','Funding evidence and institutional acceptance','Programme-specific tests and experience evidence'],
  practical:[{title:'Designated learning institution',detail:'Confirm school and campus eligibility independently.'},{title:'Housing, healthcare and budget',detail:'Costs vary by province and city.'},{title:'Student work and PGWP',detail:'Current permit conditions and postgraduation eligibility apply; no job/visa guarantee.'}],
  support:[{title:'Institution due diligence',detail:'Study level, campus, costs and eligibility.'},{title:'English and French language planning',detail:'Prepare for the test required by the actual programme.'},{title:'Arrival and career planning',detail:'Practical checklists and vetted employer opportunities.'}],
  universityExamples:['University of Toronto','University of British Columbia','University of Alberta'],
  official:[{label:'EduCanada university information',url:'https://www.educanada.ca/study-plan-etudes/university-universite.aspx?lang=eng'},{label:'EduCanada language requirements',url:'https://www.educanada.ca/study-plan-etudes/language-langue.aspx?lang=eng'},{label:'IRCC study permits',url:'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html'}],
 },
 australia:{
  key:'australia',name:'Australia',flag:'🇦🇺',headline:'Australia universities, VET providers and English-language routes',
  intro:'Use Australia’s CRICOS register to confirm whether an institution and exact course can enrol overseas students. Universities and Home Affairs assess admission and visa evidence separately.',
  routes:[{title:'Foundation and undergraduate entry',detail:'Check HSSC/A-Level equivalency, grades and programme prerequisites.'},{title:'VET and applied training',detail:'Confirm CRICOS-listed courses and training organisations; foundation completion does not itself confer university credit.'},{title:'Postgraduate routes',detail:'Assess bachelor equivalency, research or work experience and subject entry conditions.'},{title:'Credit recognition',detail:'Programme-by-programme; never assume the same credits transfer at every institution.'}],
  languages:[{title:'English evidence for study/visa',detail:'IELTS Academic, PTE Academic, approved TOEFL iBT for Australia and other current approved tests may be accepted. Home Affairs generally does not accept at-home tests for visa English evidence.'}],
  documentChecklist:['School/university transcripts','CRICOS provider and course identifier','Recognised language-test result','Passport, funding and insurance information','Statement and academic references if requested'],
  practical:[{title:'Course and provider',detail:'Verify CRICOS registration before payment.'},{title:'Housing and health',detail:'Compare city costs, accommodation and OSHC requirements.'},{title:'Employment and graduate pathways',detail:'Student and post-study rights are subject to current visa conditions.'}],
  support:[{title:'Course search and cost comparison',detail:'Official provider verification and application timelines.'},{title:'IELTS/PTE/TOEFL preparation',detail:'Plan against the actual institution and visa rule.'},{title:'Arrival and career readiness',detail:'Practical support and regulated migration referral if needed.'}],
  universityExamples:['University of Melbourne','Monash University','RMIT University'],
  official:[{label:'Study Australia English language testing',url:'https://www.studyaustralia.gov.au/en/plan-your-move/language-testing-organisations.html'},{label:'CRICOS institution and course search',url:'https://cricos.education.gov.au/'},{label:'Australian Department of Education',url:'https://www.education.gov.au/international-education/studying-australia'}],
 },
};
export const allDestinationKeys:DestinationKey[]=['pakistan','uk','germany','usa','canada','australia'];
