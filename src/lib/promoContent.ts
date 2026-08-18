export type Locale = 'en' | 'de';

export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem('up_promo_locale');
  if (stored === 'de' || stored === 'en') return stored;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  const german = langs.some((l) => l?.toLowerCase().startsWith('de'));
  let tzGerman = false;
  try {
    tzGerman = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Berlin';
  } catch {
    tzGerman = false;
  }
  return german || tzGerman ? 'de' : 'en';
}

interface Copy {
  navHome: string;
  navPlatform: string;
  navApp: string;
  navFaq: string;
  navAccess: string;
  heroTitle: string;
  heroLead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  stats: { value: string; label: string }[];
  platformTitle: string;
  platformLead: string;
  features: { title: string; body: string }[];
  shotsTitle: string;
  shotsLead: string;
  shotDesktop: string;
  shotDesktopBody: string;
  shotMobile: string;
  shotMobileBody: string;
  appPoints: string[];
  faqTitle: string;
  faqs: { q: string; a: string }[];
  accessTitle: string;
  accessLead: string;
  accessPlaceholder: string;
  accessButton: string;
  accessError: string;
  accessSuccess: string;
  footerTagline: string;
  legalDe: string;
  legalRow: string;
  rights: string;
  language: string;
}

export const COPY: Record<Locale, Copy> = {
  en: {
    navHome: 'Overview',
    navPlatform: 'Platform',
    navApp: 'Mobile App',
    navFaq: 'FAQs',
    navAccess: 'Access',
    heroTitle: 'Your Journey to University and Beyond.',
    heroLead:
      'UniPathway is a complete education platform — accredited Level 3–5 diplomas, an admissions CRM, a virtual campus, finance and compliance, all in one branded system for colleges and their students.',
    ctaPrimary: 'Enter with access code',
    ctaSecondary: 'See what is inside',
    stats: [
      { value: '14', label: 'Role-based portals' },
      { value: '58+', label: 'Secured data tables' },
      { value: '80/20', label: 'Online / residential delivery' },
      { value: '24/7', label: 'AI tutor & support' },
    ],
    platformTitle: 'One platform, every part of the student journey',
    platformLead: 'From the first enquiry to graduation and university progression — fully wired, fully auditable.',
    features: [
      { title: 'Admissions CRM', body: '10-stage pipeline, agent recruitment, document checks and automated offer letters.' },
      { title: 'Student Portal', body: 'Courses, assignments, grades, fees, library and career tools in one place.' },
      { title: 'Virtual Classroom', body: 'Live lectures, attendance capture, recordings and residential week planning.' },
      { title: 'Finance & Payments', body: 'Invoices, instalments, local payment methods and card checkout with full ledger.' },
      { title: 'Quality & Compliance', body: 'IQA sampling, plagiarism and AI checks, immutable audit logs, awarding body standards.' },
      { title: 'AI Assistants', body: 'Course builder, grading assistant, academic tutor and dropout risk prediction.' },
      { title: 'Progression Network', body: 'Top-up degree partners across the UK, Germany, USA, Canada and Australia.' },
      { title: 'Analytics', body: 'Live dashboards for enrolment, revenue, attendance and academic performance.' },
      { title: 'Security by design', body: 'Role-based access across 14 roles, tenant isolation and row-level protection.' },
    ],
    shotsTitle: 'Built for desktop teams and mobile-first students',
    shotsLead: 'The same data, tuned for each screen — installable as an app, fast on mid-range devices.',
    shotDesktop: 'Staff dashboard',
    shotDesktopBody: 'Enrolment, pipeline and revenue at a glance for directors, admissions and finance teams.',
    shotMobile: 'Student mobile app',
    shotMobileBody: 'Native-style bottom navigation, offline-ready lessons and instant notifications.',
    appPoints: ['Installable PWA — no app store needed', 'Offline lesson caching', 'Push and WhatsApp notifications', 'Optimised for 4G and mid-range Android'],
    faqTitle: 'Frequently asked questions',
    faqs: [
      { q: 'Who is UniPathway for?', a: 'Colleges and training centres delivering accredited UK diplomas, and the students, lecturers, agents and partners around them.' },
      { q: 'Which qualifications are supported?', a: 'OTHM, QUALIFI and IAB accredited Level 3 to Level 5 diplomas, with mapped progression to university top-up degrees.' },
      { q: 'Is the platform white-label?', a: 'Yes. Each centre gets its own branding, landing page, domain and isolated data.' },
      { q: 'How is delivery structured?', a: '80% online study with 20% in-person residential weeks, including scheduling and accommodation logistics.' },
      { q: 'Can we take payments?', a: 'Yes — card checkout, invoices, instalment plans and local payment methods with automated reconciliation.' },
      { q: 'Why is this site password protected?', a: 'This is a private promotional preview. Enter your access code to explore the full site and demo portals.' },
    ],
    accessTitle: 'Have an access code?',
    accessLead: 'Enter it below to open the full UniPathway site and demo portals.',
    accessPlaceholder: 'Access code',
    accessButton: 'Unlock the site',
    accessError: 'That code is not recognised. Please check and try again.',
    accessSuccess: 'Access granted — opening the site…',
    footerTagline: 'Your Journey to University and Beyond.',
    legalDe: 'UniPathway is a trading name of iTechLounge GmbH in Germany.',
    legalRow: 'In the UK and the rest of the world, UniPathway is a trading name of iTechLounge Ltd.',
    rights: 'All rights reserved.',
    language: 'Language',
  },
  de: {
    navHome: 'Überblick',
    navPlatform: 'Plattform',
    navApp: 'Mobile App',
    navFaq: 'FAQ',
    navAccess: 'Zugang',
    heroTitle: 'Dein Weg zur Universität und darüber hinaus.',
    heroLead:
      'UniPathway ist eine komplette Bildungsplattform — akkreditierte Diplome der Stufen 3–5, ein Bewerbungs-CRM, ein virtueller Campus, Finanzen und Compliance, alles in einem System für Colleges und ihre Studierenden.',
    ctaPrimary: 'Mit Zugangscode eintreten',
    ctaSecondary: 'Funktionen ansehen',
    stats: [
      { value: '14', label: 'Rollenbasierte Portale' },
      { value: '58+', label: 'Geschützte Datentabellen' },
      { value: '80/20', label: 'Online / Präsenz' },
      { value: '24/7', label: 'KI-Tutor & Support' },
    ],
    platformTitle: 'Eine Plattform für den gesamten Studienweg',
    platformLead: 'Von der ersten Anfrage bis zum Abschluss und Universitätsübergang — vollständig vernetzt und prüfbar.',
    features: [
      { title: 'Bewerbungs-CRM', body: '10-stufige Pipeline, Agenturbetreuung, Dokumentenprüfung und automatische Zusagen.' },
      { title: 'Studierendenportal', body: 'Kurse, Aufgaben, Noten, Gebühren, Bibliothek und Karrieretools an einem Ort.' },
      { title: 'Virtueller Hörsaal', body: 'Live-Vorlesungen, Anwesenheit, Aufzeichnungen und Planung der Präsenzwochen.' },
      { title: 'Finanzen & Zahlungen', body: 'Rechnungen, Ratenpläne, lokale Zahlungsarten und Kartenzahlung mit vollem Kassenbuch.' },
      { title: 'Qualität & Compliance', body: 'IQA-Stichproben, Plagiats- und KI-Prüfung, unveränderliche Audit-Logs, Prüfungsstandards.' },
      { title: 'KI-Assistenten', body: 'Kursbaukasten, Bewertungsassistent, akademischer Tutor und Abbruchrisiko-Prognose.' },
      { title: 'Übergangsnetzwerk', body: 'Top-up-Partnerhochschulen in Großbritannien, Deutschland, den USA, Kanada und Australien.' },
      { title: 'Analysen', body: 'Live-Dashboards für Einschreibungen, Umsatz, Anwesenheit und Leistung.' },
      { title: 'Sicherheit by Design', body: 'Rollenbasierter Zugriff über 14 Rollen, Mandantentrennung und Row-Level-Schutz.' },
    ],
    shotsTitle: 'Für Teams am Desktop und Studierende mobil',
    shotsLead: 'Dieselben Daten, für jedes Gerät optimiert — installierbar als App, schnell auch auf Mittelklasse-Geräten.',
    shotDesktop: 'Team-Dashboard',
    shotDesktopBody: 'Einschreibungen, Pipeline und Umsatz auf einen Blick für Leitung, Zulassung und Finanzen.',
    shotMobile: 'Mobile App für Studierende',
    shotMobileBody: 'Native Navigationsleiste, offlinefähige Lektionen und sofortige Benachrichtigungen.',
    appPoints: ['Installierbare PWA — ohne App Store', 'Offline-Zwischenspeicher für Lektionen', 'Push- und WhatsApp-Benachrichtigungen', 'Optimiert für 4G und Android-Mittelklasse'],
    faqTitle: 'Häufige Fragen',
    faqs: [
      { q: 'Für wen ist UniPathway?', a: 'Für Colleges und Bildungszentren mit akkreditierten britischen Diplomen sowie deren Studierende, Dozenten, Agenturen und Partner.' },
      { q: 'Welche Abschlüsse werden unterstützt?', a: 'Von OTHM, QUALIFI und IAB akkreditierte Diplome der Stufen 3 bis 5 mit klarem Übergang zu Top-up-Studiengängen.' },
      { q: 'Ist die Plattform White-Label?', a: 'Ja. Jedes Zentrum erhält eigenes Branding, eine eigene Landingpage, Domain und getrennte Daten.' },
      { q: 'Wie läuft der Unterricht ab?', a: '80% Online-Studium und 20% Präsenzwochen, inklusive Terminplanung und Unterbringung.' },
      { q: 'Können Zahlungen abgewickelt werden?', a: 'Ja — Kartenzahlung, Rechnungen, Ratenpläne und lokale Zahlungsarten mit automatischem Abgleich.' },
      { q: 'Warum ist die Seite passwortgeschützt?', a: 'Dies ist eine private Promo-Vorschau. Mit dem Zugangscode öffnen Sie die vollständige Website und die Demo-Portale.' },
    ],
    accessTitle: 'Sie haben einen Zugangscode?',
    accessLead: 'Geben Sie ihn ein, um die vollständige UniPathway-Website und die Demo-Portale zu öffnen.',
    accessPlaceholder: 'Zugangscode',
    accessButton: 'Website freischalten',
    accessError: 'Dieser Code ist nicht gültig. Bitte prüfen Sie ihn und versuchen Sie es erneut.',
    accessSuccess: 'Zugang gewährt — Website wird geöffnet…',
    footerTagline: 'Dein Weg zur Universität und darüber hinaus.',
    legalDe: 'UniPathway ist ein Handelsname der iTechLounge GmbH in Deutschland.',
    legalRow: 'In Großbritannien und der übrigen Welt ist UniPathway ein Handelsname der iTechLounge Ltd.',
    rights: 'Alle Rechte vorbehalten.',
    language: 'Sprache',
  },
};
