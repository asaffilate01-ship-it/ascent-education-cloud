import { ShieldAlert } from 'lucide-react';

interface Props {
  destination?: 'germany' | 'uk' | 'pakistan' | 'language';
  compact?: boolean;
}

/**
 * Compliance disclosure shown on every consultancy page.
 * Wording follows the launch boundaries in the EduCloud/LoungeTech blueprint:
 * no guaranteed admission/CAS/visa, no unlicensed immigration advice, and
 * official certificates are only issued by authorised exam bodies.
 */
export default function ComplianceDisclosure({ destination = 'pakistan', compact = false }: Props) {
  const lines: Record<string, string[]> = {
    germany: [
      'UniPathway provides education counselling and language preparation only. Admission decisions are made by the receiving German institution or uni-assist; the student visa and residence-permit decisions are made by the competent German authority.',
      'We do not guarantee admission, scholarship or visa outcomes. Official TestDaF, telc or Goethe certificates are issued only by the authorised examination body — our courses are exam preparation.',
      'Fees, blocked-account (Sperrkonto) and living-cost figures shown here are indicative and must be verified against the current DAAD Pakistan and Make it in Germany guidance at the time of application.',
    ],
    uk: [
      'UniPathway provides education counselling and language preparation only. Admission and CAS decisions are made by the UK institution; visa decisions are made by UK Visas and Immigration (UKVI).',
      'We do not guarantee admission, CAS, scholarship or visa outcomes. IELTS, PTE and TOEFL certificates are issued only by the authorised examination body — our courses are exam preparation.',
      'Tuition, maintenance-fund and Graduate Route figures shown here are indicative and must be verified against current GOV.UK Student Visa and British Council AQF guidance at the time of application.',
    ],
    language: [
      'Our German and English courses are language teaching and exam preparation only. Official proficiency certificates (TestDaF, telc, Goethe, IELTS, PTE, TOEFL) are issued exclusively by the authorised examination body.',
      'Where a course is titled "preparation", enrolment does not include the official examination fee, sitting or certification.',
    ],
    pakistan: [
      'UniPathway is a Pakistan-registered education-counselling and language-preparation service operating within SECP and BEOE boundaries. We do not undertake overseas job placement or unlicensed immigration advice.',
    ],
  };

  const items = lines[destination] || lines.pakistan;

  return (
    <div className={`rounded-xl border border-amber-500/30 bg-amber-500/5 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Important — Regulatory & Consumer Disclosure
          </p>
          {items.map((line, i) => (
            <p key={i} className="text-xs sm:text-sm text-foreground/80 leading-relaxed">{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
