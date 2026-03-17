import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Clock, Send, Globe, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import TenantNav from '@/components/TenantNav';
import { supabase } from '@/integrations/supabase/client';
import { useTenantBranding } from '@/hooks/useTenantBranding';
export default function TenantContactPage() {
  const { slug } = useParams();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const { brandName, primaryColor } = useTenantBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact-form', {
        body: { ...formData, tenant_slug: slug },
      });
      if (error) throw error;
      toast.success('Message sent! We\'ll get back to you within 24 hours.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TenantNav brandName={brandName} primaryColor={primaryColor} activePage="contact" />

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-3">Contact Us</h1>
          <p className="text-center text-muted-foreground mb-8 sm:mb-12 max-w-lg mx-auto text-sm sm:text-base">
            Have questions about our programmes, admissions, or fees? Get in touch — we're here to help.
          </p>

          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Contact Info */}
            <div className="space-y-4">
              {[
                { icon: MapPin, label: 'Address', value: '123 Education Street, Gulberg III, Lahore, Pakistan' },
                { icon: Phone, label: 'Phone', value: '+92 42 3578 9012' },
                { icon: MessageSquare, label: 'WhatsApp', value: '+92 300 1234567' },
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
                    <p className="text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-2 surface-card p-4 sm:p-6">
              <h3 className="text-lg font-bold mb-4">Send us a message</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-label mb-1.5 block">Full Name *</label>
                  <input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Email *</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Phone / WhatsApp</label>
                  <input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" placeholder="+92" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Subject</label>
                  <select value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select a topic</option>
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
                <label className="text-label mb-1.5 block">Message *</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                  rows={5}
                  className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none resize-none focus:ring-2 focus:ring-primary/20"
                  placeholder="How can we help you?"
                />
              </div>
              <Button className="px-8" type="submit" disabled={sending}>
                {sending ? 'Sending...' : <><Send className="w-4 h-4 mr-1.5" /> Send Message</>}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
