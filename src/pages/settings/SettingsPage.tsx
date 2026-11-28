import SettingsOperationalPanels from '@/components/settings/SettingsOperationalPanels';
import {settingsCapabilities} from '@/lib/settingsAccess';
import {INSTITUTIONAL_AUTH_ENABLED,INSTITUTIONAL_MIN_PASSWORD} from '@/lib/institutionalAuth';
import {demoAccountActionsBlocked} from '@/lib/demoAccess';
import { disableNativePush } from '@/lib/nativePush';
import NativeNotifications from '@/components/native/NativeNotifications';
import AccountOperations from '@/components/admin/AccountOperations';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Settings, Bell, Lock, Globe, Palette, Users, Shield, Database, Mail, Smartphone, Loader2, Camera, Upload, Download, Trash2, QrCode, LogOut, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
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

export default function SettingsPage(){
  const {user}=useAuth();
  return <ScopedSettings key={JSON.stringify([user?.id,user?.tenantId,user?.role,user?.roles])}/>;
}
function ScopedSettings() {
  const { user, refreshProfile, logout } = useAuth();
  const access=settingsCapabilities(user);
  const sharedDemo=demoAccountActionsBlocked(user?.email,window.location.hostname);
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
  const [currentSession,setCurrentSession]=useState<{expiresAt:string|null}|null>(null);
  const [sessionError,setSessionError]=useState(false),[mfaKnown,setMfaKnown]=useState(false);
  const [profileLoading,setProfileLoading]=useState(true),[profileError,setProfileError]=useState('');
  const [notifError,setNotifError]=useState(''),[reload,setReload]=useState(0);
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);

  // ─── Notification preferences state ───
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  // Read only the verified identity's records. Failed reads never become defaults.
  useEffect(()=>{
    let live=true;
    if(!user?.id){setProfileLoading(false);setNotifLoading(false);return()=>{live=false;};}
    const actorId=user.id;
    setProfileLoading(true);setProfileError('');setNotifLoading(true);setNotifError('');
    setCurrentSession(null);setSessionError(false);setMfaKnown(false);setMfaEnabled(false);setMfaFactorId(null);
    void supabase.auth.getSession().then(({data,error})=>{
      if(!live)return;
      if(error||data.session?.user.id!==actorId){setSessionError(true);return;}
      const expires=data.session.expires_at;
      setCurrentSession({expiresAt:typeof expires==='number'&&Number.isFinite(expires)?new Date(expires*1000).toLocaleString():null});
    }).catch(()=>{if(live)setSessionError(true);});
    void supabase.auth.mfa.listFactors().then(({data,error})=>{
      if(!live||error||!data||!Array.isArray(data.totp))return;
      const totp=data.totp.find(f=>f.status==='verified');setMfaKnown(true);setMfaEnabled(!!totp);setMfaFactorId(totp?.id||null);
    }).catch(()=>{});
    void(async()=>{
      try{
        const {data,error}=await supabase.from('profiles').select('user_id,full_name,phone').eq('user_id',actorId).maybeSingle();
        if(!live)return;
        if(error||!data||data.user_id!==actorId||typeof data.full_name!=='string'||!(data.phone===null||typeof data.phone==='string'))throw Error('Profile unavailable');
        setProfileData({full_name:data.full_name,email:user.email,phone:data.phone||''});
      }catch{if(live)setProfileError('Profile could not be verified. Retry before editing.');}
      finally{if(live)setProfileLoading(false);}
    })();
    void(async()=>{
      try{
        const {data,error}=await supabase.from('notification_preferences').select('*').eq('user_id',actorId).maybeSingle();
        if(!live)return;
        if(error||(data&&data.user_id!==actorId))throw Error('Preferences unavailable');
        const prefs={...DEFAULT_PREFS};
        if(data)for(const key of Object.keys(prefs) as (keyof NotifPrefs)[]){
          const value=(data as unknown as Record<string,unknown>)[key];
          if(typeof value!=='boolean')throw Error('Unverified preference');
          prefs[key]=value;
        }
        setNotifPrefs(prefs);
      }catch{if(live)setNotifError('Notification preferences could not be verified. Retry before editing.');}
      finally{if(live)setNotifLoading(false);}
    })();
    return()=>{live=false;};
  },[user?.id,user?.email,reload]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if(sharedDemo){toast.error('The shared demonstration identity is managed by the demo administrator.');return;}
    const file = e.target.files?.[0];
    if (!file || !user||profileLoading||profileError||uploadingAvatar) return;
    setUploadingAvatar(true);
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadErr) {
      toast.error('Failed to upload avatar');
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const receipt=await supabase.from('profiles').update({avatar_url:urlData.publicUrl}).eq('user_id',user.id).select('user_id,avatar_url').maybeSingle();
    if(!active.current)return;
    setUploadingAvatar(false);
    if(receipt.error||receipt.data?.user_id!==user.id||receipt.data.avatar_url!==urlData.publicUrl){toast.error('Avatar upload completed but profile update could not be verified.');return;}
    await refreshProfile();
    if(active.current)toast.success('Avatar updated');
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
  ].filter(section=>section.id==='branding'?access.branding:section.id==='integrations'?access.leadership:section.id==='users'?access.users:section.id==='data'?access.data:true);

  const handleSaveProfile = async () => {
    if(sharedDemo||!user||profileLoading||profileError||savingProfile)return;
    const name=profileData.full_name.trim(),phone=profileData.phone.trim();
    if(!name||name.length>160||phone.length>40){toast.error('Enter a valid name and phone number.');return;}
    setSavingProfile(true);
    try{
      const {data,error}=await supabase.from('profiles').update({full_name:name,phone:phone||null}).eq('user_id',user.id).select('user_id,full_name,phone').maybeSingle();
      if(!active.current)return;
      if(error||data?.user_id!==user.id||data.full_name!==name||data.phone!==(phone||null))throw Error('Unconfirmed profile update');
      await refreshProfile();
      if(active.current)toast.success('Profile update verified');
    }catch{if(active.current)toast.error('Profile update could not be verified. Refresh before retrying.');}
    finally{if(active.current)setSavingProfile(false);}
  };

  const handleChangePassword = async () => {
    if(sharedDemo){toast.error('The shared demonstration identity is managed by the demo administrator.');return;}
    if (passwords.new !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    const minimum=INSTITUTIONAL_AUTH_ENABLED?INSTITUTIONAL_MIN_PASSWORD:8;
    if (passwords.new.length < minimum) {
      toast.error('Password must be at least '+minimum+' characters');
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
    if(sharedDemo){toast.error('The shared demonstration identity is managed by the demo administrator.');return;}
    if(!mfaKnown||mfaEnabled||mfaEnrolling)return;
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
    if(sharedDemo){toast.error('The shared demonstration identity is managed by the demo administrator.');return;}
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
    if(sharedDemo){toast.error('The shared demonstration identity is managed by the demo administrator.');return;}
    if(INSTITUTIONAL_AUTH_ENABLED){toast.error('Institutional authenticator changes require authorised recovery.');return;}
    if (!mfaKnown||!mfaFactorId) return;
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
    if(!user||sharedDemo||notifLoading||notifError||notifSaving)return;
    setNotifSaving(true);
    const payload={...notifPrefs,user_id:user.id,updated_at:new Date().toISOString()};
    try{
      const {data,error}=await supabase.from('notification_preferences').upsert(payload,{onConflict:'user_id'}).select('*').maybeSingle();
      if(!active.current)return;
      if(error||data?.user_id!==user.id||(Object.keys(notifPrefs) as (keyof NotifPrefs)[]).some(key=>(data as unknown as Record<string,unknown>)[key]!==notifPrefs[key]))throw Error('Unconfirmed preference update');
      toast.success('Notification preferences verified');
    }catch{if(active.current){setNotifError('Save could not be verified. Refresh the recorded preferences before retrying.');}}
    finally{if(active.current)setNotifSaving(false);}
  };
  const toggleNotifPref=(key:keyof NotifPrefs)=>{if(!sharedDemo&&!notifError&&!notifLoading&&!notifSaving)setNotifPrefs(prev=>({...prev,[key]:!prev[key]}));};

  const inputClass = 'w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all';

  return (
    <DashboardLayout title="Settings" subtitle="Platform configuration and preferences">
      {sharedDemo&&<p role="status" className="mb-4 rounded-xl border bg-card p-3 text-sm">Shared demonstration account: profile, password, authenticator and account deletion controls are reserved for the demo administrator.</p>}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Sidebar */}
        <div className="lg:w-52 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                aria-pressed={activeSection===s.id}
                className={`flex min-h-11 items-center gap-2 px-3 py-2 lg:py-2.5 rounded-lg text-sm transition-default text-left whitespace-nowrap ${
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
        <div className="min-w-0 flex-1 surface-card p-3 sm:p-6">
          {/* ─── PROFILE ─── */}
          {activeSection === 'profile' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">My Profile</h3>
              {profileLoading&&<p role="status" className="mb-3">Verifying profile…</p>}{profileError&&<div role="alert" className="mb-3 text-sm text-destructive">{profileError} <Button variant="outline" onClick={()=>setReload(n=>n+1)}>Refresh settings</Button></div>}
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
                    disabled={uploadingAvatar||sharedDemo||profileLoading||!!profileError}
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
                  <input aria-label="Full name" disabled={sharedDemo||profileLoading||!!profileError||savingProfile} maxLength={160} value={profileData.full_name} onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Email</label>
                  <input value={user?.email || ''} disabled className={`${inputClass} opacity-60`} />
                  <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed here</p>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Phone / WhatsApp</label>
                  <input aria-label="Phone / WhatsApp" disabled={sharedDemo||profileLoading||!!profileError||savingProfile} maxLength={40} value={profileData.phone} onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))} placeholder="+92 300 1234567" className={inputClass} />
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile||sharedDemo||profileLoading||!!profileError}>
                  {savingProfile && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Profile
                </Button>
              </div>
            </div>
          )}

          {activeSection==='general'&&<SettingsOperationalPanels area="general"/>}

          {/* ─── NOTIFICATIONS (persisted) ─── */}
          {activeSection === 'notifications' && (
            <div className="max-w-lg">
              {!sharedDemo&&<NativeNotifications/>}<h3 className="text-lg font-bold mb-4">Notification Preferences</h3>
              {notifError?<div role="alert" className="space-y-2 text-sm text-destructive"><p>{notifError}</p><Button variant="outline" onClick={()=>setReload(n=>n+1)}>Refresh preferences</Button></div>:notifLoading ? (
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
                              disabled={sharedDemo||notifSaving}
                              aria-label={`${cat.label} ${channel}`}
                              aria-pressed={notifPrefs[prefKey]}
                              className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center transition-default ${
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
                  <Button onClick={handleSaveNotifPrefs} disabled={notifSaving||sharedDemo}>
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
                    <Button onClick={handleChangePassword} disabled={changingPassword||sharedDemo} size="sm">
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
                          {!mfaKnown?'Authenticator status could not be verified':mfaEnabled?'Authenticator app enabled':'No verified authenticator recorded'}
                        </p>
                      </div>
                    </div>
                    {mfaEnabled ? (
                      <Button variant="outline" size="sm" onClick={handleUnenrollMfa} disabled={mfaUnenrolling||sharedDemo||!mfaKnown||INSTITUTIONAL_AUTH_ENABLED} className="text-destructive border-destructive/30">
                        {mfaUnenrolling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        Disable
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleEnrollMfa} disabled={mfaEnrolling||sharedDemo||!mfaKnown}>
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
                        <div className={currentSession&&!sessionError?'w-2 h-2 bg-success rounded-full':'w-2 h-2 bg-muted-foreground rounded-full'} />
                        <div>
                          <p className="text-xs font-medium">Current Device</p>
                          <p className="text-[10px] text-muted-foreground">
                            {sessionError?'Session could not be verified':currentSession?.expiresAt?`Recorded token expiry: ${currentSession.expiresAt}`:currentSession?'Session verified; expiry unavailable':'Checking session…'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">{currentSession&&!sessionError?'Verified':'Unverified'}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                    disabled={sharedDemo||!currentSession||sessionError}
                    onClick={async () => {
                      if(sharedDemo)return;
                      try{const result=await supabase.auth.signOut({scope:'others'});if(result.error)throw result.error;toast.success('Other sessions revoked. Existing access tokens may remain valid until expiry.');}catch{toast.error('Other session revocation could not be verified.');}
                    }}
                  >
                    <LogOut className="w-3 h-3 mr-1" /> Sign Out Other Sessions
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSection==='branding'&&<SettingsOperationalPanels area="branding"/>}
          {activeSection==='integrations'&&<SettingsOperationalPanels area="integrations"/>}

          {/* ─── PRIVACY & GDPR ─── */}
          {activeSection === 'privacy' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold mb-4">Privacy & GDPR</h3>
              <div className="space-y-4">
                <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-success" />
                    <span className="text-sm font-semibold text-success">Privacy and data rights</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Review the privacy notice and use verified personal-data request services. This screen does not certify legal compliance.</p>
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
                    disabled={exportingData||sharedDemo}
                    onClick={async () => {
                      if (!user||sharedDemo) return;
                      setExportingData(true);
                      const { data, error } = await supabase.rpc('export_user_data', { _user_id: user.id });
                      setExportingData(false);
                      if (error) { toast.error('Export failed'); return; }
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `unipathway-data-export-${new Date().toISOString().slice(0, 10)}.json`;
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
                    <p className="text-xs text-muted-foreground">View this device’s recorded cookie preference</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                    const consent = localStorage.getItem('cookie_consent');
                    toast.info(`Device cookie preference: ${consent || 'Not recorded'}. Other consent records must be verified separately.`);
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
                    <p className="text-xs text-muted-foreground">Request account deletion; retention and legal obligations may apply.</p>
                  </div>
                  {!showDeleteConfirm ? (
                    <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30" disabled={sharedDemo} onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Request
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        disabled={deletingAccount||sharedDemo}
                        onClick={async () => {
                          if (!user||sharedDemo) return;
                          setDeletingAccount(true);
                          try { await disableNativePush(); } catch { toast.error('Reconnect and disable device notifications before deleting your account.'); setDeletingAccount(false); return; }
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
          {activeSection==='users'&&access.users&&(sharedDemo?<p role="status">Shared demo account invitations are reserved for the demo administrator. No email invitations will be sent here.</p>:<AccountOperations/>)}

          {activeSection==='data'&&<SettingsOperationalPanels area="data"/>}
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
            <Button onClick={handleVerifyMfa} disabled={sharedDemo||mfaVerifying || mfaCode.length !== 6}>
              {mfaVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
