import type {QualificationOption} from './qualificationSelection';

export const pearsonFineArtSource = 'https://qualifications.pearson.com/en/qualifications/btec-higher-nationals/fine-art-2023.html';
export const pearsonFineArtSpecification = 'https://qualifications.pearson.com/content/dam/pdf/BTEC-Higher-Nationals/Fine-Art/2023/specification-and-sample-assessments/9781292720579-hn-fineart-spec.pdf';
// Verified against Pearson Fine Art specification Issue 3 (August 2026),
// sections 6.1–6.2, and the linked creative-suite module descriptors, Fine Art section.
const level4 = {
  code:'A',title:'Process & Practice',level:4,
  units:[{code:'A1',title:'Concept & Development',credits:85},{code:'A2',title:'Creative Project',credits:35}],
};
const level5 = {
  code:'B',title:'Professional Creative Practice',level:5,
  units:[{code:'B1',title:'Personal Professional Development',credits:45},{code:'B2',title:'Professional Project',credits:75}],
};
export const pearsonFineArtQualifications: QualificationOption[] = [
  {
    body:'Pearson BTEC',category:'Fine Art & Craft',level:4,
    name:'Level 4 Higher National Certificate in Fine Art',source:pearsonFineArtSource,
    curriculum:{qualificationNumber:'610/1794/2',credits:120,creditNote:'120 credits at Level 4.',modules:[level4],
      craftFocus:['Clay and ceramic form','Textile surfaces and stitch','Printmaking experiments','Sculptural objects and mixed materials']},
  },
  {
    body:'Pearson BTEC',category:'Fine Art & Craft',level:5,
    name:'Level 5 Higher National Diploma in Fine Art',source:pearsonFineArtSource,
    curriculum:{qualificationNumber:'610/1795/4',credits:240,creditNote:'240 credits overall: 120 at Level 4 plus 120 at Level 5. The HND includes the Level 4 stage.',modules:[level4,level5],
      craftFocus:['A sustained ceramics or textile practice','Sculpture and mixed-media development','Print-based portfolio work','Professional presentation of a craft-led project']},
  },
];
