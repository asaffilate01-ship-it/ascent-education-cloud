import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import LearnerSupportAgenda from '@/components/progression/LearnerSupportAgenda';
import type {SupportTask} from '@/lib/supportDesk';
const now=Date.parse('2026-10-15T12:00:00Z');
const task=(id:string,status='pending',due_at:string|null=null)=>({id,application_id:'case',title:id,status,due_at,task_type:'documents'}) as SupportTask;
afterEach(cleanup);
it('filters overdue work without showing completed tasks as overdue',()=>{render(<LearnerSupportAgenda tasks={[task('late','pending','2020-01-01T00:00:00Z'),task('done','completed','2020-01-01T00:00:00Z'),task('undated')]} programmes={new Map()} now={now} onOpen={()=>{}}/>);fireEvent.change(screen.getByLabelText('Show support tasks'),{target:{value:'overdue'}});expect(screen.getByText('late')).toBeInTheDocument();expect(screen.queryByText('done')).not.toBeInTheDocument();expect(screen.queryByText('undated')).not.toBeInTheDocument();fireEvent.change(screen.getByLabelText('Show support tasks'),{target:{value:'completed'}});expect(screen.getByText('done')).toBeInTheDocument();expect(screen.queryByText('late')).not.toBeInTheDocument();});
it('paginates the agenda and resets pagination on filter changes',()=>{render(<LearnerSupportAgenda tasks={Array.from({length:11},(_,n)=>task(String(n).padStart(2,'0')))} programmes={new Map()} now={now} onOpen={()=>{}}/>);expect(screen.queryByText('10')).not.toBeInTheDocument();fireEvent.click(screen.getByText('Next deadlines'));expect(screen.getByText('10')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Show support tasks'),{target:{value:'undated'}});expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();});
