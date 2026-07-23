import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Globe, Mail, Shield, Plus, Trash2, Loader2, CheckCircle, Clock, AlertTriangle, Copy, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';

interface DomainRecord {
  id?: string;
  domain_type: 'website' | 'email';
  domain: string;
  status: string;
  dns_records: any[];
  verified_at: string | null;
}

const DNS_TEMPLATES = {
  website: [
    { type: 'A', name: '@', value: '185.158.133.1', ttl: 3600 },
    { type: 'A', name: 'www', value: '185.158.133.1', ttl: 3600 },
    { type: 'TXT', name: '_lovable', value: 'lovable_verify={tenant_id}', ttl: 3600 },
  ],
  email: [
    { type: 'TXT', name: '@', value: 'v=spf1 include:_spf.google.com ~all', ttl: 3600 },
    { type: 'MX', name: '@', value: 'mx1.emailprovider.com', priority: 10, ttl: 3600 },
    { type: 'CNAME', name: 'notify', value: 'email.lovable.app', ttl: 3600 },
    { type: 'TXT', name: 'notify._domainkey', value: 'DKIM key — generated after setup', ttl: 3600 },
  ],
};

export default function TenantDomainSettings() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWebDomain, setNewWebDomain] = useState('');
  const [newEmailDomain, setNewEmailDomain] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    fetchDomains();
  }, [tenantId]);

  const fetchDomains = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tenant_domains' as any)
      .select('*')
      .eq('tenant_id', tenantId);
    if (data) setDomains(data as any[]);
    setLoading(false);
  };

  const addDomain = async (type: 'website' | 'email', domain: string) => {
    if (!domain.trim() || !tenantId) return;
    setSaving(true);
    const dnsRecords = DNS_TEMPLATES[type].map(r => ({
      ...r,
      value: r.value.replace('{tenant_id}', tenantId),
    }));

    const { error } = await supabase.from('tenant_domains' as any).insert({
      tenant_id: tenantId,
      domain_type: type,
      domain: domain.trim().toLowerCase(),
      dns_records: dnsRecords,
    } as any);

    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Domain already added' : 'Failed to add domain');
    } else {
      toast.success(`${type === 'website' ? 'Website' : 'Email'} domain added — configure DNS records below`);
      if (type === 'website') setNewWebDomain('');
      else setNewEmailDomain('');
      fetchDomains();
    }
    setSaving(false);
  };

  const removeDomain = async (id: string) => {
    await supabase.from('tenant_domains' as any).delete().eq('id', id);
    toast.success('Domain removed');
    fetchDomains();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const websiteDomains = domains.filter(d => d.domain_type === 'website');
  const emailDomains = domains.filter(d => d.domain_type === 'email');

  const statusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'verifying': return <Clock className="w-4 h-4 text-warning animate-pulse" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Domains & Email" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Domains & Email DNS" subtitle="Configure custom domain and email sending for your college">
      <div className="space-y-6 max-w-4xl">

        {/* Website Domain */}
        <div className="surface-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Custom Website Domain</h3>
              <p className="text-xs text-muted-foreground">Point your own domain to your college landing page</p>
            </div>
          </div>

          {websiteDomains.map(d => (
            <div key={d.id} className="mb-4 surface-data p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {statusIcon(d.status)}
                  <span className="text-sm font-semibold">{d.domain}</span>
                  <StatusBadge status={d.status} variant={d.status === 'active' ? 'success' : d.status === 'failed' ? 'danger' : 'warning'} />
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeDomain(d.id!)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              {/* DNS Records */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required DNS Records</p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Type</th>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Value</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.dns_records || []).map((rec: any, i: number) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 font-mono font-bold">{rec.type}</td>
                          <td className="px-3 py-2 font-mono">{rec.name}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground truncate max-w-[200px]">{rec.value}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => copyToClipboard(rec.value)} className="hover:text-primary">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground">Add these records at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.). DNS can take up to 72 hours to propagate.</p>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={newWebDomain}
              onChange={e => setNewWebDomain(e.target.value)}
              placeholder="e.g. unipathway.pk or www.unipathway.pk"
              className="flex-1"
            />
            <Button onClick={() => addDomain('website', newWebDomain)} disabled={saving || !newWebDomain.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Add Domain
            </Button>
          </div>
        </div>

        {/* Email Domain */}
        <div className="surface-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Email Sending Domain</h3>
              <p className="text-xs text-muted-foreground">Send branded emails from your domain (e.g. notify@unipathway.pk)</p>
            </div>
          </div>

          {emailDomains.map(d => (
            <div key={d.id} className="mb-4 surface-data p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {statusIcon(d.status)}
                  <span className="text-sm font-semibold">{d.domain}</span>
                  <StatusBadge status={d.status} variant={d.status === 'active' ? 'success' : d.status === 'failed' ? 'danger' : 'warning'} />
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeDomain(d.id!)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required DNS Records</p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Type</th>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Value</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.dns_records || []).map((rec: any, i: number) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 font-mono font-bold">{rec.type}</td>
                          <td className="px-3 py-2 font-mono">{rec.name}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground truncate max-w-[200px]">{rec.value}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => copyToClipboard(rec.value)} className="hover:text-primary">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground">Configure SPF, MX, CNAME, and DKIM records at your domain registrar for email deliverability.</p>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={newEmailDomain}
              onChange={e => setNewEmailDomain(e.target.value)}
              placeholder="e.g. notify.unipathway.pk or unipathway.pk"
              className="flex-1"
            />
            <Button onClick={() => addDomain('email', newEmailDomain)} disabled={saving || !newEmailDomain.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Add Email Domain
            </Button>
          </div>
        </div>

        {/* Help */}
        <div className="surface-card p-5 border-l-4 border-primary">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold mb-1">Need Help?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Contact the EduCloud team to verify your domain setup. We'll check your DNS records and activate your custom domain and email sending.
                Typically DNS propagation takes 15 minutes to 72 hours depending on your registrar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
