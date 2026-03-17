import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Monitor, Play, Square, Plus, ExternalLink, Users, Cpu,
  HardDrive, ScreenShare, Video, Clock, Settings, Wifi, WifiOff
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LabVM {
  id: string;
  student_id: string;
  vm_name: string;
  vm_status: string;
  os_type: string;
  instance_type: string;
  connection_url: string | null;
  ip_address: string | null;
  specs: { cpu: number; ram_gb: number; storage_gb: number };
  last_accessed_at: string | null;
  created_at: string;
}

interface LabSession {
  id: string;
  title: string;
  description: string | null;
  lecturer_id: string;
  status: string;
  scheduled_at: string | null;
  is_lab_mode: boolean;
  created_at: string;
}

const VM_STATUS_CONFIG: Record<string, { variant: string; icon: React.ElementType }> = {
  running: { variant: 'success', icon: Wifi },
  starting: { variant: 'warning', icon: Clock },
  stopped: { variant: 'neutral', icon: WifiOff },
  stopping: { variant: 'warning', icon: Clock },
  error: { variant: 'danger', icon: WifiOff },
};

export default function ITLabsDashboard() {
  const { user } = useAuth();
  const [vms, setVms] = useState<LabVM[]>([]);
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isStaff = user?.role === 'lecturer' || user?.role === 'centre_director' || user?.role === 'superadmin';

  useEffect(() => {
    loadData();
    // Subscribe to realtime VM status changes
    const channel = supabase
      .channel('lab-vms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_vms' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    const [vmsRes, sessionsRes] = await Promise.all([
      supabase.from('lab_vms').select('*').order('created_at', { ascending: false }),
      supabase.from('lab_sessions').select('*').order('created_at', { ascending: false }),
    ]);
    setVms((vmsRes.data || []) as unknown as LabVM[]);
    setSessions((sessionsRes.data || []) as unknown as LabSession[]);
    setLoading(false);
  };

  const handleVMAction = async (vmId: string, action: 'start_vm' | 'stop_vm') => {
    setActionLoading(vmId);
    const vm = vms.find(v => v.id === vmId);
    if (!vm) return;

    const { data, error } = await supabase.functions.invoke('aws-lab-manager', {
      body: { action, vm_id: vmId, instance_id: vm.ip_address },
    });

    if (error) {
      toast.error(`Failed to ${action === 'start_vm' ? 'start' : 'stop'} VM`);
    } else {
      toast.success(`VM ${action === 'start_vm' ? 'starting' : 'stopping'}...`);
      loadData();
    }
    setActionLoading(null);
  };

  const handleConnect = async (vmId: string) => {
    const { data, error } = await supabase.functions.invoke('aws-lab-manager', {
      body: { action: 'get_connection_url', vm_id: vmId },
    });

    if (data?.url) {
      window.open(data.url, '_blank');
    } else {
      toast.info('VM is being provisioned. Please try again in a moment.');
    }
  };

  const runningVMs = vms.filter(v => v.vm_status === 'running').length;
  const totalVMs = vms.length;

  return (
    <DashboardLayout
      title="IT Labs"
      subtitle="AWS-powered virtual machines for practical sessions"
      actions={
        isStaff ? (
          <Button size="sm" onClick={() => toast.info('Create Lab Session coming soon')}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Lab Session
          </Button>
        ) : undefined
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total VMs" value={totalVMs} icon={Monitor} />
        <StatCard label="Running" value={runningVMs} change="active" changeType="positive" icon={Wifi} />
        <StatCard label="Lab Sessions" value={sessions.length} icon={Video} />
        <StatCard
          label="Avg. Specs"
          value={totalVMs > 0 ? `${Math.round(vms.reduce((s, v) => s + (v.specs?.ram_gb || 4), 0) / totalVMs)}GB RAM` : '—'}
          icon={Cpu}
        />
      </div>

      <Tabs defaultValue="machines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="machines">
            <Monitor className="w-3.5 h-3.5 mr-1.5" /> My Machines
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Video className="w-3.5 h-3.5 mr-1.5" /> Lab Sessions
          </TabsTrigger>
          {isStaff && (
            <TabsTrigger value="manage">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Manage VMs
            </TabsTrigger>
          )}
        </TabsList>

        {/* MY MACHINES TAB */}
        <TabsContent value="machines" className="space-y-4">
          {vms.length === 0 ? (
            <div className="surface-card p-12 text-center">
              <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Virtual Machines Allocated</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {isStaff
                  ? 'Allocate VMs to students from the Manage tab, or wait for AWS provisioning.'
                  : 'Your lecturer will allocate a virtual machine to you when a lab session begins.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {vms.map((vm) => {
                const statusConfig = VM_STATUS_CONFIG[vm.vm_status] || VM_STATUS_CONFIG.stopped;
                const StatusIcon = statusConfig.icon;
                return (
                  <div key={vm.id} className="surface-card p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Monitor className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">{vm.vm_name}</h4>
                          <p className="text-xs text-muted-foreground capitalize">{vm.os_type} · {vm.instance_type}</p>
                        </div>
                      </div>
                      <StatusBadge
                        status={vm.vm_status}
                        variant={statusConfig.variant as any}
                      />
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <Cpu className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs font-semibold">{vm.specs?.cpu || 2} vCPU</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <HardDrive className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs font-semibold">{vm.specs?.ram_gb || 4}GB RAM</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <HardDrive className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs font-semibold">{vm.specs?.storage_gb || 50}GB SSD</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {vm.vm_status === 'stopped' && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleVMAction(vm.id, 'start_vm')}
                          disabled={actionLoading === vm.id}
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                          {actionLoading === vm.id ? 'Starting...' : 'Start'}
                        </Button>
                      )}
                      {vm.vm_status === 'running' && (
                        <>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleConnect(vm.id)}
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Connect
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVMAction(vm.id, 'stop_vm')}
                            disabled={actionLoading === vm.id}
                          >
                            <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
                          </Button>
                        </>
                      )}
                      {(vm.vm_status === 'starting' || vm.vm_status === 'stopping') && (
                        <Button size="sm" variant="outline" disabled className="flex-1">
                          <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          {vm.vm_status === 'starting' ? 'Starting...' : 'Stopping...'}
                        </Button>
                      )}
                    </div>

                    {vm.last_accessed_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Last accessed: {new Date(vm.last_accessed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* LAB SESSIONS TAB */}
        <TabsContent value="sessions" className="space-y-4">
          {sessions.length === 0 ? (
            <div className="surface-card p-12 text-center">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Lab Sessions</h3>
              <p className="text-sm text-muted-foreground">
                {isStaff ? 'Create a new lab session to get started.' : 'No lab sessions scheduled yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="surface-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ScreenShare className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{session.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {session.scheduled_at
                          ? new Date(session.scheduled_at).toLocaleString()
                          : 'Not scheduled'}
                        {session.is_lab_mode && (
                          <Badge variant="outline" className="ml-2 text-[10px]">Lab Mode</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={session.status}
                      variant={session.status === 'active' ? 'success' : session.status === 'scheduled' ? 'warning' : 'neutral'}
                    />
                    {session.status === 'active' && (
                      <Button size="sm" onClick={() => window.location.href = '/live-classroom'}>
                        <Video className="w-3.5 h-3.5 mr-1.5" /> Join
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MANAGE VMs TAB (Staff only) */}
        {isStaff && (
          <TabsContent value="manage" className="space-y-4">
            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold mb-4">VM Allocation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Allocate AWS WorkSpaces to students for lab sessions. Each student gets a dedicated 
                virtual machine they can access from their browser.
              </p>

              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Standard</h4>
                  <p className="text-lg font-bold">2 vCPU · 4GB</p>
                  <p className="text-xs text-muted-foreground">50GB SSD · Windows/Linux</p>
                  <p className="text-xs text-primary mt-2">t3.medium</p>
                </div>
                <div className="p-4 border border-primary/50 rounded-lg bg-primary/5">
                  <h4 className="text-xs font-semibold text-primary uppercase mb-2">Performance</h4>
                  <p className="text-lg font-bold">4 vCPU · 8GB</p>
                  <p className="text-xs text-muted-foreground">100GB SSD · Windows/Linux</p>
                  <p className="text-xs text-primary mt-2">t3.xlarge</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Power</h4>
                  <p className="text-lg font-bold">8 vCPU · 16GB</p>
                  <p className="text-xs text-muted-foreground">200GB SSD · GPU Available</p>
                  <p className="text-xs text-primary mt-2">g4dn.xlarge</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => toast.info('Bulk VM allocation will connect to AWS WorkSpaces API')}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Allocate VMs to Class
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.info('AWS Console link')}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> AWS Console
                </Button>
              </div>
            </div>

            {/* All VMs table */}
            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold mb-3">All Allocated VMs ({vms.length})</h3>
              {vms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No VMs allocated yet</p>
              ) : (
                <div className="space-y-2">
                  {vms.map((vm) => (
                    <div key={vm.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{vm.vm_name}</p>
                          <p className="text-xs text-muted-foreground">{vm.os_type} · {vm.instance_type} · {vm.specs?.ram_gb}GB RAM</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={vm.vm_status}
                          variant={(VM_STATUS_CONFIG[vm.vm_status]?.variant || 'neutral') as any}
                        />
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (vm.vm_status === 'running') handleVMAction(vm.id, 'stop_vm');
                          else if (vm.vm_status === 'stopped') handleVMAction(vm.id, 'start_vm');
                        }}>
                          {vm.vm_status === 'running' ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
}
