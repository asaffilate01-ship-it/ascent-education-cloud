import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, TrendingUp, Users, CreditCard, Loader2, RefreshCw, Brain, ArrowDown, ArrowUp } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';

export default function PredictiveAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [revenueForecast, setRevenueForecast] = useState<any>(null);
  const [tab, setTab] = useState('dropout');

  const tenantId = user?.tenantId;

  const fetchDropoutRisk = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predictive-analytics', {
        body: { action: 'dropout_risk', tenant_id: tenantId },
      });
      if (error) throw error;
      setAtRiskStudents(data?.students || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load dropout risk data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueForecast = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predictive-analytics', {
        body: { action: 'revenue_forecast', tenant_id: tenantId },
      });
      if (error) throw error;
      setRevenueForecast(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'dropout') fetchDropoutRisk();
    else fetchRevenueForecast();
  }, [tab, tenantId]);

  const highRisk = atRiskStudents.filter(s => s.risk_level === 'high');
  const medRisk = atRiskStudents.filter(s => s.risk_level === 'medium');

  return (
    <DashboardLayout
      title="Predictive Analytics"
      subtitle="AI-powered dropout risk & revenue forecasting"
      actions={
        <Button size="sm" variant="outline" onClick={() => tab === 'dropout' ? fetchDropoutRisk() : fetchRevenueForecast()} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dropout" className="gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Dropout Risk</TabsTrigger>
          <TabsTrigger value="revenue" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Revenue Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="dropout">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="At-Risk Students" value={String(atRiskStudents.length)} icon={AlertTriangle} />
                <StatCard label="High Risk" value={String(highRisk.length)} icon={ArrowUp} change="Immediate intervention" changeType="negative" />
                <StatCard label="Medium Risk" value={String(medRisk.length)} icon={ArrowDown} change="Monitor closely" changeType="neutral" />
                <StatCard label="Risk Detection" value="AI" icon={Brain} change="Attendance + Grades + Submissions" changeType="positive" />
              </div>

              {atRiskStudents.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Users className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No at-risk students detected</p>
                    <p className="text-xs mt-1">All students are performing within acceptable thresholds</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Students at Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Student</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Attendance</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Avg Grade</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Missed</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Risk</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {atRiskStudents.map((s) => (
                            <tr key={s.student_id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                              <td className="py-2.5 px-3 font-medium">{s.name}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={s.attendance_rate < 60 ? 'text-destructive font-semibold' : s.attendance_rate < 75 ? 'text-yellow-600' : ''}>
                                  {s.attendance_rate}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={s.avg_grade < 40 ? 'text-destructive font-semibold' : s.avg_grade < 55 ? 'text-yellow-600' : ''}>
                                  {s.avg_grade}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">{s.missed_submissions}</td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${s.risk_score >= 60 ? 'bg-destructive' : s.risk_score >= 30 ? 'bg-yellow-500' : 'bg-primary'}`}
                                    style={{ width: `${s.risk_score}%` }}
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <StatusBadge
                                  status={s.risk_level}
                                  variant={s.risk_level === 'high' ? 'error' : s.risk_level === 'medium' ? 'warning' : 'success'}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="revenue">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : revenueForecast ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Collected" value={`Rs.${(revenueForecast.summary?.totalCollected || 0).toLocaleString()}`} icon={CreditCard} />
                <StatCard label="Outstanding" value={`Rs.${(revenueForecast.summary?.totalOutstanding || 0).toLocaleString()}`} icon={TrendingUp} changeType="negative" />
                <StatCard label="Overdue Invoices" value={String(revenueForecast.summary?.overdueCount || 0)} icon={AlertTriangle} changeType="negative" />
                <StatCard label="Avg Monthly" value={`Rs.${(revenueForecast.summary?.avgMonthly || 0).toLocaleString()}`} icon={Brain} change="Based on recent trend" changeType="positive" />
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Revenue Trend & Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueForecast.forecast || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`Rs.${(v || 0).toLocaleString()}`, '']} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="collected" name="Collected" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="outstanding" name="Outstanding" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.15} />
                      <Area type="monotone" dataKey="forecast" name="Forecast" fill="hsl(142 76% 36%)" stroke="hsl(142 76% 36%)" fillOpacity={0.2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No financial data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
