import {Link,useParams} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LectureInteractions from '@/components/classroom/LectureInteractions';
import {useAuth} from '@/contexts/AuthContext';
import {ArrowLeft,BookOpen,PenTool,Video} from 'lucide-react';

export default function LectureDiscussion(){
 const {sessionId}=useParams<{sessionId:string}>();
 const {user}=useAuth();
 const teacher=!!user?.roles.some(x=>['lecturer','programme_leader','centre_director','superadmin'].includes(x));
 return <DashboardLayout title="UniPathway Lecture Discussion" subtitle="Raise hands, ask questions and receive lecturer guidance">
  <nav className="mb-5 flex flex-wrap gap-4 text-sm font-semibold">
   <Link to={teacher?'/lecturer/classroom':'/student/classroom'} className="flex items-center gap-2 underline"><ArrowLeft className="size-4"/>Back to my classes</Link>
   <Link to={teacher?'/lecturer/materials':'/student/materials'} className="flex items-center gap-2 underline"><BookOpen className="size-4"/>Course notes and slides</Link>
   {teacher&&<Link to="/lecturer/whiteboards" className="flex items-center gap-2 underline"><PenTool className="size-4"/>Whiteboard Studio</Link>}
  </nav>
  <p className="mb-5 flex gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground"><Video className="size-5 shrink-0"/>In-app speaking requests and messages are saved separately from Teams microphone audio. The presenter calls on students; speaking and media recording are governed by Microsoft Teams meeting controls.</p>
  {sessionId?<LectureInteractions sessionId={sessionId}/>:<p role="alert">No scheduled lecture was selected.</p>}
 </DashboardLayout>;
}
