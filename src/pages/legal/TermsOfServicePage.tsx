import { Link } from 'react-router-dom';
import { Cloud, ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: 16 March 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/80">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Agreement</h2>
            <p>By accessing or using EduCloud, you agree to be bound by these Terms. EduCloud is a multi-tenant education management platform provided as a Software-as-a-Service (SaaS) solution.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Accounts & Roles</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate information during registration.</li>
              <li>You are responsible for maintaining account security.</li>
              <li>Self-registration is available for Student and Agent roles only.</li>
              <li>Administrative roles are assigned by Centre Directors or Platform Owners.</li>
              <li>You must not attempt to escalate your role privileges.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Subscription Plans (Centres)</h2>
            <p>Education centres subscribe to EduCloud on a monthly basis:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Starter (Rs.75,000/mo):</strong> Up to 50 students, basic LMS, 1 admin.</li>
              <li><strong>Professional (Rs.150,000/mo):</strong> Up to 500 students, full platform, 5 admins.</li>
              <li><strong>Enterprise (Rs.300,000/mo):</strong> Unlimited students, full platform, custom domain, SLA.</li>
            </ul>
            <p>Subscriptions auto-renew unless cancelled 30 days before the billing date.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Acceptable Use</h2>
            <p>You must not:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Upload plagiarised work or engage in academic dishonesty</li>
              <li>Share login credentials with unauthorised persons</li>
              <li>Attempt to access other tenants' data</li>
              <li>Use the platform for any unlawful purpose</li>
              <li>Circumvent security controls or RLS policies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Intellectual Property</h2>
            <p>Course content uploaded by centres remains their intellectual property. Students retain ownership of their submitted work. EduCloud retains ownership of the platform software, design, and infrastructure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Termination</h2>
            <p>We may suspend or terminate accounts that violate these Terms. Centres may cancel their subscription at any time. Upon termination, data export is available for 30 days before permanent deletion.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Liability</h2>
            <p>EduCloud is provided "as is". We are not liable for academic outcomes, accreditation decisions, or third-party service disruptions. Our total liability is limited to fees paid in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Governing Law</h2>
            <p>These Terms are governed by the laws of England and Wales. Disputes shall be resolved in the courts of England and Wales.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
