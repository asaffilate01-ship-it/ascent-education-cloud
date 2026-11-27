export const internationalAdviceTopics=[
 {id:'career',title:'Career and study counselling',detail:'Discuss your academic background, subject interests, goals and realistic study pathways.',subject:'University Progression',message:'I would like guidance on choosing a suitable academic and career pathway.'},
 {id:'applications',title:'University application preparation',detail:'Get help understanding entry criteria, application steps, references and document checklists.',subject:'Admissions Enquiry',message:'I would like guidance on preparing a university application and its required documents.'},
 {id:'funding',title:'Scholarships and study costs',detail:'Explore published scholarship criteria, tuition costs and realistic funding options.',subject:'Fee Information',message:'I would like guidance on study costs and scholarship research.'},
 {id:'student-visa',title:'Student visa information and referrals',detail:'Find official student visa guidance and discuss referral to an appropriately authorised adviser where required.',subject:'University Progression',message:'I would like official student visa information and, if appropriate, a referral to a qualified adviser.'},
 {id:'post-study',title:'Post-study work information',detail:'Research graduate work and training routes after eligible studies, including country-specific course and residence requirements.',subject:'University Progression',message:'I would like information about post-study work options and an appropriate referral where required.'},
 {id:'work-visa',title:'Work and skilled migration information',detail:'Explore official employment, sponsorship, skilled worker and business migration categories; individual eligibility requires a qualified adviser.',subject:'Other',message:'I would like official work visa and longer-term employment route information, and an appropriate adviser referral if needed.'},
 {id:'family-visa',title:'Marriage, spouse and family visa information',detail:'Research partner, spouse, fiancé(e), marriage and family reunification categories, and discuss referrals to authorised advisers.',subject:'Other',message:'I would like official information about marriage, spouse or family immigration routes and an appropriate adviser referral if needed.'},
 {id:'visit-visa',title:'Visitor and business travel information',detail:'Find official visitor, short-stay business and transit requirements for your intended destination.',subject:'Other',message:'I would like general visitor or short-stay business visa information and an appropriate adviser referral if needed.'},
 {id:'arrival',title:'Accommodation and arrival preparation',detail:'Plan housing research, travel preparation, arrival essentials and student support.',subject:'University Progression',message:'I would like guidance on accommodation research and preparing to arrive at my study destination.'},
] as const;
export type InternationalAdviceId=typeof internationalAdviceTopics[number]['id'];
export function internationalAdvicePrefill(params:URLSearchParams){
 const topic=internationalAdviceTopics.find(item=>item.id===params.get('advice'));
 if(!topic)return null;
 return {title:topic.title,subject:topic.subject,message:topic.message+' Please explain the available support, any fees and the next steps.'};
}
export function internationalAdviceUrl(id:InternationalAdviceId){
 return '/contact?'+new URLSearchParams({advice:id}).toString()+'#contact-form';
}
