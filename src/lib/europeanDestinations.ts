/** European higher education discovery, based on European Commission Study in Europe
 * country profiles (accessed 2026-10-19). Internal research references are kept
 * for admission advisers; public cards keep visitors inside UniPathway.
 *
 * Institutions are EXAMPLES TO RESEARCH, not UniPathway partners and not
 * published OTHM/Qualifi acceptance arrangements. Never use these examples
 * to assert a particular UK diploma is accepted for degree transfer.
 */
export type EuropeMembership='EU'|'EEA (non-EU)'|'European non-EU';
export type EuropeanProfile={
 slug:string;country:string;flag:string;membership:EuropeMembership;
 localLanguages:string[];fields:string[];universityExamples:string[];
 languageNote:string;admissionsNote:string;commissionReference:string;
 priority:boolean;
};
type ProfileSeed=readonly [
 slug:string,country:string,flag:string,membership:EuropeMembership,
 languages:string,fields:string,universities:string,languageNote:string
];
const prioritySlugs=new Set(['austria','belgium','czechia','denmark','finland','france','germany','hungary','ireland','italy','malta','netherlands','poland','portugal','spain','sweden','norway','switzerland']);
const defaultAdmission='Admission depends on the precise degree, previous qualification, subject prerequisites, verified transcripts, deadlines and institutional evaluation. OTHM/Qualifi advanced standing is not guaranteed.';
const seeds:readonly ProfileSeed[]=[
 ['austria','Austria','🇦🇹','EU','German','Engineering|Business|Arts','University of Vienna|TU Wien','German-taught degrees may require documented German proficiency; confirm individual English-taught programme requirements.'],
 ['belgium','Belgium','🇧🇪','EU','Dutch|French|German','Business|Technology|Life sciences','KU Leuven|Ghent University','Teaching and proof of language depend on the Flemish, French-speaking or other institution and the specific degree.'],
 ['bulgaria','Bulgaria','🇧🇬','EU','Bulgarian','Medicine|Technology|Business','Sofia University St. Kliment Ohridski|Technical University of Sofia','Bulgarian and selected English-taught programmes may have different language exams and admissions requirements.'],
 ['croatia','Croatia','🇭🇷','EU','Croatian','Engineering|Tourism|Medicine','University of Zagreb|University of Split','Check whether the exact course is taught in Croatian or English and which proficiency assessment it accepts.'],
 ['cyprus','Cyprus','🇨🇾','EU','Greek|Turkish','Business|Health sciences|Technology','University of Cyprus|Cyprus University of Technology','Course language and evidence can differ by university and programme; verify accreditation and campus.'],
 ['czechia','Czechia','🇨🇿','EU','Czech','Medicine|Technology|Business','Charles University|Masaryk University','Public Czech-taught programmes and fee-paying foreign-language programmes differ; check current language and admissions tests.'],
 ['denmark','Denmark','🇩🇰','EU','Danish','Design|Technology|Life sciences','University of Copenhagen|Aarhus University','Most programmes follow the institution’s declared Danish or English proficiency requirements; check the exact study level.'],
 ['estonia','Estonia','🇪🇪','EU','Estonian','Digital technology|Business|Engineering','University of Tartu|Tallinn University of Technology','Confirm English-taught programmes and any required TOEFL, IELTS or institutional alternative.'],
 ['finland','Finland','🇫🇮','EU','Finnish|Swedish','Technology|Education|Business','University of Helsinki|Aalto University','Finnish, Swedish and English programmes have different admissions and language requirements; check university or UAS pathways.'],
 ['france','France','🇫🇷','EU','French','Engineering|Business|Arts','Sorbonne University|Université Paris-Saclay','French-taught courses may request DELF, DALF, TCF or other accepted proof; English-taught courses have their own thresholds.'],
 ['germany','Germany','🇩🇪','EU','German','Engineering|Business|Research','Technical University of Munich|University of Stuttgart','German-taught routes often expect TestDaF, DSH, telc or accepted Goethe evidence; English degrees vary.'],
 ['greece','Greece','🇬🇷','EU','Greek','Medicine|Classics|Business','National and Kapodistrian University of Athens|Aristotle University of Thessaloniki','Check Greek-language entry criteria and any verified English-taught courses individually.'],
 ['hungary','Hungary','🇭🇺','EU','Hungarian','Medicine|Dentistry|Engineering','Eötvös Loránd University|University of Debrecen','Confirm the English-medium course, accepted language evidence and any independent entrance assessment.'],
 ['ireland','Ireland','🇮🇪','EU','English|Irish','Technology|Business|Health','Trinity College Dublin|University College Dublin','English-medium admission commonly needs institution-approved proficiency evidence; individual component scores and waivers vary.'],
 ['italy','Italy','🇮🇹','EU','Italian','Architecture|Engineering|Design','University of Bologna|Politecnico di Milano','Italian degrees may require accepted Italian proficiency; English-taught courses and subject tests vary by institution.'],
 ['latvia','Latvia','🇱🇻','EU','Latvian','Technology|Medicine|Logistics','University of Latvia|Riga Technical University','Check English or Latvian course language, proof and any institution-specific interview or entrance assessment.'],
 ['lithuania','Lithuania','🇱🇹','EU','Lithuanian','Technology|Health|Business','Vilnius University|Kaunas University of Technology','English-language and Lithuanian-language options set their own proof, admission and subject requirements.'],
 ['luxembourg','Luxembourg','🇱🇺','EU','French|German|Luxembourgish','Finance|Law|Technology','University of Luxembourg|Luxembourg School of Business','Degrees can be bilingual or multilingual; check every required teaching language, including English where applicable.'],
 ['malta','Malta','🇲🇹','EU','English|Maltese','Business|Technology|Hospitality','University of Malta|Malta College of Arts, Science and Technology','Teaching and entrance-language standards differ between higher education and vocational providers; confirm formal recognition.'],
 ['netherlands','Netherlands','🇳🇱','EU','Dutch','Business|Engineering|Data science','University of Amsterdam|Delft University of Technology','English-taught programmes may accept IELTS/TOEFL/Cambridge alternatives; Dutch-language degrees require separate proof.'],
 ['poland','Poland','🇵🇱','EU','Polish','Medicine|Engineering|Business','University of Warsaw|Jagiellonian University','Check Polish or English teaching, qualification recognition and the specific institution’s language or interview rules.'],
 ['portugal','Portugal','🇵🇹','EU','Portuguese','Engineering|Tourism|Business','University of Lisbon|University of Porto','Portuguese programmes and English-medium options have distinct language, entry and recognition conditions.'],
 ['romania','Romania','🇷🇴','EU','Romanian','Medicine|IT|Engineering','University of Bucharest|Babeș-Bolyai University','Verify Romanian or other teaching language, foundation-language requirements and programme-specific admission tests.'],
 ['slovakia','Slovakia','🇸🇰','EU','Slovak','Engineering|Medicine|Business','Comenius University Bratislava|Slovak University of Technology','Check Slovak or English instruction, examination requirements, fee basis and recognised academic qualifications.'],
 ['slovenia','Slovenia','🇸🇮','EU','Slovene','Engineering|Business|Environmental sciences','University of Ljubljana|University of Maribor','Study language and accepted proficiency tests depend on the particular programme and degree level.'],
 ['spain','Spain','🇪🇸','EU','Spanish','Business|Engineering|Arts','University of Barcelona|Complutense University of Madrid','Spanish-medium programmes and English-taught options set different language and foreign-school-recognition requirements.'],
 ['sweden','Sweden','🇸🇪','EU','Swedish','Technology|Design|Life sciences','Lund University|KTH Royal Institute of Technology','Many international master’s programmes are English-taught; Swedish bachelor’s courses may require recognised Swedish evidence.'],
 ['iceland','Iceland','🇮🇸','EEA (non-EU)','Icelandic','Environmental science|Technology|Humanities','University of Iceland|Reykjavík University','English-language options and Icelandic-medium programmes must be checked individually.'],
 ['norway','Norway','🇳🇴','EEA (non-EU)','Norwegian','Engineering|Marine science|Technology','University of Oslo|Norwegian University of Science and Technology','English-taught programmes vary by level; Norwegian-taught programmes need institution-recognised Norwegian proficiency.'],
 ['switzerland','Switzerland','🇨🇭','European non-EU','German|French|Italian','Engineering|Finance|Hospitality','ETH Zurich|University of Geneva','Programme language depends on canton and institution; English-taught graduate routes vary and admissions are highly specific.'],
] as const;
export const europeanDestinations:EuropeanProfile[]=seeds.map(([slug,country,flag,membership,languages,fields,universities,languageNote])=>({
 slug,country,flag,membership,
 localLanguages:languages.split('|'),fields:fields.split('|'),universityExamples:universities.split('|'),
 languageNote,admissionsNote:defaultAdmission,
 commissionReference:'https://education.ec.europa.eu/study-in-europe/country-profiles',
 priority:prioritySlugs.has(slug),
}));
export const euMemberCountries=europeanDestinations.filter(x=>x.membership==='EU');
export const otherEuropeanCountries=europeanDestinations.filter(x=>x.membership!=='EU');
export function findEuropeanDestination(slug:string|undefined){
 return europeanDestinations.find(x=>x.slug===slug);
}
export const europePreparationStages=[
 {label:'Learn',description:'School and adult tuition, academic writing, English and German lessons, and subject-specific bridging.'},
 {label:'Train',description:'UK/international qualifications, technology and finance academies, supervised practical learning and professional exams where available.'},
 {label:'Prepare',description:'Qualification equivalence, recognised language tests, translated records, portfolios and authentic university applications.'},
 {label:'Progress',description:'Compare universities and individual recognition decisions; no automatic OTHM/Qualifi advanced entry or offer is implied.'},
 {label:'Settle & develop',description:'Plan accommodation, arrival essentials, career readiness, employer introductions and regulated immigration referrals.'},
] as const;
