import { Link } from 'react-router-dom';
import { Cloud, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm shadow-surface-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Cloud className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">EduCloud</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: 16 March 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/80">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p>EduCloud ("we", "our", "us") is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and share your information when you use our education management platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> Name, email, phone number, role, and profile photo.</li>
              <li><strong>Education data:</strong> Enrolment records, grades, attendance, submissions, and progression history.</li>
              <li><strong>Financial data:</strong> Invoice records, payment status, and instalment plans.</li>
              <li><strong>Usage data:</strong> Login timestamps, feature usage, and device information.</li>
              <li><strong>Communication data:</strong> Messages sent within the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Legal Basis (GDPR)</h2>
            <p>We process your data under the following legal bases:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Consent:</strong> When you register and agree to data processing.</li>
              <li><strong>Contractual necessity:</strong> To deliver the education services you enrolled in.</li>
              <li><strong>Legal obligation:</strong> To comply with UK education regulations and accreditation requirements.</li>
              <li><strong>Legitimate interest:</strong> To improve our platform and prevent fraud.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Your Rights</h2>
            <p>Under GDPR, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your personal data (Settings → Privacy & GDPR → Export Data)</li>
              <li>Rectify inaccurate data via your profile settings</li>
              <li>Erase your account and all associated data (Settings → Privacy & GDPR → Delete Account)</li>
              <li>Restrict or object to processing</li>
              <li>Data portability (JSON export)</li>
              <li>Lodge a complaint with the ICO (Information Commissioner's Office)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. Education records may be retained for up to 6 years after course completion to meet accreditation body requirements (OTHM, QUALIFI, IAB). You may request early deletion subject to regulatory obligations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Data Security</h2>
            <p>All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Access is controlled through role-based permissions with row-level security at the database level. Multi-tenant isolation ensures your institution's data is never accessible by other tenants.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Third-Party Sharing</h2>
            <p>We do not sell your data. We may share data with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Accreditation bodies (OTHM, QUALIFI, IAB) as required for programme validation</li>
              <li>University partners for progression applications (with your consent)</li>
              <li>Payment processors for financial transactions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
            <p>For data protection enquiries, contact our Data Protection Officer at <strong>dpo@educloud.pk</strong>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
