import DashboardLayout from '@/components/layout/DashboardLayout';
import { Settings, Bell, Lock, Globe, Palette, Users, Shield, Database, Mail, Smartphone, Loader2, Camera, Upload, Download, Trash2, QrCode, LogOut, Check, X, ExternalLink, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// ─── Notification Preference Types ───
interface NotifPrefs {
  assignment_deadlines_email: boolean; assignment_deadlines_push: boolean; assignment_deadlines_sms: boolean;
  grade_releases_email: boolean; grade_releases_push: boolean; grade_releases_sms: boolean;
  fee_reminders_email: boolean; fee_reminders_push: boolean; fee_reminders_sms: boolean;
  attendance_warnings_email: boolean; attendance_warnings_push: boolean; attendance_warnings_sms: boolean;
  class_changes_email: boolean; class_changes_push: boolean; class_changes_sms: boolean;
  messages_email: boolean; messages_push: boolean; messages_sms: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  assignment_deadlines_email: true, assignment_deadlines_push: true, assignment_deadlines_sms: false,
  grade_releases_email: true, grade_releases_push: true, grade_releases_sms: false,
  fee_reminders_email: true, fee_reminders_push: true, fee_reminders_sms: true,
  attendance_warnings_email: true, attendance_warnings_push: true, attendance_warnings_sms: true,
  class_changes_email: true, class_changes_push: true, class_changes_sms: false,
  messages_email: false, messages_push: true, messages_sms: false,
};

const PREF_CATEGORIES = [
  { key: 'assignment_deadlines', label: 'Assignment deadlines', desc: 'Reminders before assignments are due' },
  { key: 'grade_releases', label: 'Grade releases', desc: 'When a new grade is published' },
  { key: 'fee_reminders', label: 'Fee reminders', desc: 'Payment due and overdue alerts' },
  { key: 'attendance_warnings', label: 'Attendance warnings', desc: 'When attendance drops below threshold' },
  { key: 'class_changes', label: 'Class changes', desc: 'Cancellations and rescheduling' },
  { key: 'messages', label: 'Messages', desc: 'New messages from staff' },
] as const;

export default function SettingsPage() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [profileData, setProfileData] = useState({
    full_name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ─── 2FA state ───
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [mfaUnenrolling, setMfaUnenrolling] = useState(false);

  // ─── Session state ───
  const [currentSession, setCurrentSession] = useState<{ created_at?: string; user_agent?: string } | null>(null);

  // ─── Notification preferences state ───
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  // ─── Branding state ───
  const [brandData, setBrandData] = useState({ brand_name: '', primary_color: '#8B1538', accent_color: '#D4A853', logo_url: '' });
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandSaving, setBrandSaving] = useState(false);
  const brandLogoRef = useRef<HTMLInputElement>(null);

  // ─── Load session, MFA status, notif prefs, branding on mount ───
  useEffect(() => {
    if (!user) return;

    // Session info
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setCurrentSession({
          created_at: data.session.expires_at ? new Date((data.session.expires_at - 3600) * 1000).toLocaleString() : undefined,
        });
      }
    });

    // MFA status
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.find(f => f.status === 'verified');
      setMfaEnabled(!!totp);
      if (totp) setMfaFactorId(totp.id);
    });

    // Notification preferences
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const { id, user_id, created_at, updated_at, ...prefs } = data as any;
          setNotifPrefs({ ...DEFAULT_PREFS, ...prefs });
        }
        setNotifLoading(false);
      });

    // Branding (for centre_director / superadmin)
    if (user.tenantId) {
      supabase
        .from('tenants')
        .select('name, brand_name, primary_color, accent_color, logo_url')
        .eq('id', user.tenantId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setBrandData({
              brand_name: (data as any).brand_name || (data as any).name || '',
              primary_color: (data as any).primary_color || '#8B1538',
              accent_color: (data as any).accent_color || '#D4A853',
              logo_url: (data as any).logo_url || '',
            });
          }
          setBrandLoading(false);
        });
    } else {
      setBrandLoading(false);
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadErr) {
      toast.error('Failed to upload avatar');
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', user.id);
    await refreshProfile();
    setUploadingAvatar(false);
    toast.success('Avatar updated');
  };

  const sections = [
    { id: 'profile', label: 'My Profile', icon: Camera },
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'privacy', label: 'Privacy & GDPR', icon: Shield },
    { id: 'data', label: 'Data & Backup', icon: Database },
  ];

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileData.full_name,
        phone: profileData.phone || null,
      })
      .eq('user_id', user.id);
    setSavingProfile(false);

    if (error) {
      toast.error('Failed to update profile');
      return;
    }
    await refreshProfile();
    toast.success('Profile updated successfully');
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    setChangingPassword(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setPasswords({ current: '', new: '', confirm: '' });
    toast.success('Password changed successfully');
  };

  // ─── 2FA handlers ───
  const handleEnrollMfa = async () => {
    setMfaEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' });
    setMfaEnrolling(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMfaQr(data.totp.qr_code);
    setMfaSecret(data.totp.secret);
    setMfaFactorId(data.id);
    setMfaDialogOpen(true);
  };

  const handleVerifyMfa = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setMfaVerifying(true);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (cErr) {
      toast.error(cErr.message);
      setMfaVerifying(false);
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.id, code: mfaCode });
    setMfaVerifying(false);
    if (vErr) {
      toast.error('Invalid code, please try again');
      return;
    }
    setMfaEnabled(true);
    setMfaDialogOpen(false);
    setMfaCode('');
    toast.success('Two-factor authentication enabled!');
  };

  const handleUnenrollMfa = async () => {
    if (!mfaFactorId) return;
    setMfaUnenrolling(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
    setMfaUnenrolling(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMfaEnabled(false);
    setMfaFactorId(null);
    toast.success('Two-factor authentication disabled');
  };

  // ─── Notification save ───
  const handleSaveNotifPrefs = async () => {
    if (!user) return;
    setNotifSaving(true);
    const payload = { ...notifPrefs, user_id: user.id, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' });
    setNotifSaving(false);
    if (error) {
      toast.error('Failed to save preferences');
      return;
    }
    toast.success('Notification preferences saved');
  };

  const toggleNotifPref = (key: string) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !(prev as any)[key] }));
  };

  // ─── Branding save ───
  const handleSaveBranding = async () => {
    if (!user?.tenantId) return;
    setBrandSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        brand_name: brandData.brand_name,
        primary_color: brandData.primary_color,
        accent_color: brandData.accent_color,
        logo_url: brandData.logo_url,
      })
      .eq('id', user.tenantId);
    setBrandSaving(false);
    if (error) {
      toast.error('Failed to save branding');
      return;
    }
    toast.success('Branding updated successfully');
  };

  const handleBrandLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.tenantId) return;
    const path = `${user.tenantId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed'); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    setBrandData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
    toast.success('Logo uploaded — save to apply');
  };

  const inputClass = 'w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all';

  return (
    <DashboardLayout title="Settings" subtitle="Platform configuration and preferences">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Sidebar */}
        <div className="lg:w-52 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 px-3 py-2 lg:py-2.5 rounded-lg text-sm transition-default text-left whitespace-nowrap ${
                  activeSection === s.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <s.icon className="w-4 h-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 surface-card p-6">
          {/* ─── PROFILE ─── */}
          {activeSection === 'profile' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">My Profile</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative group">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-default"
                  >
                    {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" /> : <Upload className="w-5 h-5 text-primary-foreground" />}
                  </button>
                </div>
                <div>
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-label mb-1.5 block">Full Name</label>
                  <input value={profileData.full_name} onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Email</label>
                  <input value={user?.email || ''} disabled className={`${inputClass} opacity-60`} />
                  <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed here</p>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Phone / WhatsApp</label>
                  <input value={profileData.phone} onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))} placeholder="+92 300 1234567" className={inputClass} />
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Profile
                </Button>
              </div>
            </div>
          )}

          {/* ─── GENERAL ─── */}
          {activeSection === 'general' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-label mb-1.5 block">Centre Name</label>
                  <input defaultValue="UniPathway Lahore" className={inputClass} />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Contact Email</label>
                  <input defaultValue="admin@unipathway.pk" className={inputClass} />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Timezone</label>
                  <select className={inputClass}>
                    <option>Asia/Karachi (PKT, UTC+5)</option>
                    <option>Europe/London (GMT/BST)</option>
                    <option>America/Toronto (EST)</option>
                  </select>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Default Language</label>
                  <select className={inputClass}>
                    <option>English (UK)</option>
                    <option>Urdu</option>
                    <option>Arabic</option>
                  </select>
                </div>
                <Button>Save Changes</Button>
              </div>
            </div>
          )}

          {/* ─── NOTIFICATIONS (persisted) ─── */}
          {activeSection === 'notifications' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">Notification Preferences</h3>
              {notifLoading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
              ) : (
                <div className="space-y-4">
                  {PREF_CATEGORIES.map(cat => (
                    <div key={cat.key} className="flex items-center justify-between py-3 border-b border-border/50">
                      <div>
                        <p className="text-sm font-medium">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{cat.desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(['email', 'push', 'sms'] as const).map(channel => {
                          const prefKey = `${cat.key}_${channel}` as keyof NotifPrefs;
                          const Icon = channel === 'email' ? Mail : channel === 'push' ? Smartphone : Bell;
                          return (
                            <button
                              key={channel}
                              onClick={() => toggleNotifPref(prefKey)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-default ${
                                notifPrefs[prefKey] ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                              }`}
                              title={`${channel} ${notifPrefs[prefKey] ? 'on' : 'off'}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <Button onClick={handleSaveNotifPrefs} disabled={notifSaving}>
                    {notifSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Preferences
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ─── SECURITY (2FA + sessions) ─── */}
          {activeSection === 'security' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">Security Settings</h3>
              <div className="space-y-4">
                {/* Change Password */}
                <div className="surface-data p-4 rounded-lg">
                  <p className="text-sm font-medium mb-3">Change Password</p>
                  <div className="space-y-3">
                    <input type="password" placeholder="New password" value={passwords.new} onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))} className={inputClass} />
                    <input type="password" placeholder="Confirm new password" value={passwords.confirm} onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))} className={inputClass} />
                    <Button onClick={handleChangePassword} disabled={changingPassword} size="sm">
                      {changingPassword && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                      Update Password
                    </Button>
                  </div>
                </div>

                {/* 2FA — wired to MFA */}
                <div className="surface-data p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mfaEnabled ? 'bg-success/10' : 'bg-secondary'}`}>
                        <QrCode className={`w-4 h-4 ${mfaEnabled ? 'text-success' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">
                          {mfaEnabled ? 'Authenticator app enabled' : 'Add an extra layer of security'}
                        </p>
                      </div>
                    </div>
                    {mfaEnabled ? (
                      <Button variant="outline" size="sm" onClick={handleUnenrollMfa} disabled={mfaUnenrolling} className="text-destructive border-destructive/30">
                        {mfaUnenrolling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        Disable
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleEnrollMfa} disabled={mfaEnrolling}>
                        {mfaEnrolling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <QrCode className="w-3 h-3 mr-1" />}
                        Enable
                      </Button>
                    )}
                  </div>
                </div>

                {/* Active Sessions — real data */}
                <div className="surface-data p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">Active Sessions</p>
                      <p className="text-xs text-muted-foreground">Your current login session</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-secondary/50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                        <div>
                          <p className="text-xs font-medium">Current Device</p>
                          <p className="text-[10px] text-muted-foreground">
                            {currentSession?.created_at ? `Session started: ${currentSession.created_at}` : 'Active now'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-success/10 text-success font-semibold">Active</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={async () => {
                      await supabase.auth.signOut({ scope: 'others' });
                      toast.success('All other sessions signed out');
                    }}
                  >
                    <LogOut className="w-3 h-3 mr-1" /> Sign Out Other Sessions
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ─── BRANDING (real editor) ─── */}
          {activeSection === 'branding' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-1">Branding Settings</h3>
              <p className="text-xs text-muted-foreground mb-6">Customise your centre's public-facing appearance</p>
              {brandLoading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
              ) : !user?.tenantId ? (
                <div className="text-center py-12">
                  <Palette className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">Branding is available for centres with an active tenant configuration.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Logo */}
                  <div>
                    <label className="text-label mb-2 block">Centre Logo</label>
                    <div className="flex items-center gap-4">
                      {brandData.logo_url ? (
                        <img src={brandData.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-border bg-secondary p-1" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-secondary border border-border flex items-center justify-center">
                          <Palette className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <input ref={brandLogoRef} type="file" accept="image/*" className="hidden" onChange={handleBrandLogoUpload} />
                        <Button variant="outline" size="sm" onClick={() => brandLogoRef.current?.click()}>
                          <Upload className="w-3 h-3 mr-1" /> Upload Logo
                        </Button>
                        <p className="text-[10px] text-muted-foreground mt-1">Recommended: 200×200px, PNG or SVG</p>
                      </div>
                    </div>
                  </div>

                  {/* Brand Name */}
                  <div>
                    <label className="text-label mb-1.5 block">Brand Name</label>
                    <input value={brandData.brand_name} onChange={e => setBrandData(p => ({ ...p, brand_name: e.target.value }))} className={inputClass} placeholder="e.g. UniPathway" />
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-label mb-1.5 block">Primary Colour</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={brandData.primary_color} onChange={e => setBrandData(p => ({ ...p, primary_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                        <input value={brandData.primary_color} onChange={e => setBrandData(p => ({ ...p, primary_color: e.target.value }))} className={`${inputClass} flex-1`} />
                      </div>
                    </div>
                    <div>
                      <label className="text-label mb-1.5 block">Accent Colour</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={brandData.accent_color} onChange={e => setBrandData(p => ({ ...p, accent_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                        <input value={brandData.accent_color} onChange={e => setBrandData(p => ({ ...p, accent_color: e.target.value }))} className={`${inputClass} flex-1`} />
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="text-label mb-2 block">Preview</label>
                    <div className="rounded-xl border border-border p-4 bg-background">
                      <div className="flex items-center gap-3 mb-3">
                        {brandData.logo_url ? (
                          <img src={brandData.logo_url} alt="Preview" className="w-8 h-8 rounded-lg object-contain" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandData.primary_color }}>
                            <span className="text-primary-foreground text-xs font-bold">{brandData.brand_name?.charAt(0) || 'U'}</span>
                          </div>
                        )}
                        <span className="font-bold text-sm">{brandData.brand_name || 'Your Centre'}</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 rounded-lg px-4 flex items-center text-xs font-semibold text-primary-foreground" style={{ backgroundColor: brandData.primary_color }}>Primary</div>
                        <div className="h-8 rounded-lg px-4 flex items-center text-xs font-semibold text-primary-foreground" style={{ backgroundColor: brandData.accent_color }}>Accent</div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveBranding} disabled={brandSaving}>
                    {brandSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Branding
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ─── INTEGRATIONS (status panel) ─── */}
          {activeSection === 'integrations' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-1">Integrations</h3>
              <p className="text-xs text-muted-foreground mb-6">Connected services and external platforms</p>
              <div className="space-y-3">
                {[
                  { name: 'Stripe Payments', desc: 'Fee collection and invoicing', icon: '💳', connected: true, status: 'Active' },
                  { name: 'Email Service', desc: 'Transactional emails and notifications', icon: '📧', connected: true, status: 'Active' },
                  { name: 'WhatsApp Business', desc: 'Student and parent messaging', icon: '💬', connected: true, status: 'Active' },
                  { name: 'SMS Gateway', desc: 'Attendance and fee reminders', icon: '📱', connected: false, status: 'Not configured' },
                  { name: 'Jitsi Meet', desc: 'Virtual classroom video conferencing', icon: '🎥', connected: true, status: 'Active' },
                  { name: 'AWS WorkSpaces', desc: 'Cloud-based IT lab VMs', icon: '☁️', connected: false, status: 'Not configured' },
                  { name: 'Google Calendar', desc: 'Academic calendar sync', icon: '📅', connected: false, status: 'Not configured' },
                  { name: 'LMS Export', desc: 'SCORM/xAPI content packages', icon: '📦', connected: false, status: 'Not configured' },
                ].map(integration => (
                  <div key={integration.name} className="surface-data p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{integration.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">{integration.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${integration.connected ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                        {integration.status}
                      </span>
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        {integration.connected ? 'Configure' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── PRIVACY & GDPR ─── */}
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

                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div>
                    <p className="text-sm font-medium">Data Export</p>
                    <p className="text-xs text-muted-foreground">Download all your personal data as JSON</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={exportingData}
                    onClick={async () => {
                      if (!user) return;
                      setExportingData(true);
                      const { data, error } = await supabase.rpc('export_user_data', { _user_id: user.id });
                      setExportingData(false);
                      if (error) { toast.error('Export failed'); return; }
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `educloud-data-export-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click(); URL.revokeObjectURL(url);
                      toast.success('Data exported successfully');
                    }}
                  >
                    {exportingData ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div>
                    <p className="text-sm font-medium">Consent Records</p>
                    <p className="text-xs text-muted-foreground">View your consent history</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                    const consent = localStorage.getItem('cookie_consent');
                    toast.info(`Cookie consent: ${consent || 'Not set'}. GDPR consent: Given at registration.`);
                  }}>View</Button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div>
                    <p className="text-sm font-medium">Privacy Notice</p>
                    <p className="text-xs text-muted-foreground">Read our privacy policy</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate('/privacy')}>Read</Button>
                </div>

                {/* Account Deletion */}
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div>
                    <p className="text-sm font-medium text-destructive">Delete Account</p>
                    <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  {!showDeleteConfirm ? (
                    <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Request
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        disabled={deletingAccount}
                        onClick={async () => {
                          if (!user) return;
                          setDeletingAccount(true);
                          const { error } = await supabase.rpc('delete_user_account', { _user_id: user.id });
                          if (error) { toast.error('Deletion failed'); setDeletingAccount(false); return; }
                          await logout();
                          navigate('/');
                          toast.success('Account deleted');
                        }}
                      >
                        {deletingAccount ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        Confirm Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── USER MANAGEMENT / DATA & BACKUP — placeholder for roles outside scope ─── */}
          {activeSection === 'users' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-1">User Management</h3>
              <p className="text-xs text-muted-foreground mb-6">Manage staff and student accounts</p>
              <div className="space-y-3">
                <div className="surface-data p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Invite Users</p>
                    <p className="text-xs text-muted-foreground">Send invitation emails to new staff or students</p>
                  </div>
                  <Button variant="outline" size="sm">Invite</Button>
                </div>
                <div className="surface-data p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Bulk Import</p>
                    <p className="text-xs text-muted-foreground">Upload CSV to create multiple accounts</p>
                  </div>
                  <Button variant="outline" size="sm">Import</Button>
                </div>
                <div className="surface-data p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Role Assignments</p>
                    <p className="text-xs text-muted-foreground">Manage role-based access for your centre</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/director/staff')}>Manage</Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-1">Data & Backup</h3>
              <p className="text-xs text-muted-foreground mb-6">Data management and export tools</p>
              <div className="space-y-3">
                <div className="surface-data p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Export Students</p>
                    <p className="text-xs text-muted-foreground">Download student records as CSV</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={async () => {
                    toast.info('Generating export…');
                    const { data } = await supabase.from('profiles').select('full_name, email, phone, created_at');
                    if (data?.length) {
                      const csv = ['Name,Email,Phone,Created\n', ...data.map(r => `"${r.full_name}","${r.email}","${r.phone || ''}","${r.created_at}"\n`)].join('');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `students-export-${new Date().toISOString().slice(0,10)}.csv`;
                      a.click(); URL.revokeObjectURL(url);
                      toast.success('Export downloaded');
                    } else toast.error('No data found');
                  }}>
                    <Download className="w-3 h-3 mr-1" /> Export
                  </Button>
                </div>
                <div className="surface-data p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Export Invoices</p>
                    <p className="text-xs text-muted-foreground">Download financial records as CSV</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const { data } = await supabase.from('invoices').select('student_name, type, amount, paid, status, due_date, issued_date');
                    if (data?.length) {
                      const csv = ['Student,Type,Amount,Paid,Status,Due,Issued\n', ...data.map(r => `"${r.student_name}","${r.type}",${r.amount},${r.paid},"${r.status}","${r.due_date}","${r.issued_date}"\n`)].join('');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `invoices-export-${new Date().toISOString().slice(0,10)}.csv`;
                      a.click(); URL.revokeObjectURL(url);
                      toast.success('Export downloaded');
                    } else toast.error('No data found');
                  }}>
                    <Download className="w-3 h-3 mr-1" /> Export
                  </Button>
                </div>
                <div className="surface-data p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Audit Logs</p>
                    <p className="text-xs text-muted-foreground">View system activity and changes</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/audit')}>View</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2FA Enrollment Dialog ─── */}
      <Dialog open={mfaDialogOpen} onOpenChange={setMfaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" /> Set Up 2FA</DialogTitle>
            <DialogDescription>Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {mfaQr && (
              <div className="flex justify-center">
                <img src={mfaQr} alt="2FA QR Code" className="w-48 h-48 rounded-xl border border-border" />
              </div>
            )}
            {mfaSecret && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Or enter manually:</p>
                <code className="text-xs bg-secondary px-3 py-1.5 rounded font-mono select-all">{mfaSecret}</code>
              </div>
            )}
            <div>
              <label className="text-label mb-1.5 block">Verification Code</label>
              <input
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full bg-secondary text-center text-lg font-mono tracking-[0.5em] px-3 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMfaDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVerifyMfa} disabled={mfaVerifying || mfaCode.length !== 6}>
              {mfaVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
