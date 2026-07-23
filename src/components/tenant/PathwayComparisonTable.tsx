import { Check, Minus } from 'lucide-react';

const ROWS = [
  { label: 'Typical annual tuition', pk: 'Rs.400k – Rs.900k (in-country diploma)', de: '€0 – €3,000 (most public unis, semester fee only)', uk: '£12,000 – £28,000 (international rate)' },
  { label: 'Living costs per year', pk: 'Home', de: 'approx. €11,904 (Sperrkonto guideline — verify current)', uk: '£12,006 in London / £9,207 outside (GOV.UK guideline — verify current)' },
  { label: 'Blocked / maintenance funds required', pk: '—', de: 'Yes — Sperrkonto or scholarship equivalent', uk: 'Yes — 9 months maintenance shown for CAS' },
  { label: 'Common study language', pk: 'English', de: 'German B1/B2 for bachelor’s, English-taught master’s widely available', uk: 'English (IELTS/PTE/TOEFL)' },
  { label: 'Study level entry', pk: 'HSSC / A-Level → Level 3–5', de: 'HSSC + Feststellungsprüfung / Studienkolleg, or A-Level direct, or Bachelor for master’s', uk: 'HSSC + Foundation, or A-Level direct, or Bachelor for master’s' },
  { label: 'Post-study work', pk: 'Domestic employment', de: '18-month job-seeker residence permit after graduation', uk: 'Graduate Route — currently 2 years (planned reduction to 18 months from 2027)' },
  { label: 'Recognition body for prior study', pk: 'HEC Pakistan', de: 'Anabin database + uni-assist evaluation', uk: 'UK ENIC (formerly NARIC)' },
  { label: 'Regulator on our side', pk: 'SECP + provincial education dept', de: 'DAAD Pakistan guidance', uk: 'British Council AQF for agents' },
];

const OK = <Check className="w-4 h-4 text-emerald-500" />;
const NA = <Minus className="w-4 h-4 text-muted-foreground" />;

export default function PathwayComparisonTable() {
  return (
    <div className="surface-card rounded-2xl border border-border/50 overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <h2 className="text-xl font-bold">Compare pathways — Pakistan, Germany, United Kingdom</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Reference figures only. Current values must be checked with the institution and competent authority at the time of application.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Feature</th>
              <th className="text-left px-4 py-3 font-semibold">🇵🇰 In-country (Pakistan)</th>
              <th className="text-left px-4 py-3 font-semibold">🇩🇪 Germany</th>
              <th className="text-left px-4 py-3 font-semibold">🇬🇧 United Kingdom</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={i} className="border-t border-border/40 align-top">
                <td className="px-4 py-3 font-medium text-foreground">{r.label}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.pk || NA}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.de}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.uk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
