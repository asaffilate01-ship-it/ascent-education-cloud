import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileCheck, AlertCircle, CheckCircle2, Clock, Shield, Camera, FileText, GraduationCap, Briefcase, User } from 'lucide-react';
import { motion } from 'framer-motion';

const DOCUMENT_TYPES = [
  { key: 'passport', label: 'Passport / CNIC', icon: User, description: 'Government-issued photo ID for identity verification', required: true },
  { key: 'selfie', label: 'Selfie for Face Match', icon: Camera, description: 'Clear photo for identity verification against your ID', required: true },
  { key: 'transcript', label: 'Academic Transcripts', icon: FileText, description: 'Official transcripts from previous institution(s)', required: true },
  { key: 'qualification', label: 'Qualification Certificates', icon: GraduationCap, description: 'Degree/diploma certificates (originals or attested copies)', required: true },
  { key: 'english_cert', label: 'English Language Certificate', icon: FileText, description: 'IELTS, PTE, or equivalent English proficiency certificate', required: false },
  { key: 'work_experience', label: 'Work Experience Letters', icon: Briefcase, description: 'Employer reference letters or experience certificates', required: false },
  { key: 'reference_letter', label: 'Academic References', icon: FileCheck, description: 'Reference letters from lecturers or academic supervisors', required: false },
];

const STATUS_CONFIG: Record<string, { colour: string; icon: typeof CheckCircle2; label: string }> = {
  pending: { colour: 'bg-amber-100 text-amber-800', icon: Clock, label: 'Pending Review' },
  verified: { colour: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2, label: 'Verified' },
  rejected: { colour: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Rejected' },
  expired: { colour: 'bg-gray-100 text-gray-600', icon: Clock, label: 'Expired' },
};

interface KYCDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  verified_at: string | null;
}

export default function StudentOnboarding() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDocuments((data as KYCDocument[]) || []);
    setLoading(false);
  };

  const handleUpload = async (docType: string, file: File) => {
    if (!user) return;
    setUploading(docType);
    try {
      const filePath = `${user.id}/${docType}_${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      const { error: dbErr } = await supabase.from('kyc_documents').insert({
        user_id: user.id,
        document_type: docType,
        file_name: file.name,
        file_url: publicUrl,
        status: 'pending',
      });
      if (dbErr) throw dbErr;

      toast.success('Document uploaded successfully — pending verification');
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const getDocStatus = (type: string) => documents.find(d => d.document_type === type);
  const completedCount = DOCUMENT_TYPES.filter(dt => {
    const doc = getDocStatus(dt.key);
    return doc && doc.status === 'verified';
  }).length;
  const requiredCount = DOCUMENT_TYPES.filter(dt => dt.required).length;
  const requiredCompleted = DOCUMENT_TYPES.filter(dt => dt.required && getDocStatus(dt.key)?.status === 'verified').length;
  const progress = Math.round((completedCount / DOCUMENT_TYPES.length) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Onboarding</h1>
          <p className="text-muted-foreground">Complete your document verification to begin your studies</p>
        </div>

        {/* Progress Overview */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold">KYC & Safeguarding Verification</span>
              </div>
              <Badge variant={requiredCompleted === requiredCount ? 'default' : 'secondary'}>
                {requiredCompleted === requiredCount ? 'All Required Complete' : `${requiredCompleted}/${requiredCount} Required`}
              </Badge>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {completedCount} of {DOCUMENT_TYPES.length} documents verified ({progress}%)
            </p>
          </CardContent>
        </Card>

        {/* Document Upload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOCUMENT_TYPES.map((docType, i) => {
            const existing = getDocStatus(docType.key);
            const statusInfo = existing ? STATUS_CONFIG[existing.status] : null;
            const Icon = docType.icon;

            return (
              <motion.div
                key={docType.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`transition-all hover:shadow-md ${existing?.status === 'verified' ? 'border-emerald-300 bg-emerald-50/30' : existing?.status === 'rejected' ? 'border-red-300 bg-red-50/30' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{docType.label}</h3>
                          {docType.required && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{docType.description}</p>

                        {statusInfo && existing && (
                          <div className="mb-3">
                            <Badge className={statusInfo.colour}>
                              <statusInfo.icon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                            {existing.rejection_reason && (
                              <p className="text-xs text-red-600 mt-1">Reason: {existing.rejection_reason}</p>
                            )}
                            {existing.file_name && (
                              <p className="text-xs text-muted-foreground mt-1">📎 {existing.file_name}</p>
                            )}
                          </div>
                        )}

                        {(!existing || existing.status === 'rejected' || existing.status === 'expired') && (
                          <Label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUpload(docType.key, f);
                              }}
                            />
                            <div className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
                              {uploading === docType.key ? (
                                <span className="animate-pulse">Uploading…</span>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4" />
                                  <span>{existing ? 'Re-upload Document' : 'Upload Document'}</span>
                                </>
                              )}
                            </div>
                          </Label>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Safeguarding Notice */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Safeguarding & KYC Policy</h3>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>All documents are stored securely and encrypted at rest</li>
                  <li>Identity verification is mandatory before enrolment is confirmed</li>
                  <li>Face match verification is required for exam entry and centre check-in</li>
                  <li>Documents are reviewed within 48 business hours</li>
                  <li>Expired documents must be renewed before the next residential week</li>
                  <li>All data handling complies with GDPR and local data protection laws</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
