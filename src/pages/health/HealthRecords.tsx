import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Shield, Phone, User, Save, AlertTriangle, Stethoscope } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function HealthRecords() {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const isDirector = user?.role === 'centre_director';
  const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [form, setForm] = useState({
    blood_group: '', allergies: '', medical_conditions: '', medications: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    doctor_name: '', doctor_phone: '', insurance_provider: '', insurance_number: '', notes: '', last_checkup_date: '',
  });

  const { data: allRecords } = useSupabaseQuery('health_records' as any);
  const { data: profiles } = useSupabaseQuery('profiles');

  // Load student's own record
  useEffect(() => {
    if (isStudent && user) {
      loadRecord(user.id);
    }
  }, [user, isStudent]);

  // Load selected student record for directors
  useEffect(() => {
    if (selectedStudent) loadRecord(selectedStudent);
  }, [selectedStudent]);

  const loadRecord = async (studentId: string) => {
    const records = (allRecords as any[]) || [];
    const rec = records.find(r => r.student_id === studentId);
    if (rec) {
      setForm({
        blood_group: rec.blood_group || '',
        allergies: (rec.allergies || []).join(', '),
        medical_conditions: (rec.medical_conditions || []).join(', '),
        medications: (rec.medications || []).join(', '),
        emergency_contact_name: rec.emergency_contact_name || '',
        emergency_contact_phone: rec.emergency_contact_phone || '',
        emergency_contact_relationship: rec.emergency_contact_relationship || '',
        doctor_name: rec.doctor_name || '',
        doctor_phone: rec.doctor_phone || '',
        insurance_provider: rec.insurance_provider || '',
        insurance_number: rec.insurance_number || '',
        notes: rec.notes || '',
        last_checkup_date: rec.last_checkup_date || '',
      });
    }
  };

  const handleSave = async () => {
    const studentId = isStudent ? user!.id : selectedStudent;
    if (!studentId) { toast.error('Select a student'); return; }
    setSaving(true);
    const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', studentId).single();
    const payload = {
      student_id: studentId,
      tenant_id: (profile.data as any)?.tenant_id,
      blood_group: form.blood_group || null,
      allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      medical_conditions: form.medical_conditions ? form.medical_conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      medications: form.medications ? form.medications.split(',').map(s => s.trim()).filter(Boolean) : [],
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      emergency_contact_relationship: form.emergency_contact_relationship || null,
      doctor_name: form.doctor_name || null,
      doctor_phone: form.doctor_phone || null,
      insurance_provider: form.insurance_provider || null,
      insurance_number: form.insurance_number || null,
      notes: form.notes || null,
      last_checkup_date: form.last_checkup_date || null,
    };
    const { error } = await supabase.from('health_records' as any).upsert(payload as any, { onConflict: 'student_id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Health record saved');
  };

  return (
    <DashboardLayout title="Health Records" subtitle="Medical information and emergency contacts" actions={
      <Button size="sm" onClick={handleSave} disabled={saving}><Save className="w-3.5 h-3.5 mr-1" /> {saving ? 'Saving...' : 'Save'}</Button>
    }>
      {isDirector && (
        <div className="mb-6">
          <Label>Select Student</Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Choose a student..." /></SelectTrigger>
            <SelectContent>{profiles.filter(p => p.user_id).map((p: any) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name} ({p.email})</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Medical Info */}
        <div className="surface-card p-6 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2"><Heart className="w-4 h-4 text-destructive" /> Medical Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Blood Group</Label>
              <Select value={form.blood_group} onValueChange={v => setForm(f => ({ ...f, blood_group: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Last Checkup</Label><Input type="date" value={form.last_checkup_date} onChange={e => setForm(f => ({ ...f, last_checkup_date: e.target.value }))} /></div>
          </div>
          <div><Label>Allergies (comma-separated)</Label><Input value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Penicillin, Peanuts..." /></div>
          <div><Label>Medical Conditions (comma-separated)</Label><Input value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} placeholder="Asthma, Diabetes..." /></div>
          <div><Label>Current Medications (comma-separated)</Label><Input value={form.medications} onChange={e => setForm(f => ({ ...f, medications: e.target.value }))} placeholder="Inhaler, Insulin..." /></div>
          <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>

        {/* Emergency & Doctor */}
        <div className="space-y-6">
          <div className="surface-card p-6 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Emergency Contact</h3>
            <div><Label>Full Name</Label><Input value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Phone</Label><Input value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} /></div>
              <div><Label>Relationship</Label><Input value={form.emergency_contact_relationship} onChange={e => setForm(f => ({ ...f, emergency_contact_relationship: e.target.value }))} placeholder="Parent, Spouse..." /></div>
            </div>
          </div>

          <div className="surface-card p-6 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary" /> Doctor & Insurance</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Doctor Name</Label><Input value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} /></div>
              <div><Label>Doctor Phone</Label><Input value={form.doctor_phone} onChange={e => setForm(f => ({ ...f, doctor_phone: e.target.value }))} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Insurance Provider</Label><Input value={form.insurance_provider} onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))} /></div>
              <div><Label>Policy Number</Label><Input value={form.insurance_number} onChange={e => setForm(f => ({ ...f, insurance_number: e.target.value }))} /></div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
