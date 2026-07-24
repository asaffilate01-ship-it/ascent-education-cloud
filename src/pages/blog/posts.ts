export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: 'UK' | 'Germany' | 'Language' | 'Guidance';
  author: string;
  date: string; // ISO
  readMinutes: number;
  cover?: string;
  body: string[]; // paragraphs (plain text)
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'uk-student-visa-2026-checklist',
    title: 'UK Student Visa 2026 — Complete Checklist for Pakistani Applicants',
    excerpt:
      'From CAS to maintenance funds and TB tests — the exact documents UKVI expects from Pakistani students in 2026.',
    category: 'UK',
    author: 'UniPathway Editorial',
    date: '2026-06-02',
    readMinutes: 8,
    body: [
      'Applying for a UK Student Visa from Pakistan in 2026 is straightforward if you prepare in the right order. This guide walks through every document UKVI expects, the current maintenance-fund thresholds, and the common reasons Pakistani applications are refused.',
      'You need a Confirmation of Acceptance for Studies (CAS) from a licensed UK sponsor before you can apply. Your CAS is valid for six months and lists your course, start date, tuition, and any deposits already paid.',
      'Maintenance funds must be held in your (or a parent’s) account for 28 consecutive days ending no more than 31 days before the application. London courses require higher monthly funds than the rest of the UK — check the current GOV.UK figures at the time you apply.',
      'Tuberculosis testing at an IOM-approved clinic in Pakistan is mandatory. Bring your passport and appointment letter; the certificate is valid for six months.',
      'UniPathway counsellors review your document set before submission and flag anything a caseworker is likely to query. This is education counselling — the final visa decision rests with UKVI.',
    ],
  },
  {
    slug: 'germany-blocked-account-sperrkonto-explained',
    title: 'Germany Sperrkonto (Blocked Account) — How Much You Really Need in 2026',
    excerpt:
      'The blocked account is Germany’s proof-of-funds requirement. Here is the current figure, the approved providers, and how to open one from Pakistan.',
    category: 'Germany',
    author: 'UniPathway Editorial',
    date: '2026-05-18',
    readMinutes: 6,
    body: [
      'To study in Germany, most Pakistani students must show proof of funds in a Sperrkonto (blocked account) before the German mission will issue a student visa.',
      'The amount is set by the Federal Foreign Office and is reviewed each year. It is released to you monthly during your studies — you cannot withdraw the full amount at once.',
      'Popular providers accepting Pakistani applicants include Expatrio, Fintiba, and Coracle. Each charges a setup fee and monthly maintenance fee — compare the total cost before you commit.',
      'Open the account online, transfer the required amount from your Pakistani bank via an authorised remittance channel, and download the confirmation letter for your visa file.',
      'UniPathway assists with the paperwork and interview preparation. The final residence-permit and visa decision is made by the German authority.',
    ],
  },
  {
    slug: 'ielts-vs-pte-vs-toefl-2026',
    title: 'IELTS vs PTE vs TOEFL in 2026 — Which One Should You Sit?',
    excerpt:
      'Cost, speed, difficulty, and UK/Germany acceptance compared side by side so you pick the right English test.',
    category: 'Language',
    author: 'UniPathway Language Team',
    date: '2026-04-27',
    readMinutes: 5,
    body: [
      'All three tests are widely accepted, but they measure English differently and cost different amounts in Pakistan.',
      'IELTS is the most familiar to UK universities and UKVI. Results usually arrive in 3–5 days for the computer-delivered version.',
      'PTE Academic is fully computer-marked, so results are typically issued within 48 hours. Some UK universities prefer it for its objectivity.',
      'TOEFL iBT is more common for US-linked programmes; some UK and German institutions accept it, but always confirm on the university page.',
      'Our language academy offers targeted preparation for whichever test suits your goal. The official certificate is issued only by the examination body.',
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
