import DashboardLayout from '@/components/layout/DashboardLayout';
import { Settings, Bell, Lock, Globe, Palette, Users, Shield, Database, Mail, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'privacy', label: 'Privacy & GDPR', icon: Shield },
    { id: 'data', label: 'Data & Backup', icon: Database },
  ];

  return (
    <DashboardLayout title="Settings" subtitle="Platform configuration and preferences">
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 shrink-0">
          <div className="space-y-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-default text-left ${
                  activeSection === s.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 surface-card p-6">
          {activeSection === 'general' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-label mb-1.5 block">Centre Name</label>
                  <input defaultValue="EduPathway Lahore" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Contact Email</label>
                  <input defaultValue="admin@edupathway.pk" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Timezone</label>
                  <select className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none">
                    <option>Asia/Karachi (PKT, UTC+5)</option>
                    <option>Europe/London (GMT/BST)</option>
                    <option>America/Toronto (EST)</option>
                  </select>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Default Language</label>
                  <select className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none">
                    <option>English (UK)</option>
                    <option>Urdu</option>
                    <option>Arabic</option>
                  </select>
                </div>
                <Button>Save Changes</Button>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { label: 'Assignment deadlines', desc: 'Reminders before assignments are due', email: true, push: true, sms: false },
                  { label: 'Grade releases', desc: 'When a new grade is published', email: true, push: true, sms: false },
                  { label: 'Fee reminders', desc: 'Payment due and overdue alerts', email: true, push: true, sms: true },
                  { label: 'Attendance warnings', desc: 'When attendance drops below threshold', email: true, push: true, sms: true },
                  { label: 'Class changes', desc: 'Cancellations and rescheduling', email: true, push: true, sms: false },
                  { label: 'Messages', desc: 'New messages from staff', email: false, push: true, sms: false },
                ].map((pref) => (
                  <div key={pref.label} className="flex items-center justify-between py-3 border-b border-border/50">
                    <div>
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-xs text-muted-foreground">{pref.desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {[
                        { key: 'email', icon: Mail, enabled: pref.email },
                        { key: 'push', icon: Smartphone, enabled: pref.push },
                        { key: 'sms', icon: Bell, enabled: pref.sms },
                      ].map((ch) => (
                        <button
                          key={ch.key}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-default ${
                            ch.enabled ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          <ch.icon className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button>Save Preferences</Button>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="surface-data p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" size="sm">Enable</Button>
                  </div>
                </div>
                <div className="surface-data p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Change Password</p>
                      <p className="text-xs text-muted-foreground">Last changed 45 days ago</p>
                    </div>
                    <Button variant="outline" size="sm">Change</Button>
                  </div>
                </div>
                <div className="surface-data p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Active Sessions</p>
                      <p className="text-xs text-muted-foreground">2 devices currently logged in</p>
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                </div>
                <div className="surface-data p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Login History</p>
                      <p className="text-xs text-muted-foreground">View recent login attempts</p>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">Privacy & GDPR</h3>
              <div className="space-y-4">
                <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-success" />
                    <span className="text-sm font-semibold text-success">GDPR Compliant</span>
                  </div>
                  <p className="text-xs text-muted-foreground">All data processing complies with GDPR regulations. Student data is encrypted at rest and in transit.</p>
                </div>
                {[
                  { label: 'Data Export', desc: 'Download all your personal data', action: 'Export' },
                  { label: 'Consent Records', desc: 'View your consent history', action: 'View' },
                  { label: 'Privacy Notice', desc: 'Read our privacy policy', action: 'Read' },
                  { label: 'Data Deletion', desc: 'Request deletion of your account', action: 'Request' },
                  { label: 'Document Retention', desc: 'Academic records retained per policy', action: 'Details' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-border/50">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs">{item.action}</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!['general', 'notifications', 'security', 'privacy'].includes(activeSection) && (
            <div className="max-w-lg text-center py-12">
              <Settings className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground">
                {sections.find(s => s.id === activeSection)?.label} settings
              </p>
              <p className="text-xs text-muted-foreground mt-1">Configuration options will appear here</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
