export type StudySource = { label: string; url: `https://${string}` };
export type StudyGuide = {
  slug: string;
  country: string;
  region: 'Europe' | 'North America' | 'Oceania';
  route: string;
  education: string;
  academicLink: string;
  steps: readonly [string, string, string];
  sources: readonly [StudySource, ...StudySource[]];
};

export const immigrationSourcesChecked = '2026-11-24';

export const internationalStudyGuides = [
  {
    slug: 'uk', country: 'United Kingdom', region: 'Europe', route: 'Student visa',
    education: 'Compare foundation, degree and top-up options with the institution. Ask how your Pakistani qualification and English evidence are assessed and whether the provider can sponsor your exact course.',
    academicLink: '/uk',
    steps: [
      'Get an offer and a Confirmation of Acceptance for Studies (CAS) from a licensed Student sponsor before applying.',
      'Check which financial, English-language and other evidence applies. A university accepting an English test for admission does not automatically make it approved visa evidence.',
      'Check the GOV.UK rules for your application date. A UK top-up or remote course does not automatically qualify you for a Student or Graduate visa.',
    ],
    sources: [
      { label: 'GOV.UK: Student visa', url: 'https://www.gov.uk/student-visa' },
      { label: 'GOV.UK: Financial evidence', url: 'https://www.gov.uk/student-visa/money' },
      { label: 'GOV.UK: English requirements', url: 'https://www.gov.uk/student-visa/knowledge-of-english' },
      { label: 'GOV.UK: Graduate visa', url: 'https://www.gov.uk/graduate-visa' },
    ],
  },
  {
    slug: 'italy', country: 'Italy', region: 'Europe', route: 'University study visa',
    education: 'Check your degree, teaching language and admissions deadline with the university. Follow the university’s instructions for transcripts and any qualification assessment.',
    academicLink: '/europe/italy',
    steps: [
      'Follow the institution’s admissions process and submit pre-enrolment through Universitaly for the university-enrolment route.',
      'Wait for the institution to validate your Universitaly pre-enrolment. Admission and validation are not a visa decision.',
      'Follow the Italian mission’s current appointment and document instructions for your jurisdiction in Pakistan.',
    ],
    sources: [
      { label: 'Universitaly: International students', url: 'https://www.universitaly.it/it/studenti-stranieri' },
      { label: 'Embassy of Italy in Islamabad: Visa appointments', url: 'https://ambislamabad.esteri.it/en/news/dall_ambasciata/2026/07/want-to-apply-for-an-italian-visa-heres-how-to-book-an-appointment/' },
    ],
  },
  {
    slug: 'germany', country: 'Germany', region: 'Europe', route: 'National student visa',
    education: 'Check whether your qualifications support direct entry or a preparatory route such as Studienkolleg. Confirm the teaching language and whether to apply directly or through uni-assist.',
    academicLink: '/germany',
    steps: [
      'Confirm the admissions route and obtain the evidence requested for your German study or preparatory programme.',
      'Use the German Missions in Pakistan instructions and Consular Services Portal for the office responsible for your place of residence.',
      'Follow the interactive checklist and any screening or appointment instructions. A blocked account is one possible way to show financing, not the only one.',
    ],
    sources: [{ label: 'German Missions in Pakistan: Study visa', url: 'https://pakistan.diplo.de/pk-en/service/2-study-visa-seite-1676104' }],
  },
  {
    slug: 'australia', country: 'Australia', region: 'Oceania', route: 'Student visa (subclass 500)',
    education: 'Search CRICOS for the exact course and provider, then check academic entry requirements, delivery location and English requirements directly with the provider.',
    academicLink: '/australia',
    steps: [
      'For the usual degree route, get a valid Confirmation of Enrolment (CoE); an offer alone is not the same document.',
      'Check the Department of Home Affairs document list for your passport and provider. Review Genuine Student evidence and Overseas Student Health Cover (OSHC), including any applicable exceptions.',
      'Use Home Affairs’ application instructions and follow any further evidence or health requests. Enrolment does not guarantee a visa.',
    ],
    sources: [
      { label: 'Home Affairs: Student visa (subclass 500)', url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500' },
      { label: 'Home Affairs: Genuine Student requirement', url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/genuine-student-requirement' },
      { label: 'Australian Government: CRICOS course search', url: 'https://cricos.education.gov.au/course/coursesearch.aspx' },
    ],
  },
  {
    slug: 'canada', country: 'Canada', region: 'North America', route: 'Study permit',
    education: 'Check the exact school and campus against the designated learning institution (DLI) list. Compare programme language, prerequisites and affordability separately from permit eligibility.',
    academicLink: '/canada',
    steps: [
      'Obtain a letter of acceptance from a designated learning institution. It is not a study permit.',
      'Check financial evidence and whether you need a provincial or territorial attestation letter (PAL or TAL). For Quebec, check the separate CAQ rules and exceptions.',
      'Follow IRCC’s outside-Canada application guide, including any biometrics or medical instructions you receive.',
    ],
    sources: [
      { label: 'IRCC: Apply for a study permit from outside Canada', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5269-applying-study-permit-outside-canada.html' },
      { label: 'IRCC: PAL or TAL and Quebec rules', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/provincial-attestation-letter.html' },
      { label: 'IRCC: Designated learning institutions', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html' },
    ],
  },
  {
    slug: 'usa', country: 'United States', region: 'North America', route: 'F-1 and M-1 student visas',
    education: 'Compare degree, community college and transfer options. Confirm the school is SEVP-certified and ask the exact programme about academic and language evidence.',
    academicLink: '/usa',
    steps: [
      'F-1 generally covers academic study and eligible language training; M-1 is for vocational or other non-academic study, excluding language training.',
      'If accepted, the SEVP-certified school registers you in SEVIS and issues Form I-20. Neither admission nor the I-20 is visa approval.',
      'Review the separate SEVIS fee, visa application and local appointment instructions on official U.S. government pages.',
    ],
    sources: [
      { label: 'U.S. Department of State: Student visas', url: 'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html' },
      { label: 'U.S. Department of Homeland Security: School search', url: 'https://studyinthestates.dhs.gov/school-search' },
    ],
  },
  {
    slug: 'france', country: 'France', region: 'Europe', route: 'Long-stay student visa',
    education: 'Check the programme’s teaching language, deadlines, academic evidence and application channel. Some programmes use Études en France for admission; others admit directly.',
    academicLink: '/europe/france',
    steps: [
      'For the usual long-stay student route from Pakistan, complete the Campus France Études en France process before the visa process.',
      'If admitted outside the platform, follow Campus France Pakistan’s pre-consular instructions for applicants who already have acceptance.',
      'Use France-Visas for the applicable route, document list and post-arrival instructions. Research, internships and other cases can follow different rules.',
    ],
    sources: [
      { label: 'Campus France Pakistan: Long-stay student visa', url: 'https://www.pakistan.campusfrance.org/apply-to-long-stay-french-student-visa' },
      { label: 'France-Visas: Student guidance', url: 'https://france-visas.gouv.fr/en/etudiant' },
    ],
  },
  {
    slug: 'spain', country: 'Spain', region: 'Europe', route: 'National study visa',
    education: 'Ask the university about Pakistani qualification recognition, admissions documents, teaching language and conditions for your specific undergraduate or master’s programme.',
    academicLink: '/europe/spain',
    steps: [
      'Check the Spanish Embassy in Islamabad’s national study instructions for qualifying studies lasting more than 90 days.',
      'Confirm the evidence, translation and appointment instructions for your intended course and stay. Short courses can have separate entry rules.',
      'Follow the post-arrival instructions attached to your permission. Do not treat the academic offer as permission to travel or work.',
    ],
    sources: [
      { label: 'Embassy of Spain in Islamabad: National study visa (Spanish)', url: 'https://www.exteriores.gob.es/Embajadas/islamabad/es/ServiciosConsulares/Paginas/index.aspx?scca=Visados&scco=Pakist%25u00e1n&scd=156&scs=Visados+Nacionales+-+Visado+de+estudios' },
      { label: 'European Commission: Student in Spain', url: 'https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal/student-spain_en' },
    ],
  },
  {
    slug: 'netherlands', country: 'Netherlands', region: 'Europe', route: 'Student residence permit',
    education: 'Compare university or higher professional education and confirm that the institution is recognised by the IND as a sponsor for this route.',
    academicLink: '/europe/netherlands',
    steps: [
      'Confirm admission and follow the institution’s checklist for the programme and evidence of funds.',
      'For this route, the recognised institution applies for the student residence permit and any necessary MVV entry visa; the student does not file that residence application.',
      'Follow the IND decision letter for any MVV sticker instructions. Collect in Pakistan only if the letter specifies that location.',
    ],
    sources: [
      { label: 'Dutch IND: Student residence permit', url: 'https://ind.nl/en/residence-permits/study/student-residence-permit-for-university-or-higher-professional-education' },
      { label: 'NetherlandsWorldwide: MVV instructions in Pakistan', url: 'https://www.netherlandsworldwide.nl/visa-the-netherlands/mvv-long-stay/apply-pakistan' },
    ],
  },
] as const satisfies readonly StudyGuide[];

export function findInternationalStudyGuide(slug: string) {
  return internationalStudyGuides.find(guide => guide.slug === slug);
}
