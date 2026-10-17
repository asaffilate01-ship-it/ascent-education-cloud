/**
 * UniPathway's original, independent IELTS teaching plan.
 * This is preparation content, not official IELTS examination content.
 */
export type IeltsTrack = 'academic' | 'general';
export type IeltsSkill = 'listening' | 'reading' | 'writing' | 'speaking' | 'diagnostic' | 'mock';
export type IeltsUnit = {
  week: number;
  title: string;
  focus: string;
  skill: IeltsSkill;
  minutes: number;
  learningObjectives: string[];
  teachingNotes: string;
  practiceAcademic: string;
  practiceGeneral: string;
  teacherChecklist: string[];
};
export const IELTS_SKILLS = [
  {key:'listening',label:'Listening',time:'Approximately 30 minutes',format:'4 parts · 40 questions'},
  {key:'reading',label:'Reading',time:'60 minutes',format:'3 sections · 40 questions'},
  {key:'writing',label:'Writing',time:'60 minutes',format:'2 tasks, with Task 2 weighted more'},
  {key:'speaking',label:'Speaking',time:'11–14 minutes',format:'3-part interview'},
] as const;
export const IELTS_UNITS: IeltsUnit[] = [
  {
    week:1,title:'Diagnostic & goal setting',focus:'Baseline reading, listening, vocabulary and sentence accuracy',skill:'diagnostic',minutes:45,
    learningObjectives:['Identify Academic or General Training test','Set a realistic target and exam date','Recognise strengths and weak skills'],
    teachingNotes:'Begin with a short tutor-led diagnostic using authorised practice questions. Discuss previous English learning, reasons for testing and the receiving institution’s minimum band requirements. Use separate evidence for each of the four skills; an overall band is not a substitute for minimum component scores.',
    practiceAcademic:'Write 120–150 words explaining why you want to study at university and which academic English skills you need to improve. This is an original diagnostic reflection, not an IELTS writing paper.',
    practiceGeneral:'Write 120–150 words describing an English-language situation you might encounter at work or when moving overseas. This is an original diagnostic reflection, not an IELTS writing paper.',
    teacherChecklist:['Confirm exact test type and destination requirements','Discuss realistic target band','Record priority skills and next tutorial'],
  },
  {
    week:2,title:'Listening — prediction and detail',focus:'Names, numbers, maps, directions and note completion',skill:'listening',minutes:30,
    learningObjectives:['Predict answer type before listening','Follow paraphrase, spelling and corrections','Practise a recording heard once'],
    teachingNotes:'Teach students to examine instructions before the audio and recognise distractors, for example when a speaker corrects a date. Use teacher-owned audio or a link to an official practice test. Do not reproduce copyrighted IELTS recordings in the LMS without a licence.',
    practiceAcademic:'Before using an authorised listening recording, predict which answers in a campus accommodation enquiry might be a date, price, address or person’s name. After listening once, list three details you found difficult and why.',
    practiceGeneral:'Before using an authorised listening recording, predict which answers in a transport booking enquiry might be a date, price, address or person’s name. After listening once, list three details you found difficult and why.',
    teacherChecklist:['Play an authorised or teacher-created recording once','Check spelling and word limits','Review errors against the recording'],
  },
  {
    week:3,title:'Reading — speed with accuracy',focus:'Skimming, scanning, claims, headings and paraphrasing',skill:'reading',minutes:60,
    learningObjectives:['Find a passage’s main idea quickly','Locate evidence rather than relying on general knowledge','Distinguish false statements from information not given'],
    teachingNotes:'Model skimming for structure, scanning for evidence and careful reading of the sentence around an answer. Academic and General Training have different reading materials and score conversions. Do not use a universal practice-score-to-band table.',
    practiceAcademic:'Original mini passage: A university library trial extended weekend hours for twelve weeks. Visits rose by 18%, but borrowing was nearly unchanged. Surveys suggested that many visitors came to study in quiet spaces rather than take books home. Task: Explain the main finding; identify two pieces of evidence; state what is NOT established about student exam results.',
    practiceGeneral:'Original mini notice: The City Learning Centre now closes at 8 pm on weekdays but at 5 pm on Saturdays. Members may reserve rooms online for up to two hours. Sunday opening is being reviewed but has not been confirmed. Task: State the weekday closing time, room reservation limit and whether Sunday opening is confirmed.',
    teacherChecklist:['Ask learner to cite the exact source line','Separate False from Not Given','Review timing and skipped questions'],
  },
  {
    week:4,title:'Writing Task 1',focus:'Academic visual summaries or General Training letters',skill:'writing',minutes:20,
    learningObjectives:['Understand Task 1 marking criteria','Organise a clear response','Avoid unsupported claims'],
    teachingNotes:'Academic Task 1 uses data, diagrams or processes; General Training Task 1 requires a letter. Teach an overview for Academic and an appropriate tone/purpose for General Training. Aim for at least 150 words; use the current official band descriptors when giving feedback.',
    practiceAcademic:'Original chart data: A college enrolled 240 online learners in 2023, 310 in 2024 and 375 in 2025; on-campus enrolment was 220, 235 and 230 respectively. Write at least 150 words summarising the main trends and significant comparisons. Spend about 20 minutes.',
    practiceGeneral:'You recently attended a professional training course. Write a letter to the course organiser thanking them, describing one helpful part of the course, and suggesting one improvement. Write at least 150 words. Spend about 20 minutes.',
    teacherChecklist:['Check task achievement or task response','Assess coherence, vocabulary and grammar','Give specific evidence-based next actions'],
  },
  {
    week:5,title:'Writing Task 2',focus:'Argument structure, examples, coherence and editing',skill:'writing',minutes:40,
    learningObjectives:['Plan a clear position before writing','Develop supported paragraphs','Proofread grammar and cohesion'],
    teachingNotes:'Teach the four writing criteria and practise a timed minimum-250-word essay. Task 2 carries twice the weight of Task 1 in IELTS Writing. Use published criteria and human tutor judgement; never present automated comments as an official score.',
    practiceAcademic:'Some universities are increasing the number of courses that students can complete online. Do the advantages of this development outweigh the disadvantages? Explain your view and use examples. Write at least 250 words in about 40 minutes.',
    practiceGeneral:'Some people believe local communities should provide more opportunities for adults to learn new skills. Others think learning should be an individual responsibility. Discuss both views and give your opinion. Write at least 250 words in about 40 minutes.',
    teacherChecklist:['Evaluate response to every part of the question','Review paragraph development and examples','Record a formative estimated practice band only when evidence supports it'],
  },
  {
    week:6,title:'Speaking — fluency and interaction',focus:'Part 1 interview, Part 2 long turn and Part 3 discussion',skill:'speaking',minutes:14,
    learningObjectives:['Extend answers naturally without memorising scripts','Use a one-minute preparation period effectively','Develop ideas and respond to follow-up questions'],
    teachingNotes:'Run a live interview or use a consented recording and assess fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation. Typed text cannot establish a Speaking band. If no audio or live observation is available, record coaching notes only.',
    practiceAcademic:'Original speaking prompts: Part 1 — Describe your current studies. Part 2 — Talk for up to two minutes about a skill you learned and why it matters. Part 3 — How should universities balance independent study and practical teaching? Record a brief reflection on what the tutor advised.',
    practiceGeneral:'Original speaking prompts: Part 1 — Describe where you live. Part 2 — Talk for up to two minutes about a journey that taught you something. Part 3 — What makes public transport useful to a community? Record a brief reflection on what the tutor advised.',
    teacherChecklist:['Conduct an actual speaking interview','Assess all four official speaking criteria','Assign an individual pronunciation and fluency exercise'],
  },
  {
    week:7,title:'Timed practice and error review',focus:'Section timing and examination techniques',skill:'mock',minutes:60,
    learningObjectives:['Practise under realistic time limits','Classify errors by question type','Build a targeted revision plan'],
    teachingNotes:'Use official publicly accessible practice tests by link, licensed materials or original tutor-written tasks. This week’s LMS response is a reflection, not a scored full mock examination. When using a real full mock, retain separate Listening, Reading, Writing and Speaking records.',
    practiceAcademic:'Complete an authorised Academic Reading practice paper under the published time limit. Record your raw correct-answer count and analyse five mistakes. Do not infer an official band from this reflection.',
    practiceGeneral:'Complete an authorised General Training Reading practice paper under the published time limit. Record your raw correct-answer count and analyse five mistakes. Do not infer an official band from this reflection.',
    teacherChecklist:['Check exam-specific timing','Compare errors with previous work','Prioritise weakest skill for final week'],
  },
  {
    week:8,title:'Final readiness & next steps',focus:'Tutor review, application requirements and exam-day planning',skill:'mock',minutes:45,
    learningObjectives:['Compare improvement against the diagnostic','Confirm the correct IELTS product and booking channel','Plan the remaining study before the official exam'],
    teachingNotes:'Review progress across the four components and institutional requirements. Provide a written readiness recommendation without promising a target band. Direct students to an authorised IELTS provider for official booking and test-day requirements.',
    practiceAcademic:'Write a final readiness reflection: your target and required minimum component bands, strongest and weakest skills, next three study actions, and the official exam format you will book.',
    practiceGeneral:'Write a final readiness reflection: your intended test purpose, target component scores, strongest and weakest skills, and the official booking provider you will use.',
    teacherChecklist:['Check minimum component scores for desired progression','Set further lessons where required','Explain that practice assessments are not official IELTS results'],
  },
];
export const IELTS_OFFICIAL_RESOURCES = [
 {label:'IELTS Academic sample questions',url:'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test'},
 {label:'British Council Academic practice',url:'https://takeielts.britishcouncil.org/en-gb/prepare/ielts-free-practice-mock-tests/academic'},
 {label:'British Council General Training practice',url:'https://takeielts.britishcouncil.org/en-gb/prepare/ielts-free-practice-mock-tests/general-training'},
 {label:'How IELTS is assessed',url:'https://takeielts.britishcouncil.org/results/how-is-ielts-assessed'},
];
export const isIeltsTrack = (value: unknown): value is IeltsTrack => value === 'academic' || value === 'general';
export const unitPrompt = (unit: IeltsUnit, track: IeltsTrack) => track === 'academic' ? unit.practiceAcademic : unit.practiceGeneral;
