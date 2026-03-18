import { CheckCircle2, Info, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const generalRequirements = [
  'Laptop or desktop computer (minimum 8GB RAM recommended)',
  'Reliable internet connection (minimum 10 Mbps)',
  '2 × 5-day intensive residential workshops per academic year at our campus',
];

const requirements = [
  {
    level: 'Level 3 Foundation',
    academic: 'Matric / O-Levels / equivalent secondary qualification',
    english: 'IELTS 5.0 or equivalent (if English is not first language)',
    age: '16 years or above',
    experience: 'No prior work experience required',
    documents: ['Passport / CNIC copy', 'Academic transcripts', 'Passport-size photo'],
  },
  {
    level: 'Level 4 Diploma',
    academic: 'Level 3 qualification, A-Levels, or equivalent',
    english: 'IELTS 5.5 or equivalent',
    age: '17 years or above',
    experience: 'No prior work experience required',
    documents: ['Passport / CNIC copy', 'Level 3 certificate', 'Academic transcripts', 'IELTS certificate'],
  },
  {
    level: 'Level 5 Extended Diploma',
    academic: 'Level 4 diploma or equivalent',
    english: 'IELTS 6.0 or equivalent',
    age: '18 years or above',
    experience: 'Relevant work experience is beneficial but not mandatory',
    documents: ['Passport / CNIC copy', 'Level 4 certificate', 'Academic transcripts', 'IELTS certificate'],
  },
  {
    level: 'Level 6 Top-Up Degree',
    academic: 'Level 5 diploma or equivalent (240 credits)',
    english: 'IELTS 6.0–6.5 depending on university',
    age: '18 years or above',
    experience: 'May require portfolio or interview at partner university',
    documents: ['Passport', 'Level 5 certificate', 'All academic transcripts', 'IELTS certificate', 'Personal statement', 'Reference letter'],
  },
  {
    level: 'Level 7 Postgraduate',
    academic: 'Bachelor\'s degree or Level 6 diploma (360 credits)',
    english: 'IELTS 6.5 or equivalent',
    age: '21 years or above (typically)',
    experience: 'Relevant work experience preferred for some programmes',
    documents: ['Passport', 'Degree certificate', 'Transcripts', 'IELTS certificate', 'CV / Resume', 'Personal statement', 'Two reference letters'],
  },
];

export default function EntryRequirements() {
  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" /> Entry Requirements by Level
      </h3>
      <p className="text-xs text-muted-foreground mb-5">
        Understand the academic and English language requirements needed for each qualification level.
      </p>

      <div className="space-y-3">
        {requirements.map((req, i) => (
          <motion.details
            key={req.level}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="surface-card rounded-xl group"
          >
            <summary className="px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-accent/50 rounded-xl transition-default list-none">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold flex-1">{req.level}</span>
              <svg className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>

            <div className="px-4 pb-4 pt-1 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <div><span className="font-medium">Academic:</span> {req.academic}</div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <div><span className="font-medium">English:</span> {req.english}</div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <div><span className="font-medium">Age:</span> {req.age}</div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <div><span className="font-medium">Experience:</span> {req.experience}</div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5">Required Documents:</p>
                <div className="flex flex-wrap gap-1.5">
                  {req.documents.map((doc) => (
                    <span key={doc} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.details>
        ))}
      </div>
    </div>
  );
}
