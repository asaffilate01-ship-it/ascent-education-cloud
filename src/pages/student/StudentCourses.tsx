import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen, Clock, Users, Award, ChevronRight, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ENROLLED_COURSES = [
  {
    id: '1',
    title: 'Level 5 Diploma in Business Management',
    awardingBody: 'OTHM',
    progress: 65,
    modules: [
      { name: 'Strategic Management', status: 'in_progress', grade: '68%', lecturer: 'Dr. Khan' },
      { name: 'Financial Analysis', status: 'in_progress', grade: '72%', lecturer: 'Mr. Rashid' },
      { name: 'Business Environment', status: 'completed', grade: '78%', lecturer: 'Ms. Ahmed' },
      { name: 'Marketing Strategy', status: 'upcoming', grade: '-', lecturer: 'Dr. Farooq' },
      { name: 'Research Methods', status: 'upcoming', grade: '-', lecturer: 'TBC' },
      { name: 'Operations Management', status: 'upcoming', grade: '-', lecturer: 'TBC' },
    ],
    intake: 'Oct 2024',
    duration: '12 months',
    credits: 120,
    enrolled: 28,
  },
];

export default function StudentCourses() {
  const course = ENROLLED_COURSES[0];
  const completed = course.modules.filter(m => m.status === 'completed').length;
  const inProgress = course.modules.filter(m => m.status === 'in_progress').length;

  return (
    <DashboardLayout title="My Courses" subtitle="Enrolled programmes and module progress">
      {/* Course Overview Card */}
      <div className="surface-card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                {course.awardingBody}
              </span>
              <span className="text-[10px] text-muted-foreground">Intake: {course.intake}</span>
            </div>
            <h2 className="text-lg font-bold">{course.title}</h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>
              <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {course.credits} credits</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrolled} students</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{course.progress}%</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-default" style={{ width: `${course.progress}%` }} />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> {completed} Completed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> {inProgress} In Progress</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> {course.modules.length - completed - inProgress} Upcoming</span>
        </div>
      </div>

      {/* Modules List */}
      <h3 className="text-base font-semibold mb-3">Modules</h3>
      <div className="space-y-2">
        {course.modules.map((mod) => (
          <div key={mod.name} className="surface-card p-4 flex items-center gap-4 hover:shadow-lg transition-default cursor-pointer group">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              mod.status === 'completed' ? 'bg-success/10' :
              mod.status === 'in_progress' ? 'bg-primary/10' : 'bg-secondary'
            }`}>
              <BookOpen className={`w-4 h-4 ${
                mod.status === 'completed' ? 'text-success' :
                mod.status === 'in_progress' ? 'text-primary' : 'text-muted-foreground'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{mod.name}</p>
              <p className="text-xs text-muted-foreground">Lecturer: {mod.lecturer}</p>
            </div>
            <div className="text-right mr-2">
              <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded ${
                mod.status === 'completed' ? 'bg-success/10 text-success' :
                mod.status === 'in_progress' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
              }`}>
                {mod.status.replace('_', ' ')}
              </span>
              {mod.grade !== '-' && <p className="text-xs font-semibold mt-1">{mod.grade}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-default" />
          </div>
        ))}
      </div>

      {/* Progression Pathway */}
      <div className="surface-card p-5 mt-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Your Pathway
        </h3>
        <div className="flex items-center gap-2">
          {[
            { level: 'Level 4', status: 'completed', label: 'Completed (2024)' },
            { level: 'Level 5', status: 'current', label: 'In Progress' },
            { level: 'Top-Up Degree', status: 'future', label: 'UK / Canada / Australia' },
          ].map((step, i) => (
            <div key={step.level} className="flex-1 flex items-center gap-2">
              <div className={`flex-1 p-3 rounded-lg text-center ${
                step.status === 'completed' ? 'bg-success/10 border border-success/20' :
                step.status === 'current' ? 'bg-primary/10 border border-primary/20' :
                'bg-secondary border border-border'
              }`}>
                <p className="text-xs font-bold">{step.level}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{step.label}</p>
              </div>
              {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
