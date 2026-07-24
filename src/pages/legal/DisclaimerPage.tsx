import { Link } from 'react-router-dom';
import { Cloud, ArrowLeft } from 'lucide-react';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm shadow-surface-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Cloud className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">UniPathway</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Regulatory & Consumer Disclaimer</h1>
        <p className="text-muted-foreground mb-8">Last updated: 24 July 2026</p>

        <div className="space-y-6 text-foreground/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Nature of service</h2>
            <p>UniPathway is a Pakistan-registered education-counselling and language-preparation service. We assist Pakistani students with university admissions guidance for the UK and Germany, and deliver exam-preparation courses for IELTS, PTE, TOEFL, TestDaF, telc and Goethe.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">No guarantees</h2>
            <p>We do not guarantee admission, CAS issuance, scholarships, or visa outcomes. Admission decisions rest with the receiving institution (or uni-assist for Germany). Visa decisions are made by UK Visas and Immigration (UKVI) or the competent German authority.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Language certification</h2>
            <p>Our language courses are teaching and exam preparation only. Official proficiency certificates (IELTS, PTE, TOEFL, TestDaF, telc, Goethe) are issued exclusively by the authorised examination body. Course fees do not include the official examination fee unless explicitly stated.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Fees and living costs</h2>
            <p>Tuition, blocked-account (Sperrkonto), maintenance-fund, and living-cost figures shown across UniPathway pages are indicative. Verify all figures against current GOV.UK, UKVI, DAAD Pakistan, and Make it in Germany guidance at the time you apply.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Immigration and employment</h2>
            <p>UniPathway does not provide immigration advice as defined by the UK Immigration Advice Authority, and does not undertake overseas job placement outside SECP and BEOE boundaries. For regulated immigration advice, please consult a suitably authorised adviser.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">External links</h2>
            <p>Links to third-party sites are provided for convenience. We are not responsible for their content, availability, or practices.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
