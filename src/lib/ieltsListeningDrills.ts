/**
 * UniPathway original Listening micro-drills.
 * These scripts are not official IELTS recordings or band predictors.
 * Academic and General Training share the IELTS Listening test.
 */
export type ListeningChoice={value:string;label:string};
export type ListeningQuestion={id:string;question:string;choices:ListeningChoice[];correct:string;explanation:string};
export type ListeningScenario={
  id:string;title:string;context:string;instructions:string;spokenScript:string;questions:ListeningQuestion[];
};
export const LISTENING_SCENARIOS:ListeningScenario[]=[
  {
    id:'campus-event-01',title:'University orientation booking',context:'A student enquires about an orientation event.',
    instructions:'Read the questions first. Play the original, computer-spoken dialogue, then answer without looking at the transcript. Accent availability depends on the device.',
    spokenScript:[
      'Reception: Good morning, student services. How can I help?',
      'Student: Hello, I am calling about the orientation events. I was going to register for Monday, but I have a class then.',
      'Reception: The campus tour runs on Tuesday the fourteenth of April, starting at ten thirty in the morning.',
      'Student: Is that at the main library?',
      'Reception: We used to meet outside the library, but the meeting point has changed. Please come to the east entrance of the science building.',
      'Student: Is there a charge?',
      'Reception: No, it is included for enrolled students, although you need to book a place. We have twenty spaces left.',
      'Student: Shall I bring my passport?',
      'Reception: Just your student card and a water bottle. A passport is not needed.',
      'Student: Great. Can I register at reception?',
      'Reception: Yes, or through the student portal. Registrations close at five in the afternoon on Friday.',
      'Student: Thank you. I will book online now.'
    ].join(' '),
    questions:[
      {id:'l1',question:'On which day is the tour?',choices:[{value:'monday',label:'Monday'},{value:'tuesday',label:'Tuesday'},{value:'friday',label:'Friday'}],correct:'tuesday',explanation:'The student cannot attend Monday. The tour itself is Tuesday.'},
      {id:'l2',question:'At what time does the tour start?',choices:[{value:'09:30',label:'9:30 am'},{value:'10:30',label:'10:30 am'},{value:'11:30',label:'11:30 am'}],correct:'10:30',explanation:'The receptionist says ten thirty in the morning.'},
      {id:'l3',question:'Where should participants meet?',choices:[{value:'library',label:'Outside the main library'},{value:'science',label:'Science building east entrance'},{value:'cafe',label:'Student café'}],correct:'science',explanation:'The meeting point changed from the library to the science building’s east entrance.'},
      {id:'l4',question:'What is the event fee for enrolled students?',choices:[{value:'zero',label:'No additional fee'},{value:'five',label:'£5'},{value:'ten',label:'£10'}],correct:'zero',explanation:'The receptionist says it is included for enrolled students.'},
      {id:'l5',question:'Which identification is required?',choices:[{value:'passport',label:'Passport'},{value:'card',label:'Student card'},{value:'licence',label:'Driving licence'}],correct:'card',explanation:'The speaker says a student card, not a passport, is needed.'},
      {id:'l6',question:'When do bookings close?',choices:[{value:'friday5',label:'Friday 5 pm'},{value:'thursday5',label:'Thursday 5 pm'},{value:'monday5',label:'Monday 5 pm'}],correct:'friday5',explanation:'Registrations close at five in the afternoon on Friday.'},
    ],
  },
  {
    id:'community-transport-02',title:'Transport arrangements enquiry',context:'An applicant calls about a community workshop.',
    instructions:'Read the questions, then play the synthetic speech. Note corrections and times. This is original short practice, not an IELTS exam section.',
    spokenScript:[
      'Staff: Good afternoon, community learning centre.',
      'Applicant: Hello. I booked the Saturday career workshop. Could you help with the travel arrangements?',
      'Staff: Of course. The workshop was advertised at the town hall, but it has moved to the riverside training centre.',
      'Applicant: Is that near the train station?',
      'Staff: It is approximately a ten-minute walk from the station. The number eight bus stops directly outside.',
      'Applicant: I thought the workshop started at nine.',
      'Staff: It originally did. The revised start time is nine forty-five, and registration opens at nine twenty.',
      'Applicant: Will lunch be provided?',
      'Staff: Tea and water are available. Please bring your own lunch; there is also a café nearby.',
      'Applicant: Do I need to pay for the workshop?',
      'Staff: It is free if you registered before Wednesday. Late registrations cost twelve pounds.',
      'Applicant: I registered on Tuesday. What should I bring?',
      'Staff: Please bring a notebook and your booking confirmation on your phone.',
      'Applicant: Thank you very much.'
    ].join(' '),
    questions:[
      {id:'t1',question:'Where is the workshop now held?',choices:[{value:'hall',label:'Town hall'},{value:'riverside',label:'Riverside training centre'},{value:'station',label:'Railway station'}],correct:'riverside',explanation:'The venue changed from the town hall to the riverside training centre.'},
      {id:'t2',question:'Which bus stops directly outside?',choices:[{value:'8',label:'Number 8'},{value:'10',label:'Number 10'},{value:'12',label:'Number 12'}],correct:'8',explanation:'The number eight bus stops outside.'},
      {id:'t3',question:'What is the revised start time?',choices:[{value:'09:00',label:'9:00 am'},{value:'09:20',label:'9:20 am'},{value:'09:45',label:'9:45 am'}],correct:'09:45',explanation:'The workshop begins at nine forty-five; registration opens at nine twenty.'},
      {id:'t4',question:'What should students do for lunch?',choices:[{value:'bring',label:'Bring their own lunch'},{value:'provided',label:'Eat the provided meal'},{value:'skip',label:'Skip lunch'}],correct:'bring',explanation:'Tea and water are provided, but attendees must arrange lunch.'},
      {id:'t5',question:'How much must this applicant pay?',choices:[{value:'0',label:'Nothing'},{value:'12',label:'£12'},{value:'8',label:'£8'}],correct:'0',explanation:'The applicant registered Tuesday, before the Wednesday cut-off.'},
      {id:'t6',question:'What is needed at the workshop?',choices:[{value:'passport',label:'Passport and printed CV'},{value:'notebook',label:'Notebook and mobile booking confirmation'},{value:'camera',label:'Camera and headphones'}],correct:'notebook',explanation:'Staff request a notebook and the booking confirmation on a phone.'}
    ],
  },
];
export type ListeningResults={correct:number;total:number;percent:number;details:{id:string;answer:string;correct:string;isCorrect:boolean;explanation:string}[]};
export function gradeListening(scenario:ListeningScenario,answers:Record<string,string>):ListeningResults{
 const details=scenario.questions.map(q=>({
  id:q.id,answer:answers[q.id]??'',correct:q.correct,isCorrect:answers[q.id]===q.correct,explanation:q.explanation,
 }));
 const correct=details.filter(d=>d.isCorrect).length;
 return {correct,total:details.length,percent:Math.round(correct/details.length*100),details};
}
export function listeningSummary(scenario:ListeningScenario,result:ListeningResults,replays:number):string{
 const missed=result.details.filter(d=>!d.isCorrect).map(d=>d.id).join(', ')||'None';
 return [
  'Original UniPathway synthetic Listening micro-practice (NOT official IELTS)',
  'Scenario: '+scenario.id,
  'Practice accuracy: '+result.correct+'/'+result.total+' ('+result.percent+'%; not an IELTS band)',
  'Audio play requests: '+replays,
  'Questions to revisit: '+missed,
  'Listening development goal: recognise corrections and evidence without reading the transcript.'
 ].join('\n');
}
