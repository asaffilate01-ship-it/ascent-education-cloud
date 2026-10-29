import PublicFooter from '@/components/PublicFooter';
import SocialIcons from '@/components/SocialIcons';
import PublicHero from '@/components/PublicHero';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, Clock, Send, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import TenantNav from '@/components/TenantNav';
import { supabase } from '@/integrations/supabase/client';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import Seo from '@/components/Seo';
export default function TenantContactPage() {
  const {slug}=useParams();
  return <ContactWorkspace key={slug||'unipathway'} slug={slug}/>;
}
function ContactWorkspace({slug}:{slug?:string}) {
  const [params] = useSearchParams();
  const requestedCourse = (params.get('course') || '').slice(0,240);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: params.get('subject') === 'Course Enquiry' || requestedCourse ? 'Course Enquiry' : '', message: requestedCourse ? `I would like to enquire about ${requestedCourse}. Please confirm entry requirements, delivery, duration, fees and the next intake.` : '' });
  const [sending, setSending] = useState(false);
  const pending=useRef(false),alive=useRef(true);
  const [feedback,setFeedback]=useState<{kind:'success'|'error';message:string}|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const { brandName, primaryColor } = useTenantBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(pending.current)return;
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    pending.current=true;setSending(true);setFeedback(null);
    try {
      const { data, error } = await supabase.functions.invoke('contact-form', {
        body: { ...formData, tenant_slug: slug || 'unipathway' },
      });
      if(!alive.current)return;
      if (error || data?.success!==true) throw new Error('Your message could not be confirmed. Please try again.');
      const message='Message sent. Our admissions team will reply using your contact details.';
      setFeedback({kind:'success',message});toast.success(message);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      if(!alive.current)return;
      const message='Your message could not be confirmed. Your details are still here. Please retry or contact admissions by email.';
      setFeedback({kind:'error',message});toast.error(message);
    } finally {
      pending.current=false;if(alive.current)setSending(false);
    }
  };

  return (
    <div className="public-site min-h-dvh bg-background">
      <Seo title="Contact UniPathway — Talk to an Admissions Adviser" description="Speak to a UniPathway adviser about UK and Germany study pathways, diplomas, language courses and visa guidance. Ask about online and in-class learning." canonical="/contact" />
      <TenantNav brandName={brandName} primaryColor={primaryColor} activePage="contact" />

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-10"><PublicHero topic="guidance">
            <p className="text-label text-success">Talk to UniPathway</p>
            <h1 className="mt-3 text-3xl font-bold sm:text-5xl">Let’s find your next step.</h1>
            <p className="mt-4 text-muted-foreground">For students based in Pakistan. Ask about subjects, entry requirements, class times or fees, with online learning across Pakistan and in-class learning in Jhelum.</p>
            <a href="#contact-form" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">Send an enquiry</a>
            <p className="mt-4 text-sm text-muted-foreground">Use the form below for general questions. Please do not include identity documents or bank details.</p>
          </PublicHero></div>

          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Contact Info */}
            <div className="space-y-4">
              {[
                { icon: Mail, label: 'Email', value: 'admissions@unipathway.pk' },
                { icon: Globe, label: 'Website', value: 'www.unipathway.pk' },
                { icon: Clock, label: 'Office Hours', value: 'Mon-Fri: 9:00 AM - 6:00 PM (PKT)' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{item.label}</p>
                    <p className="text-sm">{item.icon === Mail ? <a className="inline-flex min-h-11 items-center underline underline-offset-4" href={`mailto:${item.value}`}>{item.value}</a> : item.value}</p>
                  </div>
                </div>
              ))}


              <SocialIcons />

            </div>

            {/* Form */}
            <form id="contact-form" aria-busy={sending} onSubmit={handleSubmit} className="scroll-mt-28 lg:col-span-2 surface-card p-4 sm:p-6">
              <h3 className="text-lg font-bold mb-4">Send us a message</h3>
              {feedback&&<p role={feedback.kind==='error'?'alert':'status'} className="mb-4 rounded-lg border p-3 text-sm">{feedback.message}</p>}
              <fieldset disabled={sending} className="min-w-0">
              <legend className="sr-only">Admissions enquiry details</legend>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="contact-name" className="text-label mb-1.5 block">Full Name *</label>
                  <input id="contact-name" name="name" required autoComplete="name" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-secondary text-base sm:text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="Your name" />
                </div>
                <div>
                  <label htmlFor="contact-email" className="text-label mb-1.5 block">Email *</label>
                  <input id="contact-email" name="email" required autoComplete="email" type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full bg-secondary text-base sm:text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="you@example.com" />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="text-label mb-1.5 block">Phone / WhatsApp (Pakistan)</label>
                  <input id="contact-phone" name="phone" type="tel" autoComplete="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-secondary text-base sm:text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="+92" />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="text-label mb-1.5 block">Subject</label>
                  <select id="contact-subject" name="subject" value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} className="w-full bg-secondary text-base sm:text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select a topic</option>
                    <option>Course Enquiry</option>
                    <option>Admissions Enquiry</option>
                    <option>Fee Information</option>
                    <option>Programme Details</option>
                    <option>University Progression</option>
                    <option>Agent Partnership</option>
                    <option>Technical Support</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="contact-message" className="text-label mb-1.5 block">Message *</label>
                <textarea id="contact-message" name="message" required
                  value={formData.message}
                  onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                  rows={5}
                  className="w-full bg-secondary text-base sm:text-sm px-3 py-2.5 rounded-lg outline-none resize-none focus:ring-2 focus:ring-primary/20"
                  placeholder="How can we help you?"
                />
              </div>
              <Button className="px-8" type="submit" disabled={sending}>
                {sending ? 'Sending...' : <><Send className="w-4 h-4 mr-1.5" /> Send Message</>}
              </Button>
              </fieldset>
            </form>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
