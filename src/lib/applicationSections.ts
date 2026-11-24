export type ApplicationKind='student'|'lecturer';
export type ApplicationSection={id:string;title:string;description:string;fields:readonly string[]};
const contact:ApplicationSection={id:'contact',title:'Personal & contact',description:'Your name and contact details.',fields:['Full legal name','Email','Phone','WhatsApp','Location / address']};
const delivery:ApplicationSection={id:'delivery',title:'Delivery & equipment',description:'Where you will study or teach, and your equipment.',fields:['Study or teaching mode (online / classroom / both)','Internet provision and reliability','Laptop or computer access','Classroom travel arrangements']};
const availability:ApplicationSection={id:'availability',title:'Weekly availability',description:'Tell us when you are available.',fields:[]};
export const applicationSections:Record<ApplicationKind,readonly ApplicationSection[]>={
 lecturer:[contact,{id:'academic',title:'Qualifications & experience',description:'Your academic background and teaching experience.',fields:['Education and qualifications','Teaching and industry experience','English fluency and other languages','Technology and teaching skills','Reference name and contact']},{id:'competencies',title:'Subjects & levels',description:'Record each teaching subject separately.',fields:['Subjects and levels','Maximum level per subject']},delivery,{...availability,fields:['Maximum weekly teaching hours','Expected hourly or session rate','Other employment commitments','Earliest start date']},{id:'review',title:'Review & submit',description:'Check your information before screening.',fields:[]}],
 student:[{...contact,fields:[...contact.fields,'Date of birth / age']},{id:'guardian',title:'Guardian & emergency',description:'Responsible adult details, where applicable.',fields:['Responsible parent or guardian (if applicable)','Guardian phone and WhatsApp','Guardian email','Emergency contact']},{id:'academic',title:'Education & goals',description:'Current learning, qualifications and study plans.',fields:['Current or last school / college','Current grade / year and board','Previous qualifications and results','Programme type (tuition, IELTS, ACCA, technology, levels 2–6, other)','Subjects and levels','Subject strengths','Subject weaknesses','Target results','Future study or career plans','Reference name and contact']},{...delivery,fields:[...delivery.fields,'Classroom laptop: own or centre provided']},availability,{id:'review',title:'Review & submit',description:'Check your information before screening.',fields:[]}]
};
export const competencyFields=['Subject','Curriculum / awarding body','Maximum level / grade','Relevant qualification or experience'] as const;
export const applicationDays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const;
export function competencyKey(slot:number,field:string){return 'Competency '+slot+' — '+field;}
export function hasCompetency(answers:Record<string,string>,slot:number){return competencyFields.some(f=>!!answers[competencyKey(slot,f)]?.trim());}
export function applicationValidation(kind:ApplicationKind,answers:Record<string,string>){
 if(!answers['Full legal name']?.trim()||!answers.Email?.trim())return {section:'contact',message:'Enter your full legal name and email before submitting.'};
 if(kind==='lecturer'&&Array.from({length:20},(_,i)=>i+1).some(slot=>hasCompetency(answers,slot)&&competencyFields.slice(0,3).some(f=>!answers[competencyKey(slot,f)]?.trim())))return {section:'competencies',message:'For each declared subject, enter the subject, awarding body or framework, and maximum level.'};
 return null;
}
export function applicationHasChanges(answers:Record<string,string>,saved:Record<string,string>){
 const keys=new Set([...Object.keys(answers),...Object.keys(saved)]);
 return [...keys].some(key=>(answers[key]||'')!==(saved[key]||''));
}
export function applicationSectionAnswers(section:ApplicationSection,answers:Record<string,string>){
 return Object.entries(answers).filter(([key,value])=>typeof value==='string'&&value.trim()&&!key.endsWith(' — added')&&(section.fields.includes(key)||(section.id==='competencies'&&/^Competency (?:[1-9]|1[0-9]|20) — /.test(key))||(section.id==='availability'&&(key==='Availability timezone'||(applicationDays as readonly string[]).includes(key)))));
}
