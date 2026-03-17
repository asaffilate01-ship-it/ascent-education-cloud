import { motion } from 'framer-motion';
import { ShieldCheck, ExternalLink } from 'lucide-react';

const defaultPartners = [
  { name: 'OTHM Qualifications', short: 'OTHM', country: 'UK', description: 'UK-based awarding body regulated by Ofqual offering globally recognised diplomas.' },
  { name: 'QUALIFI', short: 'QUALIFI', country: 'UK', description: 'UK awarding organisation providing professional and academic qualifications.' },
  { name: 'Ofqual', short: 'Ofqual', country: 'UK', description: 'Office of Qualifications and Examinations Regulation — UK government regulator.' },
  { name: 'IOSH', short: 'IOSH', country: 'UK', description: 'Institution of Occupational Safety and Health — global professional body.' },
  { name: 'IAB', short: 'IAB', country: 'UK', description: 'International Association of Bookkeepers — professional accounting body.' },
  { name: 'ACCA', short: 'ACCA', country: 'UK', description: 'Association of Chartered Certified Accountants — global accountancy body.' },
];

export default function AccreditationPartners() {
  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" /> Accreditation & Recognition
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        All qualifications are awarded by internationally recognised bodies, regulated by Ofqual (UK).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {defaultPartners.map((partner, i) => (
          <motion.div
            key={partner.short}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="surface-card p-4 rounded-xl text-center hover:shadow-lg transition-default group cursor-default"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2.5 group-hover:bg-primary/20 transition-default">
              <span className="text-xs font-black text-primary">{partner.short}</span>
            </div>
            <p className="text-xs font-semibold mb-0.5">{partner.name}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{partner.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
