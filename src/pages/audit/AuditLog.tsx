import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Download, Filter, Activity, User, FileText, CreditCard, GraduationCap, Shield, Clock } from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

interface AuditEntry {
  id: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_COLOURS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-600',
  verify: 'bg-amber-100 text-amber-800',
  approve: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-red-100 text-red-800',
};

const ENTITY_ICONS: Record<string, typeof Activity> = {
  application: FileText,
  student: GraduationCap,
  invoice: CreditCard,
  submission: FileText,
  user: User,
  enrolment: GraduationCap,
  compliance: Shield,
};

export default function AuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setLogs((data || []) as AuditEntry[]);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (entityFilter !== 'all' && l.entity_type !== entityFilter) return false;
    if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    const csv = [
      'Timestamp,User,Action,Entity,Details',
      ...filtered.map(l =>
        `"${new Date(l.created_at).toISOString()}","${l.user_email || 'System'}","${l.action}","${l.entity_type}","${JSON.stringify(l.details).replace(/"/g, '""')}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) return <DashboardLayout title="Audit Log"><DashboardSkeleton /></DashboardLayout>;

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type))];

  return (
    <DashboardLayout title="Audit Log">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
            <p className="text-muted-foreground">Complete trail of all system activity</p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search logs…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Log Entries */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No audit entries found</p>
              ) : filtered.map(entry => {
                const Icon = ENTITY_ICONS[entry.entity_type] || Activity;
                const actionColour = ACTION_COLOURS[entry.action] || 'bg-gray-100 text-gray-700';
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0">
                    <div className="p-1.5 rounded bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{entry.user_email || 'System'}</span>
                        <Badge className={`text-[10px] ${actionColour}`}>{entry.action}</Badge>
                        <Badge variant="outline" className="text-[10px]">{entry.entity_type}</Badge>
                      </div>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {JSON.stringify(entry.details).slice(0, 120)}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
