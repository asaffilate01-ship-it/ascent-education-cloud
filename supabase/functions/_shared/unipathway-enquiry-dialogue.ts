/**
 * UniPathway Jhelum enrolment enquiry dialogue (no student-record lookups).
 * A structured state machine: supports English/Urdu, one question per turn, human takeover.
 * Prices, accreditation, staffing and individual places are deliberately never invented.
 */
export type Language = 'en' | 'ur';
export type EnquiryStep = 'language' | 'relationship' | 'programme' | 'board' |
  'grade' | 'subjects' | 'mode' | 'time' | 'consent' | 'phase2_interest' | 'complete';
export type EnquiryState = {
  step: EnquiryStep;
  language: Language;
  relationship?: 'student' | 'parent' | 'other';
  programme?: string;
  board?: string;
  grade?: string;
  subjects?: string;
  phase2Interest?: string;
  mode?: 'jhelum' | 'hybrid' | 'online';
  timePreference?: string;
  contactConsent?: boolean;
};
export type EnquiryTurn = { state: EnquiryState; reply: string; handoff?: boolean; complete?: boolean };
export const START: EnquiryState = {step:'language',language:'en'};
const en = {
 welcome:'Welcome to UniPathway Jhelum! Please select your language: 1 English / 2 اردو. Reply HUMAN anytime to speak to admissions.',
 relationship:'Are you enquiring as 1 Student, 2 Parent/guardian, or 3 Other?',
 programme:'Which programme? 1 Grades 9–12 school tuition (Sciences, Maths, English, Technology, Commerce) / 2 ACCA preparation / 3 IELTS preparation / 4 Technology certification preparation / 5 OTHM or Qualifi Business/Accountancy Levels 3–5 / 6 Phase 2 courses (Beauty & Aesthetics, Health & Social Care, Languages, Hospitality, Creative/Digital, Trades, other qualifications). Reply HUMAN for admissions.',
 board:'Which school board? 1 Punjab/Pakistan boards / 2 Cambridge IGCSE / 3 Other Pakistan board. Our staff will confirm exact syllabus availability.',
 grade:'Which grade: 9, 10, 11 or 12?',
 subjects:'Which subject(s) do you want: Maths, Physics, Chemistry, Biology, English, Computer/Technology, Commerce, or several? Please type the subjects.',
 mode:'Preferred study mode: 1 In-person at Jhelum / 2 Hybrid / 3 Online? In-person groups are planned for 10 or 20 learners; online cohorts may be 50+ depending on teaching capacity.',
 time:'Our planned Jhelum teaching hours are daily 8:00 AM–9:00 PM Pakistan time. Which days and time range suit you? Exact slots depend on tutor, level, room and availability.',
 consent:'May the admissions team contact you on WhatsApp about THIS enquiry and proposed classes? Reply YES or NO. This does not subscribe you to marketing messages.',
 done:'Thank you. Your course enquiry is recorded for admissions review. Staff will confirm fees, tutor, timetable, eligibility and actual seat availability. Nothing is booked or payable yet. Reply HUMAN if you need assistance.',
 invalid:'Please choose one of the listed options, or reply HUMAN for our admissions team.',
 phase2:'Which Phase 2 area interests you? 1 Beauty & Aesthetics / 2 Health & Social Care / 3 German and other languages / 4 Hospitality / 5 Creative and digital skills / 6 Trades, energy and vocational / 7 Other qualifications (OTHM, Qualifi, ATHE, Pearson, Punjab/Pakistan).',
 future:'Phase 2 launch (register interest only): Beauty & Aesthetics, Health & Social Care, additional languages, Hospitality, Creative/Digital, Trades, and further OTHM, Qualifi, ATHE, Pearson and Pakistan/Punjab vocational programmes. Exact courses, qualifications, facilities, approvals and dates will be confirmed before enrolment. Reply HUMAN and admissions can note your interest.',
 handoff:'I will refer this to our admissions team. Please do not send passwords, identity documents or bank details in this chat.',
 stop:'We will not send automated enquiry follow-ups. You can contact our team again whenever you need assistance.'
};
const ur = {
 welcome:'یونی پاتھ وے جہلم میں خوش آمدید! زبان منتخب کریں: 1 English / 2 اردو۔ عملے سے بات کے لیے HUMAN لکھیں۔',
 relationship:'آپ کون ہیں؟ 1 طالب علم، 2 والدین یا سرپرست، 3 دیگر',
 programme:'کون سا کورس؟ 1 جماعت 9 تا 12 (سائنس، ریاضی، انگریزی، ٹیکنالوجی، کامرس) / 2 ACCA تیاری / 3 IELTS تیاری / 4 ٹیک سرٹیفکیشن / 5 OTHM یا Qualifi بزنس/اکاؤنٹنگ لیول 3 تا 5 / 6 دوسرے مرحلے کے کورسز (بیوٹی و ایستھیٹکس، صحت و سماجی نگہداشت، زبانیں، ہوٹلنگ، ڈیزائن، ہنر و دیگر ڈپلومے)',
 board:'بورڈ منتخب کریں: 1 پنجاب/پاکستان بورڈ / 2 کیمبرج IGCSE / 3 دیگر پاکستانی بورڈ۔ نصاب کی دستیابی عملہ تصدیق کرے گا۔',
 grade:'آپ کس جماعت میں ہیں؟ 9، 10، 11 یا 12',
 subjects:'کون سے مضامین پڑھنا چاہتے ہیں؟ ریاضی، فزکس، کیمسٹری، بائیولوجی، انگریزی، کمپیوٹر/ٹیکنالوجی، کامرس، یا متعدد مضامین؟',
 mode:'کلاس کس طرح چاہیے؟ 1 جہلم میں بالمشافہ / 2 ہائبرڈ / 3 آن لائن۔ بالمشافہ کلاس میں 10 یا 20 اور آن لائن میں 50 یا زائد طلبہ کی منصوبہ بندی ہے، دستیابی کے مطابق۔',
 time:'جہلم میں مجوزہ اوقات روزانہ صبح 8 بجے سے رات 9 بجے تک (پاکستان وقت) ہیں۔ آپ کو کون سے دن اور اوقات مناسب ہیں؟ حتمی ٹائم ٹیبل استاد اور دستیابی کے مطابق ہوگا۔',
 consent:'کیا داخلہ ٹیم آپ سے اسی انکوائری اور کلاس کی معلومات کے لیے واٹس ایپ پر رابطہ کر سکتی ہے؟ YES یا NO لکھیں۔ یہ مارکیٹنگ کی اجازت نہیں ہے۔',
 done:'شکریہ! آپ کی انکوائری داخلہ ٹیم کے جائزے کے لیے محفوظ ہے۔ فیس، استاد، ٹائم ٹیبل، اہلیت اور نشست کی دستیابی کی تصدیق عملہ کرے گا۔ ابھی کوئی داخلہ یا ادائیگی طے نہیں ہوئی۔',
 invalid:'براہ کرم درست نمبر یا HUMAN لکھیں۔',
 phase2:'دوسرے مرحلے میں کیا دلچسپی ہے؟ 1 بیوٹی و ایستھیٹکس / 2 صحت و سماجی نگہداشت / 3 جرمن اور دوسری زبانیں / 4 ہوٹلنگ / 5 ڈیزائن اور ڈیجیٹل مہارتیں / 6 ٹریڈز اور فنی تربیت / 7 دوسرے ڈپلومے (OTHM، Qualifi، ATHE، Pearson، پنجاب/پاکستان)',
 future:'دوسرا مرحلہ (فی الحال صرف دلچسپی درج کروائیں): بیوٹی اور ایستھیٹکس، صحت و سماجی نگہداشت، اضافی زبانیں، ہوٹلنگ، ڈیزائن و ڈیجیٹل مہارتیں، فنی تربیت، مزید OTHM، Qualifi، ATHE، Pearson اور پاکستان/پنجاب کے ووکیشنل کورسز۔ کورس کی دستیابی، منظوری اور تاریخ بعد میں تصدیق ہوگی۔ HUMAN لکھ کر داخلہ ٹیم سے بات کریں۔',
 handoff:'آپ کی درخواست داخلہ ٹیم کو بھیج دی جائے گی۔ یہاں پاس ورڈ، شناختی دستاویزات یا بینک کی تفصیلات نہ بھیجیں۔',
 stop:'اس انکوائری کی خودکار یاد دہانیاں نہیں بھیجی جائیں گی۔ ضرورت پر دوبارہ رابطہ کر سکتے ہیں۔'
};
const dictionary = (l: Language) => l==='ur'?ur:en;
function option(text: string, values: string[]): number {
 const normalized=text.normalize('NFKC').trim().toLowerCase();
 const digit=normalized.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
 const i=values.findIndex(v=>v.toLowerCase()===digit);
 return i<0?-1:i;
}
const unsafe=/(password|otp|bank account|card number|refund|abuse|bully|emergency|safeguard|medical|patient|attendance|grades|my fee|my child|میرے بچے|میرے نمبر|شناختی کارڈ)/i;
export function enquiryTurn(current: EnquiryState | null, input: string): EnquiryTurn {
 const text=input.trim().slice(0,1000);
 const s:EnquiryState=current && typeof current === 'object' && current.step ? {...current} : {...START};
 const d=dictionary(s.language);
 if (/^(human|staff|agent|representative|person|انسان|عملہ)$/i.test(text) || unsafe.test(text))
   return {state:s,reply:d.handoff,handoff:true};
 if (/^(stop|unsubscribe|opt.?out|بند)$/i.test(text))return {state:{...s,contactConsent:false},reply:d.stop,handoff:true};
 if (!text || /^(hi|hello|salam|salaam|assalam|start|سلام|السلام)$/i.test(text) && s.step==='language')
   return {state:s,reply:d.welcome};
 if (s.step==='complete')return {state:s,reply:d.done,handoff:true,complete:true};
 if (s.step==='language'){
   const i=option(text,['1','2','english','urdu','اردو']);
   if(i<0)return {state:s,reply:d.welcome};
   const language:Language=i===1||i===3||i===4?'ur':'en';
   const next={...s,language,step:'relationship' as const};
   return {state:next,reply:dictionary(language).relationship};
 }
 if(s.step==='relationship'){
   const i=option(text,['1','2','3','student','parent','guardian','other','طالب علم','والدین']);
   if(i<0)return {state:s,reply:d.invalid+' '+d.relationship};
   const relationship=i===0||i===3||i===7?'student':i===1||i===4||i===5||i===8?'parent':'other';
   return {state:{...s,relationship,step:'programme'},reply:d.programme};
 }
 if(s.step==='programme'){
   const i=option(text,['1','2','3','4','5','6']);
   if(i<0)return {state:s,reply:d.invalid+' '+d.programme};
   const programme=['school_tuition','acca_prep','ielts_prep','tech_cert_prep','business_accountancy_l3_l5','future_interest'][i];
   if(i===5)return {state:{...s,programme,step:'phase2_interest'},reply:d.phase2};
   return i===0?{state:{...s,programme,step:'board'},reply:d.board}
     :{state:{...s,programme,step:'mode'},reply:d.mode};
 }
 if(s.step==='phase2_interest'){
   const i=option(text,['1','2','3','4','5','6','7']);
   if(i<0)return {state:s,reply:d.invalid+' '+d.phase2};
   const phase2Interest=['beauty_aesthetics','health_social_care','additional_languages','hospitality','creative_digital','trades_vocational','additional_qualifications'][i];
   return {state:{...s,phase2Interest,step:'complete'},reply:d.future,handoff:true,complete:true};
 }
 if(s.step==='board'){
   const i=option(text,['1','2','3']);
   if(i<0)return {state:s,reply:d.invalid+' '+d.board};
   const board=['pakistan_punjab','cambridge_igcse','other_pakistan'][i];
   return {state:{...s,board,step:'grade'},reply:d.grade};
 }
 if(s.step==='grade'){
   if(!/^(9|10|11|12)$/.test(text))return {state:s,reply:d.invalid+' '+d.grade};
   return {state:{...s,grade:text,step:'subjects'},reply:d.subjects};
 }
 if(s.step==='subjects'){
   if(text.length<2 || text.length>250)return {state:s,reply:d.invalid+' '+d.subjects};
   return {state:{...s,subjects:text,step:'mode'},reply:d.mode};
 }
 if(s.step==='mode'){
   const i=option(text,['1','2','3']);
   if(i<0)return {state:s,reply:d.invalid+' '+d.mode};
   return {state:{...s,mode:['jhelum','hybrid','online'][i] as EnquiryState['mode'],step:'time'},reply:d.time};
 }
 if(s.step==='time'){
   if(text.length<2||text.length>200)return {state:s,reply:d.invalid+' '+d.time};
   return {state:{...s,timePreference:text,step:'consent'},reply:d.consent};
 }
 if(s.step==='consent'){
   if(!/^(yes|no|y|n|جی|ہاں|نہیں)$/i.test(text))return {state:s,reply:d.invalid+' '+d.consent};
   const contactConsent=/^(yes|y|جی|ہاں)$/i.test(text);
   return {state:{...s,contactConsent,step:'complete'},reply:d.done,complete:true};
 }
 return {state:s,reply:d.handoff,handoff:true};
}
