import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, MapPin, Phone, Mail, Clock, Send, Globe, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function TenantContactPage() {
  const { slug } = useParams();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm shadow-surface-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to={`/tenant/${slug}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">EduPathway</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to={`/tenant/${slug}`} className="hover:text-foreground transition-default">Home</Link>
            <Link to={`/tenant/${slug}/courses`} className="hover:text-foreground transition-default">Courses</Link>
            <Link to={`/tenant/${slug}/about`} className="hover:text-foreground transition-default">About</Link>
            <Link to={`/tenant/${slug}/contact`} className="text-primary font-medium">Contact</Link>
            <Link to="/login"><Button variant="outline" size="sm">Login</Button></Link>
            <Link to="/apply"><Button size="sm">Apply Now</Button></Link>
          </div>
        </div>
      </nav>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-3xl font-bold text-center mb-3">Contact Us</h1>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Have questions about our programmes, admissions, or fees? Get in touch — we're here to help.
          </p>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="space-y-4">
              {[
                { icon: MapPin, label: 'Address', value: '123 Education Street, Gulberg III, Lahore, Pakistan' },
                { icon: Phone, label: 'Phone', value: '+92 42 3578 9012' },
                { icon: MessageSquare, label: 'WhatsApp', value: '+92 300 1234567' },
                { icon: Mail, label: 'Email', value: 'admissions@edupathway.pk' },
                { icon: Globe, label: 'Website', value: 'www.edupathway.pk' },
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
            <div className="lg:col-span-2 surface-card p-6">
              <h3 className="text-lg font-bold mb-4">Send us a message</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-label mb-1.5 block">Full Name</label>
                  <input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Phone / WhatsApp</label>
                  <input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" placeholder="+92" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Subject</label>
                  <select value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none">
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
                <label className="text-label mb-1.5 block">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                  rows={5}
                  className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none resize-none"
                  placeholder="How can we help you?"
                />
              </div>
              <Button className="px-8">
                <Send className="w-4 h-4 mr-1.5" /> Send Message
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
