import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bus, MapPin, Plus, Navigation, Users, Phone, Wrench, Edit, Trash2, Route } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TransportTracking() {
  const { user } = useAuth();
  const isDirector = user?.role === 'centre_director' || user?.role === 'superadmin';
  const [showVehicle, setShowVehicle] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ vehicle_number: '', vehicle_type: 'bus', capacity: 40, driver_name: '', driver_phone: '', status: 'active' });
  const [routeForm, setRouteForm] = useState({ route_name: '', vehicle_id: '', stops: '' });

  const { data: vehicles, refetch: refetchV } = useSupabaseQuery('transport_vehicles' as any);
  const { data: routes, refetch: refetchR } = useSupabaseQuery('transport_routes' as any);
  const { data: assignments } = useSupabaseQuery('transport_assignments' as any);

  const vehicleMap = useMemo(() => {
    const m: Record<string, any> = {};
    (vehicles as any[])?.forEach(v => { m[v.id] = v; });
    return m;
  }, [vehicles]);

  const stats = useMemo(() => ({
    vehicles: (vehicles as any[])?.length || 0,
    active: (vehicles as any[])?.filter(v => v.status === 'active').length || 0,
    routes: (routes as any[])?.length || 0,
    students: (assignments as any[])?.length || 0,
  }), [vehicles, routes, assignments]);

  const addVehicle = async () => {
    if (!vehicleForm.vehicle_number) { toast.error('Vehicle number required'); return; }
    const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).single();
    const { error } = await supabase.from('transport_vehicles' as any).insert({
      ...vehicleForm, capacity: Number(vehicleForm.capacity), tenant_id: (profile.data as any)?.tenant_id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Vehicle added');
    setShowVehicle(false);
    setVehicleForm({ vehicle_number: '', vehicle_type: 'bus', capacity: 40, driver_name: '', driver_phone: '', status: 'active' });
    refetchV();
  };

  const addRoute = async () => {
    if (!routeForm.route_name) { toast.error('Route name required'); return; }
    const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).single();
    const stops = routeForm.stops ? routeForm.stops.split('\n').filter(Boolean).map((s, i) => ({ name: s.trim(), order: i + 1 })) : [];
    const { error } = await supabase.from('transport_routes' as any).insert({
      route_name: routeForm.route_name, vehicle_id: routeForm.vehicle_id || null,
      stops: JSON.stringify(stops), tenant_id: (profile.data as any)?.tenant_id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Route added');
    setShowRoute(false);
    setRouteForm({ route_name: '', vehicle_id: '', stops: '' });
    refetchR();
  };

  const deleteVehicle = async (id: string) => {
    await supabase.from('transport_vehicles' as any).delete().eq('id', id);
    toast.success('Deleted');
    refetchV();
  };

  return (
    <DashboardLayout title="Transport & GPS Tracking" subtitle="Manage vehicles, routes, and live tracking">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Vehicles" value={stats.vehicles} icon={Bus} />
        <StatCard label="Active" value={stats.active} icon={Navigation} change="↑" changeType="positive" />
        <StatCard label="Routes" value={stats.routes} icon={Route} />
        <StatCard label="Students" value={stats.students} icon={Users} />
      </div>

      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles ({(vehicles as any[])?.length || 0})</TabsTrigger>
          <TabsTrigger value="routes">Routes ({(routes as any[])?.length || 0})</TabsTrigger>
          <TabsTrigger value="map">Live Map</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          {isDirector && (
            <div className="mb-4">
              <Dialog open={showVehicle} onOpenChange={setShowVehicle}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Add Vehicle</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Vehicle Number *</Label><Input value={vehicleForm.vehicle_number} onChange={e => setVehicleForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="LHR-1234" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Type</Label>
                        <Select value={vehicleForm.vehicle_type} onValueChange={v => setVehicleForm(f => ({ ...f, vehicle_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="bus">Bus</SelectItem><SelectItem value="van">Van</SelectItem><SelectItem value="car">Car</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><Label>Capacity</Label><Input type="number" value={vehicleForm.capacity} onChange={e => setVehicleForm(f => ({ ...f, capacity: Number(e.target.value) }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Driver Name</Label><Input value={vehicleForm.driver_name} onChange={e => setVehicleForm(f => ({ ...f, driver_name: e.target.value }))} /></div>
                      <div><Label>Driver Phone</Label><Input value={vehicleForm.driver_phone} onChange={e => setVehicleForm(f => ({ ...f, driver_phone: e.target.value }))} /></div>
                    </div>
                    <Button className="w-full" onClick={addVehicle}>Add Vehicle</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {(vehicles as any[])?.length === 0 ? (
            <div className="surface-card p-12 text-center">
              <Bus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold mb-1">No vehicles registered</p>
              <p className="text-xs text-muted-foreground">Add vehicles to start tracking transport.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(vehicles as any[])?.map((v: any) => (
                <div key={v.id} className="surface-card p-5 hover:shadow-lg transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bus className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm">{v.vehicle_number}</span>
                    </div>
                    <StatusBadge status={v.status} variant={v.status === 'active' ? 'success' : v.status === 'maintenance' ? 'warning' : 'neutral'} />
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Type: <span className="capitalize text-foreground">{v.vehicle_type}</span> · Capacity: <span className="text-foreground">{v.capacity}</span></p>
                    {v.driver_name && <p className="flex items-center gap-1"><Users className="w-3 h-3" /> {v.driver_name}</p>}
                    {v.driver_phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {v.driver_phone}</p>}
                    {v.current_lat && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {Number(v.current_lat).toFixed(4)}, {Number(v.current_lng).toFixed(4)}</p>}
                  </div>
                  {isDirector && (
                    <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-all">
                      <Button size="sm" variant="ghost" onClick={() => deleteVehicle(v.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="routes">
          {isDirector && (
            <div className="mb-4">
              <Dialog open={showRoute} onOpenChange={setShowRoute}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Add Route</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Route</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Route Name *</Label><Input value={routeForm.route_name} onChange={e => setRouteForm(f => ({ ...f, route_name: e.target.value }))} placeholder="Route A — Gulberg to Campus" /></div>
                    <div><Label>Assign Vehicle</Label>
                      <Select value={routeForm.vehicle_id} onValueChange={v => setRouteForm(f => ({ ...f, vehicle_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{(vehicles as any[])?.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicle_number}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Stops (one per line)</Label><Input value={routeForm.stops} onChange={e => setRouteForm(f => ({ ...f, stops: e.target.value }))} placeholder="Gulberg III, Liberty, DHA Phase 5..." /></div>
                    <Button className="w-full" onClick={addRoute}>Add Route</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {(routes as any[])?.length === 0 ? (
            <div className="surface-card p-12 text-center">
              <Route className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold mb-1">No routes defined</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(routes as any[])?.map((r: any) => {
                const vehicle = r.vehicle_id ? vehicleMap[r.vehicle_id] : null;
                const stops = typeof r.stops === 'string' ? JSON.parse(r.stops) : (r.stops || []);
                return (
                  <div key={r.id} className="surface-card p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Route className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">{r.route_name}</h3>
                      {vehicle && <p className="text-xs text-muted-foreground">Vehicle: {vehicle.vehicle_number} · Driver: {vehicle.driver_name || '—'}</p>}
                      {stops.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {stops.map((s: any, i: number) => (
                            <span key={i} className="text-[10px] bg-secondary px-2 py-0.5 rounded flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" /> {s.name || s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={r.status} variant="success" />
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map">
          <div className="surface-card p-8 text-center">
            <Navigation className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-bold mb-2">Live GPS Map</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Real-time vehicle tracking requires GPS devices installed in vehicles. Once GPS data is streaming, vehicles will appear on the map with live positions and ETAs.
            </p>
            <div className="aspect-video bg-secondary/50 rounded-xl flex items-center justify-center max-w-2xl mx-auto">
              <div className="text-center">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Map integration requires GPS hardware setup</p>
                <p className="text-[10px] text-muted-foreground mt-1">Contact support to enable live tracking</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
