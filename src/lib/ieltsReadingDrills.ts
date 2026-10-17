/**
 * Original, unlicensed-in-the-sense-of-not-official, UniPathway IELTS reading micro-drills.
 * These are teaching exercises, not IELTS past papers or official band predictors.
 */
import type { IeltsTrack } from './ieltsCurriculum';

export type ReadingQuestion = {
 id: string; prompt: string;
 choices: {value:string; label:string}[];
 answer:string; explanation:string;
};
export type ReadingDrill = {
 id:string; track:IeltsTrack; title:string; level:string;
 passage:string[]; instructions:string;
 questions:ReadingQuestion[];
};
export type ReadingAnswer = Record<string,string>;
export type ReadingResult = {correct:number; total:number; percent:number; details:{id:string;answer:string;correctAnswer:string;isCorrect:boolean;explanation:string}[]};

const tfng = [
 {value:'true',label:'True'}, {value:'false',label:'False'}, {value:'not_given',label:'Not Given'},
];
export const IELTS_READING_DRILLS: Record<IeltsTrack,ReadingDrill> = {
 academic:{
  id:'academic-campus-water',track:'academic',title:'Campus water project',level:'Academic · original reading exercise',
  instructions:'Read the passage. Select one answer per question. For True/False/Not Given, decide whether the statement agrees with the passage, contradicts it, or is not mentioned. Suggested time: 12 minutes.',
  passage:[
   'In 2024, a university introduced a twelve-week trial to reduce water use in three residence halls. Staff fitted low-flow shower heads and displayed weekly water-consumption figures in communal kitchens. The programme began with a presentation explaining how water is treated and delivered to the campus.',
   'At the end of the trial, metered water consumption was 18% below the level recorded during the previous twelve weeks. However, the research team warned that the trial took place in a different season, and that the halls were not occupied by exactly the same number of residents. The figures therefore did not establish how much of the reduction was directly caused by the equipment or the awareness campaign.',
   'In an anonymous questionnaire, most respondents said they understood the purpose of the project. Some students reported taking shorter showers, while others said they had noticed no change in their routines. The university plans a longer trial across additional residences to compare results during similar periods of the year. It has not yet decided whether all campus buildings will receive the equipment.'
  ],
  questions:[
   {id:'a1',prompt:'How long did the initial project last?',choices:[{value:'six',label:'Six weeks'},{value:'twelve',label:'Twelve weeks'},{value:'twenty',label:'Twenty weeks'}],answer:'twelve',explanation:'The first paragraph states that it was a twelve-week trial.'},
   {id:'a2',prompt:'Which action was part of the project?',choices:[{value:'meter',label:'Installing low-flow shower heads'},{value:'fines',label:'Introducing student water fines'},{value:'closure',label:'Closing one residence hall'}],answer:'meter',explanation:'The project fitted low-flow shower heads and shared consumption figures.'},
   {id:'a3',prompt:'Statement: The measured water use was lower than in the preceding twelve weeks.',choices:tfng,answer:'true',explanation:'The text reports an 18% reduction relative to the previous twelve weeks.'},
   {id:'a4',prompt:'Statement: Researchers proved that low-flow showers alone caused the entire reduction.',choices:tfng,answer:'false',explanation:'The team explicitly said the trial could not establish how much was caused by the equipment or campaign.'},
   {id:'a5',prompt:'Statement: The questionnaire was completed by exactly 250 students.',choices:tfng,answer:'not_given',explanation:'The passage gives no questionnaire respondent count.'},
   {id:'a6',prompt:'Why will the university run a longer trial?',choices:[{value:'similar',label:'To compare similar seasons and more residences'},{value:'price',label:'To increase accommodation fees'},{value:'grade',label:'To measure student academic grades'}],answer:'similar',explanation:'The final paragraph states the longer trial will compare results in similar periods of the year.'},
  ]
 },
 general:{
  id:'general-community-centre',track:'general',title:'Community learning centre notice',level:'General Training · original reading exercise',
  instructions:'Read the public notice. Choose the answer supported by its wording. Suggested time: 12 minutes.',
  passage:[
   'CITY LEARNING CENTRE — INFORMATION FOR MEMBERS',
   'From 1 November, the centre will open from 9:00 am to 8:00 pm Monday to Friday and from 10:00 am to 5:00 pm on Saturdays. The building remains closed on Sundays while management reviews demand for additional opening hours.',
   'Members may book individual study rooms online for sessions of up to two hours. A booking can be made seven days in advance. If you will not attend, please cancel at least one hour before your reservation so someone else can use the room. Groups of four or more should request a classroom rather than an individual study room.',
   'Printing is available at a small charge at reception. The computers in the main study area remain free to use, although members are asked to bring their own headphones. Staff-led CV workshops take place on Wednesdays at 6:00 pm and must be booked in advance.',
   'Access to the building is included in the basic membership. Some workshops and printing services have separate charges. Please contact the office to ask about accessibility arrangements before your first visit.'
  ],
  questions:[
   {id:'g1',prompt:'At what time does the centre close on Fridays?',choices:[{value:'8',label:'8:00 pm'},{value:'5',label:'5:00 pm'},{value:'9',label:'9:00 pm'}],answer:'8',explanation:'The Monday–Friday hours end at 8:00 pm.'},
   {id:'g2',prompt:'How far ahead can an individual study room be booked?',choices:[{value:'1',label:'One day'},{value:'7',label:'Seven days'},{value:'14',label:'Fourteen days'}],answer:'7',explanation:'The notice allows bookings seven days in advance.'},
   {id:'g3',prompt:'Statement: Members can currently enter the centre on Sundays.',choices:tfng,answer:'false',explanation:'The building is closed on Sundays.'},
   {id:'g4',prompt:'Statement: Every Wednesday CV workshop is completely free.',choices:tfng,answer:'not_given',explanation:'The notice does not confirm whether this particular workshop has a charge.'},
   {id:'g5',prompt:'For whom is a classroom requested?',choices:[{value:'4',label:'Groups of four or more'},{value:'2',label:'Exactly two members'},{value:'alone',label:'Anyone studying alone'}],answer:'4',explanation:'Groups of four or more should request a classroom.'},
   {id:'g6',prompt:'Which service is free to use?',choices:[{value:'computer',label:'Computers in the main study area'},{value:'printing',label:'Printing at reception'},{value:'all',label:'All optional workshops'}],answer:'computer',explanation:'The notice explicitly says computers in the main study area remain free to use.'},
  ]
 }
};

export function gradeReadingDrill(drill:ReadingDrill,answers:ReadingAnswer):ReadingResult {
 const details=drill.questions.map(question=>{
   const answer=answers[question.id]||'';
   return {id:question.id,answer,correctAnswer:question.answer,isCorrect:answer===question.answer,explanation:question.explanation};
 });
 const correct=details.filter(x=>x.isCorrect).length;
 return {correct,total:drill.questions.length,percent:Math.round(100*correct/drill.questions.length),details};
}
export function readingAttemptSummary(drill:ReadingDrill,result:ReadingResult,elapsedSeconds:number):string {
 const missed=result.details.filter(d=>!d.isCorrect).map(d=>d.id);
 return [
  'Independent UniPathway Reading Micro-Drill (NOT official IELTS): '+drill.id,
  'Test type: '+(drill.track==='academic'?'Academic':'General Training'),
  'Practice score: '+result.correct+'/'+result.total+' ('+result.percent+'% correct; not a band score)',
  'Time taken: '+Math.max(0,Math.round(elapsedSeconds))+' seconds',
  'Questions to revisit: '+(missed.length?missed.join(', '):'None'),
  'Student reflection: I will review explanations and practise locating evidence in the text.'
 ].join('\n');
}
