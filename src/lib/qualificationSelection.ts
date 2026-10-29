/** Official qualification titles selected for UniPathway's planned catalogue.
 * Titles originate from the awarding bodies' published directories; NOT a list
 * of programmes for which the centre has already received delivery permission.
 */
import {pearsonFineArtQualifications, pearsonFineArtSource} from './pearsonFineArt';
export type AwardingBody = 'OTHM' | 'Qualifi' | 'Pearson BTEC';
export type QualificationOption = { body: AwardingBody; category: string; name: string; level: number; source: string;
  curriculum?: {
    qualificationNumber: string; credits: number; creditNote: string;
    modules: {code: string; title: string; level: number; units: {code: string; title: string; credits: number}[]}[];
    craftFocus: string[];
  };
};
const othm = 'https://othm.org.uk/qualification';
const qualifi = 'https://qualifi.net/qualifications/';
const options: QualificationOption[] = [];
function add(body: Exclude<AwardingBody, 'Pearson BTEC'>, category: string, titles: [number, string][]) {
  const source = body === 'OTHM' ? othm : qualifi;
  for (const [level, name] of titles) options.push({body,category,name,level,source});
}
add('OTHM','Business',[
  [3,'Level 3 Diploma in Business Studies'],[4,'Level 4 Diploma in Business Management'],
  [5,'Level 5 Diploma in Business Management'],[5,'Level 5 Extended Diploma in Business Management'],
  [6,'Level 6 Diploma in Business Management'],
]);
add('OTHM','Accounting & Finance',[
  [3,'Level 3 Foundation Diploma in Accountancy'],
  [4,'Level 4 Diploma in Accounting and Business'],
  [5,'Level 5 Diploma in Accounting and Business'],
  [5,'Level 5 Extended Diploma in Accounting and Business'],
]);
add('OTHM','Technology & Cyber Security',[
  [3,'Level 3 Foundation Diploma in Information Technology'],
  [4,'Level 4 Diploma in Information Technology'],[5,'Level 5 Diploma in Information Technology'],
  [5,'Level 5 Extended Diploma in Information Technology'],
  [4,'Level 4 Diploma in Cyber Security'],[5,'Level 5 Diploma in Cyber Security'],
]);
add('OTHM','Health & Education',[
  [3,'Level 3 Foundation Diploma in Health and Social Care'],
  [4,'Level 4 Diploma in Health and Social Care Management'],
  [5,'Level 5 Diploma in Health and Social Care Management'],
  [4,'Level 4 Diploma in Early Childhood Education'],[5,'Level 5 Diploma in Early Childhood Education'],
]);
add('OTHM','Law, Logistics & Hospitality',[
  [3,'Level 3 Diploma in Law'],[4,'Level 4 Diploma in Law'],
  [5,'Level 5 Diploma in Law'],[4,'Level 4 Diploma in Logistics and Supply Chain Management'],
  [5,'Level 5 Diploma in Logistics and Supply Chain Management'],
  [4,'Level 4 Diploma in Tourism and Hospitality Management'],
  [5,'Level 5 Diploma in Tourism and Hospitality Management'],
  [4,'Level 4 Diploma in Project Management'],[5,'Level 5 Diploma in Project Management'],
]);
add('Qualifi','Business',[
  [3,'Level 3 Diploma in Business Management'],
  [4,'Level 4 Diploma in Business Management'],[5,'Level 5 Diploma in Business Management'],
  [5,'Level 5 Extended Diploma in Business Management'],
]);
add('Qualifi','Accounting & Finance',[
  [3,'Level 3 Diploma in Accounting and Finance'],
  [4,'Level 4 Diploma in Accounting and Finance'],
  [5,'Level 5 Diploma in Accounting and Finance'],
  [5,'Level 5 Extended Diploma in Accounting and Finance'],
]);
add('Qualifi','Technology & Cyber Security',[
  [3,'Level 3 Diploma in Information Technology'],
  [4,'Level 4 Diploma in Information Technology'],
  [5,'Level 5 Diploma in Information Technology'],
  [4,'Level 4 Diploma in Artificial Intelligence'],[5,'Level 5 Diploma in Artificial Intelligence'],
  [3,'Level 3 Diploma in Cyber Security Management and Operations'],
  [4,'Level 4 Diploma in Cyber Security'],[5,'Level 5 Diploma in Cyber Security'],
]);
add('Qualifi','Health & Education',[
  [3,'Level 3 Diploma in Health and Social Care'],
  [4,'Level 4 Diploma in Health and Social Care'],
  [5,'Level 5 Diploma in Health and Social Care'],
  [4,'Level 4 Diploma in Early Learning and Childcare'],
  [5,'Level 5 Diploma in Early Learning and Childcare'],
]);
add('Qualifi','Law, Logistics & Hospitality',[
  [3,'Level 3 Diploma in Law'],[4,'Level 4 Diploma in Law'],
  [5,'Level 5 Diploma in Law'],
  [3,'Level 3 Diploma in Hospitality and Tourism Management'],
  [4,'Level 4 Diploma in Hospitality and Tourism Management'],
  [5,'Level 5 Diploma in Hospitality and Tourism Management'],
]);
options.push(...pearsonFineArtQualifications);
export const qualificationSelection = options;
export const officialAwardingBodies: Record<AwardingBody,{url:string;label:string}> = {
  'Pearson BTEC': {url:pearsonFineArtSource,label:'Pearson Fine Art qualification and specification'},
  OTHM: {url:othm,label:'OTHM official qualification directory'},
  Qualifi: {url:qualifi,label:'Qualifi regulated qualification directory'},
};
