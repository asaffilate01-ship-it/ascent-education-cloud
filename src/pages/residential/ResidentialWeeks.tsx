import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, MapPin, Users, Utensils, BedDouble, Clock, CheckCircle2, Building, BookOpen, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResidentialWeek {
  id: string;
  title: string;
  semester: number;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
  max_capacity: number;
}

interface ResidentialSession {
  id: string;
  title: string;
  description: string | null;
  session_type: string;
  start_time: string;
  end_time: string;
  location: string | null;
}

interface Booking {
  id: string;
  residential_week_id: string;
  room_type: string;
  meal_plan: string;
  status: string;
}

const SESSION_ICONS: Record<string, typeof BookOpen> = {
  workshop: BookOpen,
  lecture: BookOpen,
  group_project: Users,
  tutor_meeting: Users,
  exam: Clock,
  social: Coffee,
  meal: Utensils,
};

const SESSION_COLOURS: Record<string, string> = {
  workshop: 'bg-blue-100 text-blue-800 border-blue-200',
  lecture: 'bg-purple-100 text-purple-800 border-purple-200',
  group_project: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  tutor_meeting: 'bg-amber-100 text-amber-800 border-amber-200',
  exam: 'bg-red-100 text-red-800 border-red-200',
  social: 'bg-pink-100 text-pink-800 border-pink-200',
  meal: 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function ResidentialWeeks() {
  const { user } = useAuth();
  const [weeks, setWeeks] = useState<ResidentialWeek[]>([]);
  const [sessions, setSessions] = useState<ResidentialSession[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    room_type: 'single',
    meal_plan: 'full_board',
    dietary_requirements: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    special_needs: '',
  });

  const isStaff = role && !['student', 'agent'].includes(role);

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) fetchSessions(selectedWeek);
  }, [selectedWeek]);

  const fetchWeeks = async () => {
    const { data } = await supabase.from('residential_weeks').select('*').order('start_date');
    const weekData = (data || []) as ResidentialWeek[];
    setWeeks(weekData);
    if (weekData.length > 0) setSelectedWeek(weekData[0].id);

    if (user) {
      const { data: bk } = await supabase.from('residential_bookings').select('*').eq('student_id', user.id);
      setBookings((bk || []) as Booking[]);
    }
    setLoading(false);
  };

  const fetchSessions = async (weekId: string) => {
    const { data } = await supabase
      .from('residential_sessions')
      .select('*')
      .eq('residential_week_id', weekId)
      .order('start_time');
    setSessions((data || []) as ResidentialSession[]);
  };

  const handleBook = async () => {
    if (!user || !selectedWeek) return;
    const week = weeks.find(w => w.id === selectedWeek);
    if (!week) return;

    const { error } = await supabase.from('residential_bookings').insert({
      residential_week_id: selectedWeek,
      student_id: user.id,
      tenant_id: week.id, // Will be set properly via context
      ...bookingForm,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Residential week booked successfully!');
      setBookingOpen(false);
      fetchWeeks();
    }
  };

  const activeWeek = weeks.find(w => w.id === selectedWeek);
  const hasBooking = bookings.some(b => b.residential_week_id === selectedWeek);

  const groupedSessions = sessions.reduce<Record<string, ResidentialSession[]>>((acc, s) => {
    const day = new Date(s.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    (acc[day] = acc[day] || []).push(s);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Residential Weeks</h1>
          <p className="text-muted-foreground">1 week × 2 per year — intensive on-centre sessions for workshops, projects, and exams</p>
        </div>

        {/* Week Selector */}
        {weeks.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {weeks.map(w => (
              <Button
                key={w.id}
                variant={selectedWeek === w.id ? 'default' : 'outline'}
                onClick={() => setSelectedWeek(w.id)}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                {w.title}
                <Badge variant={w.status === 'active' ? 'default' : 'secondary'} className="ml-1 text-[10px]">
                  {w.status}
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {activeWeek && (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timetable">Timetable</TabsTrigger>
              <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
              <TabsTrigger value="meals">Meals & Catering</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dates</p>
                      <p className="font-semibold">{new Date(activeWeek.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {new Date(activeWeek.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 flex items-center gap-3">
                    <MapPin className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold">{activeWeek.location || 'Centre Campus'}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Capacity</p>
                      <p className="font-semibold">{activeWeek.max_capacity} students</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {!isStaff && (
                <Card className="border-primary/20">
                  <CardContent className="pt-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Your Booking</h3>
                      <p className="text-sm text-muted-foreground">
                        {hasBooking ? 'You are booked for this residential week' : 'You have not booked yet — secure your place now'}
                      </p>
                    </div>
                    {hasBooking ? (
                      <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>
                    ) : (
                      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                        <DialogTrigger asChild>
                          <Button>Book My Place</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Book Residential Week</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Room Type</Label>
                              <Select value={bookingForm.room_type} onValueChange={v => setBookingForm(f => ({ ...f, room_type: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single">Single Room</SelectItem>
                                  <SelectItem value="shared_male">Shared Dormitory (Male)</SelectItem>
                                  <SelectItem value="shared_female">Shared Dormitory (Female)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Meal Plan</Label>
                              <Select value={bookingForm.meal_plan} onValueChange={v => setBookingForm(f => ({ ...f, meal_plan: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="full_board">Full Board (Breakfast, Lunch, Dinner)</SelectItem>
                                  <SelectItem value="half_board">Half Board (Breakfast & Dinner)</SelectItem>
                                  <SelectItem value="self_catering">Self Catering</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Dietary Requirements</Label>
                              <Input placeholder="e.g. Halal, Vegetarian, Nut allergy" value={bookingForm.dietary_requirements} onChange={e => setBookingForm(f => ({ ...f, dietary_requirements: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Emergency Contact Name</Label>
                              <Input value={bookingForm.emergency_contact_name} onChange={e => setBookingForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Emergency Contact Phone</Label>
                              <Input value={bookingForm.emergency_contact_phone} onChange={e => setBookingForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Special Needs / Accessibility</Label>
                              <Input placeholder="e.g. Wheelchair access, ground floor" value={bookingForm.special_needs} onChange={e => setBookingForm(f => ({ ...f, special_needs: e.target.value }))} />
                            </div>
                            <Button onClick={handleBook} className="w-full">Confirm Booking</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* What to Expect */}
              <Card>
                <CardHeader><CardTitle className="text-lg">What to Expect</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { icon: BookOpen, title: 'Workshops & Seminars', desc: 'Intensive hands-on sessions with your lecturers' },
                      { icon: Users, title: 'Group Projects', desc: 'Collaborative projects with your cohort members' },
                      { icon: Clock, title: 'Tutor Meetings', desc: '1-to-1 sessions with your personal tutor' },
                      { icon: Building, title: 'Formal Examinations', desc: 'Proctored exams in secure exam halls' },
                      { icon: BedDouble, title: 'Single-Sex Dormitories', desc: 'Safe, gender-separated accommodation on campus' },
                      { icon: Utensils, title: 'Halal & Dietary Options', desc: 'Full catering with dietary accommodations' },
                    ].map(item => (
                      <div key={item.title} className="flex gap-3 items-start">
                        <div className="p-2 rounded-lg bg-primary/10"><item.icon className="h-4 w-4 text-primary" /></div>
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timetable" className="space-y-4">
              {Object.keys(groupedSessions).length === 0 ? (
                <Card><CardContent className="pt-6 text-center text-muted-foreground">Timetable will be published closer to the residential week dates.</CardContent></Card>
              ) : (
                Object.entries(groupedSessions).map(([day, daySessions]) => (
                  <Card key={day}>
                    <CardHeader><CardTitle className="text-base">{day}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {daySessions.map(s => {
                        const Icon = SESSION_ICONS[s.session_type] || BookOpen;
                        const colourClass = SESSION_COLOURS[s.session_type] || 'bg-gray-100 text-gray-800';
                        return (
                          <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border ${colourClass}`}>
                            <Icon className="h-4 w-4" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{s.title}</p>
                              {s.description && <p className="text-xs opacity-80">{s.description}</p>}
                            </div>
                            <div className="text-xs font-mono">
                              {new Date(s.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–{new Date(s.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {s.location && <Badge variant="outline" className="text-[10px]">{s.location}</Badge>}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="accommodation" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { type: 'Single Room', desc: 'Private en-suite room with study desk, Wi-Fi, and daily housekeeping', icon: BedDouble, price: '£45/night' },
                  { type: 'Shared Dormitory (Male)', desc: '4-bed male-only dormitory with shared bathroom facilities', icon: Users, price: '£25/night' },
                  { type: 'Shared Dormitory (Female)', desc: '4-bed female-only dormitory with shared bathroom facilities', icon: Users, price: '£25/night' },
                ].map(room => (
                  <Card key={room.type} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6 text-center space-y-3">
                      <room.icon className="h-10 w-10 mx-auto text-primary" />
                      <h3 className="font-semibold">{room.type}</h3>
                      <p className="text-xs text-muted-foreground">{room.desc}</p>
                      <Badge variant="outline" className="text-primary">{room.price}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border-amber-200 bg-amber-50/30">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-amber-900 mb-2">Safeguarding & Accommodation Policy</h3>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>All dormitories are strictly single-sex with 24/7 on-site security</li>
                    <li>CCTV monitoring in all common areas (not bedrooms/bathrooms)</li>
                    <li>ID verification required at check-in</li>
                    <li>Quiet hours: 22:00 – 07:00</li>
                    <li>No visitors permitted in accommodation blocks</li>
                    <li>Designated safeguarding lead available at all times</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meals" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { plan: 'Full Board', meals: 'Breakfast, Lunch & Dinner', price: '£35/day', features: ['Hot buffet breakfast', 'Lunch with salad bar', 'Three-course dinner', 'Tea/coffee all day'] },
                  { plan: 'Half Board', meals: 'Breakfast & Dinner', price: '£25/day', features: ['Hot buffet breakfast', 'Three-course dinner', 'Tea/coffee all day'] },
                  { plan: 'Self Catering', meals: 'Kitchen Access Only', price: '£0/day', features: ['Shared kitchen facilities', 'Fridge/microwave access', 'Nearby shops within walking distance'] },
                ].map(meal => (
                  <Card key={meal.plan}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{meal.plan}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{meal.meals}</p>
                      <Badge variant="outline" className="text-primary">{meal.price}</Badge>
                      <ul className="text-xs space-y-1">
                        {meal.features.map(f => (
                          <li key={f} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" />{f}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Dietary Accommodations</h3>
                  <p className="text-sm text-muted-foreground">All meals can be prepared to meet specific dietary requirements including Halal, Vegetarian, Vegan, Gluten-free, Nut-free, and Kosher. Please specify your requirements when booking.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {weeks.length === 0 && !loading && (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">No residential weeks scheduled yet. Check back closer to the academic term.</CardContent></Card>
        )}
      </div>
    </DashboardLayout>
  );
}
