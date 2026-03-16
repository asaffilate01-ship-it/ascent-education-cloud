import DashboardLayout from '@/components/layout/DashboardLayout';
import { CheckCircle, Upload, FileText, Shield, Award, User, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

interface KYCDoc {
  id: string;
  document_type: string;
  file_name: string | null;
  status: string;
  rejection_reason: string | null;
}

const REQUIRED_DOCS = [
  { type: 'passport', label: 'Passport / National ID', icon: Shield, desc: 'Government-issued photo ID for identity verification' },
  { type: 'qualification', label: 'Teaching Qualification', icon: Award, desc: 'PGCE, DTLLS, CELTA, or equivalent teaching certificate' },
  { type: 'degree_certificate', label: 'Degree Certificate', icon: FileText, desc: 'Highest relevant academic qualification' },
  { type: 'cv', label: 'Curriculum Vitae', icon: User, desc: 'Up-to-date CV with teaching and industry experience' },
  { type: 'dbs_check', label: 'DBS / Police Clearance', icon: Shield, desc: 'Enhanced DBS check or equivalent for safeguarding' },
  { type: 'right_to_work', label: 'Right to Work', icon: FileText, desc: 'Visa, work permit, or residency proof' },
];

export default function LecturerOnboarding() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<KYCDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadType, setActiveUploadType] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('kyc_documents')
      .select('id, document_type, file_name, status, rejection_reason')
      .eq('user_id', user.id);
    setDocs(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (file: File, docType: string) => {
    if (!user) return;
    setUploading(docType);
    try {
      const filePath = `${user.id}/${docType}_${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(filePath);

      // Check if doc already exists
      const existing = docs.find(d => d.document_type === docType);
      if (existing) {
        await supabase.from('kyc_documents')
          .update({ file_name: file.name, file_url: urlData.publicUrl, status: 'pending' })
          .eq('id', existing.id);
      } else {
        await supabase.from('kyc_documents').insert({
          user_id: user.id,
          document_type: docType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          status: 'pending',
          tenant_id: user.tenantId || null,
        });
      }
      toast.success(`${file.name} uploaded successfully`);
      fetchDocs();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const getDocStatus = (type: string) => docs.find(d => d.document_type === type);

  const completedCount = REQUIRED_DOCS.filter(d => {
    const doc = getDocStatus(d.type);
    return doc && (doc.status === 'verified' || doc.status === 'uploaded' || doc.status === 'pending');
  }).length;

  const progress = Math.round((completedCount / REQUIRED_DOCS.length) * 100);

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardLayout
      title="Staff Onboarding"
      subtitle="Upload required documents for safeguarding and compliance"
    >
      {/* Progress */}
      <div className="surface-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Onboarding Progress</h3>
          <span className="text-xs font-bold text-primary">{completedCount}/{REQUIRED_DOCS.length} documents</span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {progress === 100 && (
          <p className="text-xs text-success mt-2 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> All documents submitted — pending verification
          </p>
        )}
      </div>

      {/* Document Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {REQUIRED_DOCS.map((doc) => {
          const existing = getDocStatus(doc.type);
          const isUploading = uploading === doc.type;
          const Icon = doc.icon;

          return (
            <div key={doc.type} className={`surface-card p-5 border-l-4 ${
              existing?.status === 'verified' ? 'border-l-success' :
              existing?.status === 'rejected' ? 'border-l-destructive' :
              existing?.status === 'pending' || existing?.status === 'uploaded' ? 'border-l-warning' :
              'border-l-border'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  existing?.status === 'verified' ? 'bg-success/10 text-success' :
                  existing ? 'bg-warning/10 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{doc.label}</h4>
                    {existing?.status === 'verified' && <CheckCircle className="w-4 h-4 text-success" />}
                    {existing?.status === 'rejected' && <AlertCircle className="w-4 h-4 text-destructive" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{doc.desc}</p>

                  {existing?.file_name && (
                    <p className="text-xs text-foreground mt-1.5 truncate">📎 {existing.file_name}</p>
                  )}
                  {existing?.status === 'rejected' && existing.rejection_reason && (
                    <p className="text-xs text-destructive mt-1">Reason: {existing.rejection_reason}</p>
                  )}

                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant={existing ? 'outline' : 'default'}
                      disabled={isUploading}
                      onClick={() => {
                        setActiveUploadType(doc.type);
                        fileInputRef.current?.click();
                      }}
                    >
                      {isUploading ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Uploading…</>
                      ) : existing ? (
                        <><Upload className="w-3.5 h-3.5 mr-1.5" />Re-upload</>
                      ) : (
                        <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeUploadType) {
            handleUpload(file, activeUploadType);
          }
          e.target.value = '';
        }}
      />
    </DashboardLayout>
  );
}
