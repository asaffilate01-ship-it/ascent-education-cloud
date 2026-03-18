import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, Eye, Download, Search, History, CheckCircle2, Clock, Pen, Loader2, FolderOpen, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

export default function DocumentManagement() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const { data: documents, loading, refetch } = useSupabaseQuery('kyc_documents') as { data: any[] | null; loading: boolean; refetch: () => void };
  const { data: signatures } = useSupabaseQuery('e_signatures') as { data: any[] | null; loading: boolean; refetch: () => void };

  const filtered = useMemo(() => {
    let docs = (documents || []) as any[];
    if (search) {
      const q = search.toLowerCase();
      docs = docs.filter((d: any) => d.document_type?.toLowerCase().includes(q) || d.file_name?.toLowerCase().includes(q));
    }
    if (tab === 'pending') docs = docs.filter((d: any) => d.status === 'pending');
    if (tab === 'verified') docs = docs.filter((d: any) => d.status === 'verified');
    if (tab === 'signed') {
      return ((signatures || []) as any[]).map((s: any) => ({
        id: s.id,
        document_type: s.document_type,
        file_name: `Signed: ${s.document_type}`,
        status: 'signed',
        created_at: s.signed_at,
        user_id: s.user_id,
        full_name: s.full_name,
      }));
    }
    return docs;
  }, [documents, signatures, search, tab]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('kyc-documents').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(path);

      const { error: insertError } = await supabase.from('kyc_documents').insert({
        user_id: user.id,
        document_type: 'general',
        file_name: file.name,
        file_url: urlData.publicUrl,
        status: 'pending',
      });
      if (insertError) throw insertError;

      toast.success('Document uploaded successfully');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
  };

  return (
    <DashboardLayout
      title="Document Management"
      subtitle="Upload, manage, and e-sign documents"
      actions={
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.jpg,.png" />
          <Button size="sm" className="gap-1.5 text-xs" asChild><span><Upload className="w-3.5 h-3.5" /> Upload</span></Button>
        </label>
      }
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…" className="pl-9" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="text-xs gap-1"><FolderOpen className="w-3.5 h-3.5" /> All</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs gap-1"><Clock className="w-3.5 h-3.5" /> Pending</TabsTrigger>
          <TabsTrigger value="verified" className="text-xs gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</TabsTrigger>
          <TabsTrigger value="signed" className="text-xs gap-1"><Pen className="w-3.5 h-3.5" /> E-Signed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={FileText} title="No documents found" description="Upload documents to get started" />
          ) : (
            <div className="grid gap-3">
              {filtered.map((doc: any) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name || doc.document_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.document_type} · {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge
                      status={doc.status}
                      variant={doc.status === 'verified' || doc.status === 'signed' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}
                    />
                    {doc.file_url && (
                      <Button size="sm" variant="ghost" asChild className="h-8">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Eye className="w-3.5 h-3.5" /></a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
