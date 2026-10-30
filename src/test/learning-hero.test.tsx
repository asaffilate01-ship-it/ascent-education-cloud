import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import LearningHero from '@/components/promo/LearningHero';
let preference:EventTarget & {matches:boolean};
let desktop:EventTarget & {matches:boolean};
const show=()=>render(<MemoryRouter><LearningHero/></MemoryRouter>);
beforeEach(()=>{
 preference=Object.assign(new EventTarget(),{matches:false});
 desktop=Object.assign(new EventTarget(),{matches:true});
 vi.spyOn(window,'matchMedia').mockImplementation(query=>(query.includes('min-width')?desktop:preference) as MediaQueryList);
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
 Object.defineProperty(navigator,'connection',{configurable:true,value:undefined});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('pauses and resumes the decorative background without moving the course links',async()=>{
 const {container}=show();
 await screen.findByRole('button',{name:'Pause background animation'});
 expect(container.querySelector('video')).toHaveAttribute('preload','none');
 expect(container.querySelector('video')).toHaveProperty('muted',true);
 fireEvent.click(screen.getByRole('button',{name:'Pause background animation'}));
 expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Play background animation'}));
 expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
 expect(screen.getByRole('link',{name:'Find your course'})).toHaveAttribute('href','#study');
 expect(screen.getByRole('link',{name:'Plan your application'})).toHaveAttribute('href','/apply');
});
it('does not attach a video source for reduced motion, including preference changes',async()=>{
 preference.matches=true;const {container}=show();
 expect(container.querySelector('video')).toBeNull();
 await act(async()=>{preference.matches=false;preference.dispatchEvent(new Event('change'));});
 expect(container.querySelector('video source')).toHaveAttribute('src','/media/unipathway-learning-hero-v2.mp4');
 await act(async()=>{preference.matches=true;preference.dispatchEvent(new Event('change'));});
 expect(container.querySelector('video')).toBeNull();
 expect(container.querySelector('img')).toHaveAttribute('fetchpriority','high');
});
it.each([{saveData:true},{effectiveType:'2g'},{effectiveType:'slow-2g'}])('keeps the still image on a restricted connection: %j',connection=>{
 Object.defineProperty(navigator,'connection',{configurable:true,value:Object.assign(new EventTarget(),connection)});
 const {container}=show();expect(container.querySelector('video')).toBeNull();
 expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Move forward.');
});
it('keeps the still image and course choices if autoplay or video loading fails',async()=>{
 vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('Playback blocked'));
 const {container}=show();await waitFor(()=>expect(container.querySelector('video')).toBeNull());
 expect(container.querySelector('img')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Find your course'})).toBeInTheDocument();
});

it('keeps the full original still on mobile and reacts when the viewport changes',async()=>{
 desktop.matches=false;const {container}=show();
 expect(container.querySelector('video')).toBeNull();
 expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
 expect(container.querySelector('img')).toHaveClass('h-auto');
 await act(async()=>{desktop.matches=true;desktop.dispatchEvent(new Event('change'));});
 expect(container.querySelector('video source')).toBeInTheDocument();
 await act(async()=>{desktop.matches=false;desktop.dispatchEvent(new Event('change'));});
 expect(container.querySelector('video')).toBeNull();
 expect(screen.queryByRole('button',{name:'Pause background animation'})).toBeNull();
});
