import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight, Award, BookOpen, Briefcase, Globe } from 'lucide-react';

const levels = [
  {
    level: 'Level 3',
    title: 'Foundation Certificate',
    credits: '60–120 Credits',
    equivalent: 'A-Level Equivalent',
    description: 'Build foundational knowledge and earn UCAS tariff points for university entry.',
    icon: BookOpen,
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    requirements: ['Matric / O-Levels', 'IELTS 5.0 (if applicable)', 'Age 16+'],
  },
  {
    level: 'Level 4',
    title: 'Diploma (Year 1)',
    credits: '120 Credits',
    equivalent: 'Year 1 of UK Bachelor\'s',
    description: 'Equivalent to first year of a UK bachelor\'s degree. Study locally at reduced cost.',
    icon: GraduationCap,
    color: 'from-indigo-500/20 to-indigo-600/10',
    borderColor: 'border-indigo-500/30',
    requirements: ['Level 3 qualification or equivalent', 'IELTS 5.5', 'Age 17+'],
  },
  {
    level: 'Level 5',
    title: 'Extended Diploma (Year 2)',
    credits: '120 Credits',
    equivalent: 'Year 2 of UK Bachelor\'s',
    description: 'Second year equivalent. Deepen your specialisation in your chosen field.',
    icon: GraduationCap,
    color: 'from-violet-500/20 to-violet-600/10',
    borderColor: 'border-violet-500/30',
    requirements: ['Level 4 diploma', 'IELTS 6.0', 'Satisfactory academic progress'],
  },
  {
    level: 'Level 6',
    title: 'Top-Up Degree (Year 3)',
    credits: '120 Credits',
    equivalent: 'Final Year Bachelor\'s',
    description: 'Complete your final year at a UK/AUS/CAN partner university for a full bachelor\'s degree.',
    icon: Globe,
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    requirements: ['Level 5 diploma', 'IELTS 6.0–6.5', 'University-specific requirements'],
  },
  {
    level: 'Level 7',
    title: 'Postgraduate Diploma',
    credits: '120 Credits',
    equivalent: 'Master\'s Equivalent',
    description: 'Postgraduate qualification. Top-up with a 60-credit dissertation for a full Master\'s or MBA.',
    icon: Award,
    color: 'from-amber-500/20 to-amber-600/10',
    borderColor: 'border-amber-500/30',
    requirements: ['Bachelor\'s degree or Level 6', 'IELTS 6.5', 'Relevant work experience (preferred)'],
  },
  {
    level: 'Career',
    title: 'Professional Practice',
    credits: '',
    equivalent: 'Employment & Beyond',
    description: 'Enter the workforce with globally recognised qualifications, or pursue professional certifications like ACCA, IOSH, or ISO auditor.',
    icon: Briefcase,
    color: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-500/30',
    requirements: ['Relevant qualification', 'Industry certifications (optional)', 'Professional membership'],
  },
];

export default function ProgressionPathway() {
  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-primary" /> Qualification Progression Pathway
      </h3>
      <p className="text-xs text-muted-foreground mb-5">
        Follow the structured pathway from foundation to postgraduate — study locally, graduate globally.
      </p>

      <div className="space-y-3">
        {levels.map((lvl, i) => {
          const Icon = lvl.icon;
          return (
            <motion.div
              key={lvl.level}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`surface-card p-4 rounded-xl border ${lvl.borderColor} bg-gradient-to-r ${lvl.color} relative overflow-hidden group hover:shadow-lg transition-default`}
            >
              <div className="flex items-start gap-4">
                {/* Step indicator */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${lvl.color} border ${lvl.borderColor} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  {i < levels.length - 1 && (
                    <div className="w-px h-6 bg-border mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{lvl.level}</span>
                    <span className="text-sm font-semibold">{lvl.title}</span>
                    {lvl.credits && <span className="text-[10px] text-muted-foreground">({lvl.credits})</span>}
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">{lvl.equivalent}</p>
                  <p className="text-xs text-foreground/80 mb-2">{lvl.description}</p>

                  {/* Entry Requirements */}
                  <div className="flex flex-wrap gap-1.5">
                    {lvl.requirements.map((req, ri) => (
                      <span
                        key={ri}
                        className="text-[10px] bg-secondary/80 text-muted-foreground px-2 py-0.5 rounded-full"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow to next */}
                {i < levels.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-3 hidden sm:block" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
