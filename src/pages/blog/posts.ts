const ukVisaCover = '/blog/uk-visa.jpg';
const germanySperrkontoCover = '/blog/germany-sperrkonto.jpg';
const englishExamsCover = '/blog/english-exams.jpg';
const germanExamsCover = '/blog/german-exams.jpg';
const diplomaGuidanceCover = '/blog/diploma-guidance.jpg';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: 'UK' | 'Germany' | 'Language' | 'Guidance';
  author: string;
  date: string; // ISO
  readMinutes: number;
  guidanceLinks?: { label: string; to: string }[];
  cover: string;
  coverAlt: string;
  body: string[]; // paragraphs (plain text)
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'uk-student-visa-2026-checklist',
    title: 'UK Student Visa 2026 — What Pakistani Applicants Should Check',
    excerpt:
      'Check CAS, financial evidence and other possible documents with GOV.UK. Requirements depend on your route and application date.',
    category: 'UK',
    author: 'UniPathway Editorial',
    date: '2026-06-02',
    readMinutes: 8,
    cover: ukVisaCover,
    coverAlt: 'UK passport and university acceptance letter with Westminster in the background',
    guidanceLinks: [
      { label: 'UK visa costs and application-date changes', to: '/uk#student-visa-costs' },
      { label: 'GOV.UK: Student visa documents', to: 'https://www.gov.uk/student-visa/documents-you-must-provide' },
      { label: 'GOV.UK: Tuberculosis testing', to: 'https://www.gov.uk/tb-test-visa' },
    ],
    body: [
      'Begin with your exact course and a Confirmation of Acceptance for Studies (CAS) from a licensed Student sponsor. Admission, CAS issuance and visa approval are separate decisions.',
      'Check the course fees on your CAS and the GOV.UK financial amount and evidence rules for the date you apply. Where cash evidence is required, the funds generally must be held for 28 consecutive days with that period ending within 31 days before you apply. Other evidence routes and exemptions have separate rules.',
      'Check whether you need a tuberculosis test, an ATAS certificate or specific English-language evidence. GOV.UK’s current checklist determines which documents apply; a university’s admissions checklist may be different.',
      'UniPathway can help with education planning, not individual decisions about visa eligibility. Do not send passports, bank statements or visa documents in a general enquiry.',
    ],
  },
  {
    slug: 'germany-blocked-account-sperrkonto-explained',
    title: 'Germany Sperrkonto (Blocked Account) — What to Check Before You Pay',
    excerpt:
      'A blocked account is one way to show financing. Check current amounts, acceptable alternatives and provider terms with official sources.',
    category: 'Germany',
    author: 'UniPathway Editorial',
    date: '2026-05-18',
    readMinutes: 6,
    cover: germanySperrkontoCover,
    coverAlt: 'Euro banknotes and a banking dashboard on a laptop with the Brandenburg Gate behind',
    guidanceLinks: [
      { label: 'German Missions in Pakistan: How to finance your stay', to: 'https://pakistan.diplo.de/pk-en/service/1995528-1995528' },
      { label: 'Germany student visa guide for Pakistan', to: '/international-study/germany' },
    ],
    body: [
      'A blocked account can be used to show you can meet your living costs. The German Missions in Pakistan also list alternatives such as an accepted scholarship or a formal declaration of commitment. Ask the relevant mission which evidence is accepted in your case.',
      'Check the official amount and the length of the period for your application before moving money. A blocked account releases funds in instalments; it is not the government visa fee.',
      'The account terms are between you and the provider. Check provider fees, verification for the German mission and how you would recover funds if your study plans change.',
      'Admission and financing evidence do not guarantee an immigration decision. Use the German mission’s current checklist for the visa route.',
    ],
  },
  {
    slug: 'ielts-vs-pte-vs-toefl-2026',
    title: 'IELTS vs PTE vs TOEFL in 2026 — Which One Should You Sit?',
    excerpt:
      'Check how IELTS, PTE and TOEFL evidence differs across admissions and visas before you choose a test.',
    category: 'Language',
    author: 'UniPathway Language Team',
    date: '2026-04-27',
    readMinutes: 5,
    cover: englishExamsCover,
    coverAlt: 'Student taking an English language exam on a computer with headphones on',
    guidanceLinks: [
      { label: 'ETS: Current TOEFL iBT test content', to: 'https://www.ets.org/toefl/test-takers/ibt/about/content.html' },
      { label: 'GOV.UK: Student visa English requirements', to: 'https://www.gov.uk/student-visa/knowledge-of-english' },
    ],
    body: [
      'Start with the exact institution, course and intake. Check accepted test versions, minimum overall and section scores, delivery modes and any exemptions before booking.',
      'IELTS Academic and PTE Academic are accepted by some universities. The English evidence a university accepts for admission may differ from the evidence required for a UK Student visa.',
      'TOEFL iBT formats and scores changed in 2026. Confirm the version for your test date with ETS and ask your institution which delivery modes and scores it accepts. TOEFL iBT is not a UKVI-approved secure English language test (SELT); a UK Student sponsor’s assessment for eligible degree-level study is a separate route.',
      'Ask UniPathway about TOEFL iBT preparation availability. Before paying for any test, check fees and result turnaround with the exam provider rather than relying on a general estimate.',
    ],
  },
  {
    slug: 'testdaf-vs-telc-vs-goethe',
    title: 'TestDaF vs telc vs Goethe — Choosing the Right German Certificate',
    excerpt:
      'Which German exam do German universities and the visa office actually want? A plain-English comparison.',
    category: 'Language',
    author: 'UniPathway Language Team',
    date: '2026-03-30',
    readMinutes: 6,
    cover: germanExamsCover,
    coverAlt: 'Open German textbook with flashcards, a coffee mug and a German flag pin',
    body: [
      'German-taught programmes typically require a C1-level certificate. TestDaF, telc Deutsch C1 Hochschule, and Goethe-Zertifikat C1/C2 are the three most widely accepted.',
      'TestDaF is administered by the TestDaF-Institut and is designed specifically for academic admission — most universities accept a TDN 4 in each section.',
      'telc Hochschule is a shorter exam focused on academic German and is accepted by most uni-assist institutions.',
      'Goethe certificates carry strong international recognition and are useful beyond university admissions (e.g., for work visas).',
      'Choose the exam your target university lists explicitly. Our preparation courses teach exam technique; certification is issued by the exam body.',
    ],
  },
  {
    slug: 'choosing-otms-qualifi-iab-diploma',
    title: 'OTHM, QUALIFI or IAB — Which UK Awarding Body Fits Your Career?',
    excerpt:
      'A quick guide to the three awarding bodies UniPathway partners with, and which pathway leads where.',
    category: 'Guidance',
    author: 'UniPathway Editorial',
    date: '2026-03-04',
    readMinutes: 4,
    cover: diplomaGuidanceCover,
    coverAlt: 'An individual reviewing documents at a desk',
    body: [
      'OTHM, QUALIFI, and IAB are Ofqual-regulated UK awarding bodies. UniPathway delivers Level 3–5 diplomas across all three.',
      'OTHM diplomas cover business, computing, health and social care, and more. They articulate into the final year of many UK bachelor’s degrees.',
      'QUALIFI is strong in engineering, cyber security, and health-care management, with clear top-up routes to UK universities.',
      'IAB specialises in accounting and bookkeeping, offering a direct route into UK finance professions.',
      'Book a free counselling call and we will map the right diploma to your career goal and progression university.',
    ],
  },
];

export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
