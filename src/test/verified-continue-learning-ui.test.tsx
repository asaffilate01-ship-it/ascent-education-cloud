import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import ContinueLearning from '@/components/student/ContinueLearning';

const state=vi.hoisted(()=>({
 user:{id:'student-one',tenantId:'centre-a',role:'student',roles:['student'],name:'Learner'},
 tables:{} as Record<string,Record<string,unknown>[]>,
 calls:[] as Array<[string,string,string,unknown]>,
 ignoreOwnerFilter:false,
 ignoreLessonCentreFilter:false,
 failedTable:'',
}));

vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{
 let data=[...(state.tables[table]||[])];
 const q:any={
  select:()=>q,
  eq:(column:string,value:unknown)=>{
   state.calls.push([table,'eq',column,value]);
   if(!((table==='unipathway_lesson_progress'&&column==='student_id'&&state.ignoreOwnerFilter)||
     (table==='unipathway_lessons'&&column==='tenant_id'&&state.ignoreLessonCentreFilter)))
    data=data.filter(row=>row[column]===value);
   return q;
  },
  in:(column:string,values:unknown[])=>{
   state.calls.push([table,'in',column,values]);
   data=data.filter(row=>values.includes(row[column]));
   return q;
  },
  order:()=>q,
  range:async(start:number,end:number)=>({
   data:data.slice(start,end+1),
   error:table===state.failedTable?{message:'unavailable'}:null,
  }),
 };
 return q;
}}}));

const module={id:'module-a',title:'Digital Skills',code:'DS4'};
const lesson={
 id:'lesson-a',tenant_id:'centre-a',module_id:'module-a',status:'published',
 title:'Working with data',position:1,revision:2,
};
const progress={
 student_id:'student-one',lesson_id:'lesson-a',revision:2,
 position_seconds:77,completed:false,updated_at:'2026-11-14T12:00:00Z',
};
const mount=()=>render(<MemoryRouter><ContinueLearning modules={[module]}/></MemoryRouter>);
beforeEach(()=>{
 state.user={id:'student-one',tenantId:'centre-a',role:'student',roles:['student'],name:'Learner'};
 state.tables={unipathway_lessons:[lesson],unipathway_lesson_progress:[progress]};
 state.calls=[];state.ignoreOwnerFilter=false;state.ignoreLessonCentreFilter=false;state.failedTable='';
});
afterEach(cleanup);

it('resumes only a verified, student-owned current revision and links to that exact lesson',async()=>{
 mount();
 const link=await screen.findByRole('link',{name:/Resume lesson/});
 expect(link).toHaveAttribute('href','/student/lessons?module=module-a&lesson=lesson-a');
 expect(screen.getByText(/Verified against your active enrolled modules/)).toBeInTheDocument();
 expect(state.calls).toContainEqual(['unipathway_lesson_progress','eq','student_id','student-one']);
 expect(state.calls).toContainEqual(['unipathway_lessons','eq','tenant_id','centre-a']);
});

it('does not show an incorrect resume link when a returned row belongs to another student',async()=>{
 state.ignoreOwnerFilter=true;
 state.tables.unipathway_lesson_progress=[{...progress,student_id:'another-student'}];
 mount();
 await screen.findByRole('alert');
 expect(screen.getByText(/could not be verified/)).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:/Resume lesson/})).toBeNull();
 expect(screen.getByRole('button',{name:/Retry learning progress/})).toBeInTheDocument();
});

it('does not read progress from a lesson that fails centre verification',async()=>{
 state.tables.unipathway_lessons=[{...lesson,tenant_id:'other-centre'}];
 state.ignoreLessonCentreFilter=true; // Simulate an inconsistent backend response.
 mount();
 await screen.findByRole('alert');
 expect(state.calls.some(call=>call[0]==='unipathway_lesson_progress')).toBe(false);
 expect(screen.queryByRole('link',{name:/Resume lesson/})).toBeNull();
});

it('retains the latest lessons only for the current account when identity switches',async()=>{
 const view=mount();
 await screen.findByRole('link',{name:/Resume lesson/});
 state.user={...state.user,id:'student-two'};
 state.tables.unipathway_lesson_progress=[];
 view.rerender(<MemoryRouter><ContinueLearning modules={[module]}/></MemoryRouter>);
 expect(screen.queryByRole('link',{name:/Resume lesson/})).toBeNull();
 await waitFor(()=>expect(screen.getByText(/Ready to begin/)).toBeInTheDocument());
});
