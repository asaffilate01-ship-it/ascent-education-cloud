import { useState, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Printer, Download, GraduationCap, Award, BookOpen, CheckCircle } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useAuth } from '@/contexts/AuthContext';

const getGradeClass = (grade: number) => {
  if (grade >= 70) return { label: 'Distinction', color: 'text-success', bg: 'bg-success/10' };
  if (grade >= 60) return { label: 'Merit', color: 'text-primary', bg: 'bg-primary/10' };
  if (grade >= 40) return { label: 'Pass', color: 'text-warning', bg: 'bg-warning/10' };
  return { label: 'Fail', color: 'text-destructive', bg: 'bg-destructive/10' };
};

export default function ReportCardGenerator() {
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const { data: programmes, loading: pLoad } = useSupabaseQuery('programmes');
  const { data: modules } = useSupabaseQuery('modules');
  const { data: submissions } = useSupabaseQuery('submissions');
  const { data: assignments } = useSupabaseQuery('assignments');
  const { data: profiles, loading: prLoad } = useSupabaseQuery('profiles');
  const { data: attendance } = useSupabaseQuery('attendance_records');

  const loading = pLoad || prLoad;

  // Get student profiles
  const students = useMemo(() => {
    return profiles.filter(p => p.user_id);
  }, [profiles]);

  // Filter modules by selected programme
  const progModules = useMemo(() => {
    if (!selectedProgramme) return [];
    return modules.filter(m => m.programme_id === selectedProgramme);
  }, [modules, selectedProgramme]);

  // Build grade data for selected student
  const reportData = useMemo(() => {
    if (!selectedStudent || !selectedProgramme) return null;

    const prog = programmes.find(p => p.id === selectedProgramme);
    const student = students.find(s => s.user_id === selectedStudent);
    if (!prog || !student) return null;

    const moduleGrades = progModules.map(mod => {
      const modAssignments = assignments.filter(a => a.module_id === mod.id);
      const modSubmissions = modAssignments.map(a => {
        const sub = submissions.find(s => s.assignment_id === a.id && s.student_id === selectedStudent);
        return {
          assignment: a.title,
          type: a.type,
          maxMarks: a.max_marks,
          grade: sub?.grade ?? null,
          status: sub?.status || 'pending',
          feedback: sub?.feedback || null,
        };
      });

      const graded = modSubmissions.filter(s => s.grade !== null);
      const avgGrade = graded.length > 0
        ? Math.round(graded.reduce((sum, s) => sum + (s.grade || 0), 0) / graded.length)
        : null;

      return {
        module: mod.title,
        code: (mod as any).module_number || mod.code || '',
        credits: mod.credits || 0,
        submissions: modSubmissions,
        averageGrade: avgGrade,
        classification: avgGrade !== null ? getGradeClass(avgGrade) : null,
      };
    });

    // Attendance
    const studentAttendance = attendance.filter(a => a.student_id === selectedStudent);
    const totalRecords = studentAttendance.length;
    const presentRecords = studentAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : null;

    // Overall
    const allGraded = moduleGrades.filter(m => m.averageGrade !== null);
    const overallAvg = allGraded.length > 0
      ? Math.round(allGraded.reduce((sum, m) => sum + (m.averageGrade || 0), 0) / allGraded.length)
      : null;
    const totalCredits = moduleGrades.reduce((sum, m) => sum + m.credits, 0);
    const earnedCredits = allGraded.reduce((sum, m) => sum + ((m.averageGrade || 0) >= 40 ? m.credits : 0), 0);

    return {
      student,
      programme: prog,
      moduleGrades,
      overallAverage: overallAvg,
      overallClassification: overallAvg !== null ? getGradeClass(overallAvg) : null,
      attendanceRate,
      totalCredits,
      earnedCredits,
      generatedAt: new Date().toLocaleString(),
    };
  }, [selectedStudent, selectedProgramme, progModules, assignments, submissions, attendance, programmes, students]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardLayout
      title="Report Card Generator"
      subtitle="Generate and print student report cards"
      actions={
        reportData && (
          <Button size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Report
          </Button>
        )
      }
    >
      {/* Filters */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Programme</label>
          <Select value={selectedProgramme} onValueChange={(v) => { setSelectedProgramme(v); setSelectedStudent(''); }}>
            <SelectTrigger><SelectValue placeholder="Select programme..." /></SelectTrigger>
            <SelectContent>
              {programmes.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {(p as any).course_number ? `${(p as any).course_number} — ` : ''}{p.title} ({p.level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Student</label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedProgramme}>
            <SelectTrigger><SelectValue placeholder={selectedProgramme ? 'Select student...' : 'Select programme first'} /></SelectTrigger>
            <SelectContent>
              {students.map(s => (
                <SelectItem key={s.user_id} value={s.user_id}>{s.full_name} ({s.email})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Card */}
      {!reportData ? (
        <div className="surface-card p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">Select a programme and student</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">The report card will be generated automatically from their grades, attendance, and module progress.</p>
        </div>
      ) : (
        <div ref={reportRef} className="surface-card p-6 sm:p-8 print:shadow-none print:border-0 print:p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b-2 border-primary/20">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-extrabold text-primary">Student Report Card</h2>
              </div>
              <p className="text-xs text-muted-foreground">Generated: {reportData.generatedAt}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary">{reportData.programme.awarding_body}</span>
              </div>
              {(reportData.programme as any).course_number && (
                <span className="text-xs font-mono text-muted-foreground">{(reportData.programme as any).course_number}</span>
              )}
            </div>
          </div>

          {/* Student & Programme Info */}
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Student Details</h3>
              <div className="space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Name:</span> <span className="font-semibold">{reportData.student.full_name}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">Email:</span> {reportData.student.email}</p>
                <p className="text-sm"><span className="text-muted-foreground">Student ID:</span> <span className="font-mono text-xs">{reportData.student.user_id.slice(0, 8).toUpperCase()}</span></p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Programme Details</h3>
              <div className="space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Programme:</span> <span className="font-semibold">{reportData.programme.title}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">Level:</span> {reportData.programme.level}</p>
                <p className="text-sm"><span className="text-muted-foreground">Duration:</span> {reportData.programme.duration || '—'}</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="surface-data p-4 rounded-xl text-center">
              <p className="text-2xl font-extrabold text-primary">{reportData.overallAverage ?? '—'}%</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Overall Average</p>
              {reportData.overallClassification && (
                <span className={`text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded ${reportData.overallClassification.bg} ${reportData.overallClassification.color}`}>
                  {reportData.overallClassification.label}
                </span>
              )}
            </div>
            <div className="surface-data p-4 rounded-xl text-center">
              <p className="text-2xl font-extrabold text-foreground">{reportData.earnedCredits}/{reportData.totalCredits}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Credits Earned</p>
            </div>
            <div className="surface-data p-4 rounded-xl text-center">
              <p className="text-2xl font-extrabold text-foreground">{reportData.attendanceRate ?? '—'}%</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Attendance</p>
            </div>
            <div className="surface-data p-4 rounded-xl text-center">
              <p className="text-2xl font-extrabold text-foreground">{reportData.moduleGrades.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Modules</p>
            </div>
          </div>

          {/* Module Grades Table */}
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Module Results
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground">Module</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground">Code</th>
                  <th className="text-center py-2 px-3 text-xs font-bold text-muted-foreground">Credits</th>
                  <th className="text-center py-2 px-3 text-xs font-bold text-muted-foreground">Grade</th>
                  <th className="text-center py-2 px-3 text-xs font-bold text-muted-foreground">Classification</th>
                  <th className="text-center py-2 px-3 text-xs font-bold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.moduleGrades.map((mg) => (
                  <tr key={mg.module} className="border-b border-border/50 hover:bg-secondary/30 transition-all">
                    <td className="py-2.5 px-3 font-medium">{mg.module}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{mg.code || '—'}</td>
                    <td className="py-2.5 px-3 text-center">{mg.credits}</td>
                    <td className="py-2.5 px-3 text-center">
                      {mg.averageGrade !== null ? (
                        <span className={`font-bold ${mg.classification?.color}`}>{mg.averageGrade}%</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {mg.classification ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${mg.classification.bg} ${mg.classification.color}`}>
                          {mg.classification.label}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {mg.averageGrade !== null && mg.averageGrade >= 40 ? (
                        <CheckCircle className="w-4 h-4 text-success mx-auto" />
                      ) : mg.averageGrade !== null ? (
                        <span className="text-[10px] text-destructive font-bold">REFER</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">IN PROGRESS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Assignment Breakdown per module */}
          {reportData.moduleGrades.map((mg) => (
            mg.submissions.length > 0 && (
              <div key={mg.module} className="mb-4">
                <h4 className="text-xs font-bold text-muted-foreground mb-2">{mg.code || ''} {mg.module} — Assignment Breakdown</h4>
                <div className="grid gap-2">
                  {mg.submissions.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between surface-data p-2.5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16">{sub.type}</span>
                        <span className="text-xs font-medium">{sub.assignment}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">/{sub.maxMarks}</span>
                        {sub.grade !== null ? (
                          <span className={`text-xs font-bold ${getGradeClass(sub.grade).color}`}>{sub.grade}%</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{sub.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-primary/20 flex items-center justify-between text-xs text-muted-foreground">
            <p>This is a computer-generated report card. For verification, contact the centre administration.</p>
            <p>Powered by EduCloud</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
