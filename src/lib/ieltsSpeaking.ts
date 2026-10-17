/** Independent Speaking micro-practice, not the full IELTS interview or an official band score. */
export type SpeakingPart='part1'|'part2'|'part3';
export const SPEAKING_PROMPTS:{key:SpeakingPart;title:string;preparation:string;questions:string[];maxSeconds:number}[]=[
 {key:'part1',title:'Part 1 — Personal interview practice',preparation:'Try to answer naturally and extend each response with a reason or example.',questions:[
 'What subject or skill have you studied recently?',
 'Which part of studying do you find most enjoyable?',
 'Do you prefer to study alone or with other people? Why?'
 ],maxSeconds:150},
 {key:'part2',title:'Part 2 — Long turn practice',preparation:'Spend up to one minute preparing notes, then speak for one to two minutes.',questions:[
 'Describe an important skill you learned.',
 'Say when and where you learned it, what made it challenging, and why it is important to you.'
 ],maxSeconds:150},
 {key:'part3',title:'Part 3 — Discussion practice',preparation:'Build balanced ideas, explain reasons and give specific examples.',questions:[
 'How is technology changing the way adults learn?',
 'Should universities make practical work a larger part of degrees?',
 'What can societies do to help people keep learning throughout their careers?'
 ],maxSeconds:150}
];
export const SPEAKING_BAND_CATEGORIES=[
 {key:'fluency_band',label:'Fluency and coherence'},
 {key:'lexical_band',label:'Lexical resource'},
 {key:'grammar_band',label:'Grammatical range and accuracy'},
 {key:'pronunciation_band',label:'Pronunciation'},
] as const;
export type SpeakingBandField=typeof SPEAKING_BAND_CATEGORIES[number]['key'];
export type SpeakingBands=Record<SpeakingBandField,number|null>;
export const EMPTY_SPEAKING_BANDS:SpeakingBands={
 fluency_band:null,lexical_band:null,grammar_band:null,pronunciation_band:null,
};
export const SPEAKING_MIME_TYPES=['audio/webm','audio/mp4','audio/ogg'] as const;
export function supportedRecordingMime(candidate:string):candidate is typeof SPEAKING_MIME_TYPES[number]{
 return SPEAKING_MIME_TYPES.includes(candidate as typeof SPEAKING_MIME_TYPES[number]);
}
export function speakingRecordingExtension(mime:string):'webm'|'mp4'|'ogg'|null{
 if(mime==='audio/webm')return 'webm';
 if(mime==='audio/mp4')return 'mp4';
 if(mime==='audio/ogg')return 'ogg';
 return null;
}
export function completeSpeakingBands(ratings:SpeakingBands):number|null{
 const values=SPEAKING_BAND_CATEGORIES.map(c=>ratings[c.key]);
 if(values.some(v=>v===null))return null;
 if(values.some(v=>typeof v!=='number'||v<0||v>9||!Number.isInteger(v*2)))return null;
 // A formative criterion average only; NOT the IELTS overall band.
 return Math.round((values as number[]).reduce((a,b)=>a+b,0)/values.length*2)/2;
}
export function validateSpeakingBlob(blob:Blob,seconds:number):string|null{
 const mime=blob.type.split(';')[0];
 if(!supportedRecordingMime(mime))return 'This audio format is not supported. Record again using a supported browser.';
 if(blob.size<100)return 'The recording appears empty. Please try again.';
 if(blob.size>10*1024*1024)return 'The recording exceeds the 10 MB limit.';
 if(!Number.isFinite(seconds)||seconds<1||seconds>180)return 'Recording duration must be between 1 and 180 seconds.';
 return null;
}
