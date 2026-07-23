import { BookOpen, Clock, Users, Award } from 'lucide-react';

interface Course {
  code: string;
  title: string;
  hours: string;
  mode: string;
  fee: string;
  desc: string;
  prep?: boolean;
}

interface Props {
  track: 'german' | 'english';
}

const GERMAN: Course[] = [
  { code: 'A1', title: 'German A1 — Foundations', hours: '80 hours · 8 weeks', mode: 'Live online or classroom', fee: 'Rs.28,000', desc: 'Alphabet, greetings, present tense, everyday vocabulary. CEFR A1 outcomes.' },
  { code: 'A2', title: 'German A2 — Elementary', hours: '100 hours · 10 weeks', mode: 'Live online or classroom', fee: 'Rs.34,000', desc: 'Past tenses, describing routine, forms, family and travel topics.' },
  { code: 'B1', title: 'German B1 — Intermediate', hours: '120 hours · 12 weeks', mode: 'Live online or classroom', fee: 'Rs.42,000', desc: 'Independent user level required for many apprenticeships and integration.' },
  { code: 'B2', title: 'German B2 — Upper Intermediate', hours: '140 hours · 14 weeks', mode: 'Live online or classroom', fee: 'Rs.52,000', desc: 'Level typically required for German-taught bachelor and master programmes.' },
  { code: 'TESTDAF', title: 'TestDaF Preparation', hours: '40 hours · 4 weeks', mode: 'Live online', fee: 'Rs.24,000', desc: 'Structured practice for the four TestDaF modules. Exam fee and sitting are separate at the authorised centre.', prep: true },
  { code: 'TELC', title: 'telc Deutsch B1 / B2 Preparation', hours: '32 hours · 4 weeks', mode: 'Live online', fee: 'Rs.22,000', desc: 'Focused mock papers and marking. Certification is issued by telc via an authorised centre.', prep: true },
  { code: 'GOETHE', title: 'Goethe-Zertifikat Preparation', hours: '32 hours · 4 weeks', mode: 'Live online', fee: 'Rs.22,000', desc: 'Preparation aligned to Goethe-Institut sample papers. Certification is issued by Goethe-Institut.', prep: true },
];

const ENGLISH: Course[] = [
  { code: 'AE', title: 'Academic English', hours: '80 hours · 8 weeks', mode: 'Live online or classroom', fee: 'Rs.26,000', desc: 'Academic writing, listening for lectures, reading strategies and referencing.' },
  { code: 'IELTS', title: 'IELTS Academic Preparation', hours: '48 hours · 6 weeks', mode: 'Live online', fee: 'Rs.22,000', desc: 'Full band-9 rubric coaching across all four sections. Test booking and certification are handled directly by the British Council or IDP.', prep: true },
  { code: 'PTE', title: 'PTE Academic Preparation', hours: '40 hours · 5 weeks', mode: 'Live online', fee: 'Rs.20,000', desc: 'AI-scored task practice with weekly mocks. Test booking and certification are through Pearson.', prep: true },
  { code: 'TOEFL', title: 'TOEFL iBT Preparation', hours: '40 hours · 5 weeks', mode: 'Live online', fee: 'Rs.20,000', desc: 'Integrated and independent task drills. Test booking and certification are through ETS.', prep: true },
];

export default function LanguageAcademy({ track }: Props) {
  const list = track === 'german' ? GERMAN : ENGLISH;
  const title = track === 'german' ? 'German Language Academy — A1 to B2 and Exam Preparation' : 'English Language Academy — Academic English and Exam Preparation';
  const subtitle = track === 'german'
    ? 'Live-taught German at every CEFR level required for higher education in Germany, plus dedicated preparation for TestDaF, telc and Goethe exams.'
    : 'Academic English for university readiness, plus dedicated preparation for IELTS Academic, PTE Academic and TOEFL iBT.';

  return (
    <section className="space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Language Academy</span>
        <h2 className="text-2xl sm:text-3xl font-bold mt-2">{title}</h2>
        <p className="text-muted-foreground mt-2 max-w-3xl">{subtitle}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => (
          <div key={c.code} className="surface-card p-5 rounded-xl border border-border/50 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-primary/10 text-primary">
                <BookOpen className="w-3 h-3" /> {c.code}
              </span>
              {c.prep && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  Exam preparation
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold mb-2">{c.title}</h3>
            <p className="text-xs text-muted-foreground mb-4 flex-1">{c.desc}</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-3.5 h-3.5" /> {c.hours}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-3.5 h-3.5" /> {c.mode}</div>
              <div className="flex items-center gap-2 font-semibold text-foreground"><Award className="w-3.5 h-3.5" /> {c.fee}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground italic">
        Fees are indicative and payable in Pakistani Rupees to the Pakistan-registered operator. Official examinations, certification and results are the sole responsibility of the awarding exam body.
      </p>
    </section>
  );
}
