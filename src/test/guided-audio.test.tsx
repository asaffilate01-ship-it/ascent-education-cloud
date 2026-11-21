import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {GuidedSession} from '@/components/ielts/GuidedAudioLab';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),signed:vi.fn(),upload:vi.fn(),remove:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{rpc:mocks.rpc}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({createSignedUrl:mocks.signed,upload:mocks.upload,remove:mocks.remove})}}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'learner',tenantId:'centre'}})}));
const state={session_id:'class-1',storage_path:'class-1/audio.mp3',title:'Tutor recording',playing:false,position_seconds:12,revision:1,updated_at:'2026-10-24T10:00:00Z'};
function response(manager=false,playing=false){return {data:{state:{...state,playing},server_now:'2026-10-24T10:00:00Z',can_manage:manager},error:null};}
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue(response());mocks.signed.mockResolvedValue({data:{signedUrl:'https://example.invalid/private'},error:null});mocks.upload.mockResolvedValue({error:null});mocks.remove.mockResolvedValue({error:null});vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();});
it('requires explicit audio opt-in and never opens a microphone',async()=>{render(<GuidedSession session="class-1"/>);await screen.findByText('Tutor recording');expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();expect(screen.queryByText('Play for class')).not.toBeInTheDocument();expect(mocks.signed).toHaveBeenCalledWith('class-1/audio.mp3',90);});
it('follows a playing tutor only after enabling and allows leaving',async()=>{mocks.rpc.mockResolvedValue(response(false,true));render(<GuidedSession session="class-1"/>);await screen.findByText('Tutor recording');const media=document.querySelector('audio')!;Object.defineProperty(media,'readyState',{value:1});fireEvent.click(screen.getByText('Enable class audio'));await waitFor(()=>expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());fireEvent.click(screen.getByText('Leave class audio'));expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();});
it('sends revision-checked tutor commands at the server playback position',async()=>{mocks.rpc.mockResolvedValue(response(true));render(<GuidedSession session="class-1"/>);await screen.findByText('Play for class');fireEvent.click(screen.getByText('Play for class'));await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('set_unipathway_guided_audio',{p_session:'class-1',p_revision:1,p_path:'class-1/audio.mp3',p_title:'Tutor recording',p_playing:true,p_position:12}));});
it('reports rejected commands without claiming success',async()=>{mocks.rpc.mockResolvedValueOnce(response(true)).mockResolvedValueOnce({error:{message:'stale'}});render(<GuidedSession session="class-1"/>);fireEvent.click(await screen.findByText('Play for class'));await screen.findByText(/Command was not confirmed/);});
it('clears playback on access failure',async()=>{mocks.rpc.mockResolvedValueOnce(response()).mockResolvedValueOnce({error:{message:'revoked'}});render(<GuidedSession session="class-1"/>);await screen.findByText('Tutor recording');fireEvent.click(screen.getByText('Refresh audio'));await screen.findByRole('alert');expect(screen.queryByText('Tutor recording')).not.toBeInTheDocument();expect(screen.queryByText('Enable class audio')).not.toBeInTheDocument();});
it('fails closed if private audio cannot be retrieved',async()=>{mocks.signed.mockResolvedValue({error:{message:'denied'}});render(<GuidedSession session="class-1"/>);await screen.findByRole('alert');expect(screen.queryByText('Play for class')).not.toBeInTheDocument();});
it('rejects unsuitable uploads without calling storage',async()=>{mocks.rpc.mockResolvedValue(response(true));render(<GuidedSession session="class-1"/>);await screen.findByText('Play for class');fireEvent.change(screen.getByLabelText('Share class audio'),{target:{files:[new File(['text'],'notes.txt',{type:'text/plain'})]}});await screen.findByRole('alert');expect(mocks.upload).not.toHaveBeenCalled();});
it('does not publish a signed URL response after leaving the class',async()=>{let finish!:(value:unknown)=>void;mocks.signed.mockReturnValue(new Promise(resolve=>{finish=resolve;}));const view=render(<GuidedSession session="class-1"/>);await waitFor(()=>expect(mocks.signed).toHaveBeenCalled());view.unmount();await act(async()=>finish({data:{signedUrl:'https://example.invalid/private'}}));expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();});

const initialLink='https://example.invalid/private';
const renewedLink='https://example.invalid/renewed';
function playableAudio(duration=98,currentTime=0,paused=true,ended=false){
 const media=document.querySelector('audio')!;
 Object.defineProperties(media,{
  readyState:{value:1,configurable:true},duration:{value:duration,configurable:true},
  currentTime:{value:currentTime,writable:true,configurable:true},
  paused:{value:paused,configurable:true},ended:{value:ended,configurable:true},
 });
 return media;
}

it('keeps active audio on the same URL at renewal, then uses the renewed URL once on a media error',async()=>{
 mocks.rpc.mockResolvedValue(response(false,true));
 mocks.signed.mockResolvedValueOnce({data:{signedUrl:initialLink}}).mockResolvedValueOnce({data:{signedUrl:renewedLink}});
 render(<GuidedSession session="class-1"/>);
 await waitFor(()=>expect(document.querySelector('audio')).toHaveAttribute('src',initialLink));
 const media=playableAudio(98,12,false);
 fireEvent.click(screen.getByText('Enable class audio'));
 const now=vi.spyOn(Date,'now');const initialTime=Date.now();now.mockReturnValue(initialTime+61000);
 fireEvent.click(screen.getByText('Refresh audio'));
 await waitFor(()=>expect(mocks.signed).toHaveBeenCalledTimes(2));
 expect(media).toHaveAttribute('src',initialLink);
 fireEvent.error(media);
 expect(media).toHaveAttribute('src',renewedLink);
 expect(screen.getByText('Leave class audio')).toBeInTheDocument();
 fireEvent.error(media);
 expect(media).not.toHaveAttribute('src');
 expect(screen.getByText('Enable class audio')).toBeInTheDocument();
});

it('does not play on an ended track or for a late listener, and allows a tutor reset and replay',async()=>{
 const body=(position:number,playing:boolean,revision:number)=>({
  data:{...response(false,playing).data,state:{...state,position_seconds:position,playing,revision}},error:null,
 });
 mocks.rpc.mockResolvedValue(body(98,true,2));
 render(<GuidedSession session="class-1"/>);
 await waitFor(()=>expect(document.querySelector('audio')).toHaveAttribute('src',initialLink));
 const media=playableAudio(98,0,true,false);
 fireEvent.click(screen.getByText('Enable class audio'));
 fireEvent.loadedMetadata(media);
 expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
 playableAudio(98,98,true,true);
 fireEvent.loadedMetadata(media);
 expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

 mocks.rpc.mockResolvedValue(body(0,false,3));
 fireEvent.click(screen.getByText('Refresh audio'));
 await screen.findByText(/Tutor playback: paused/);
 fireEvent.loadedMetadata(media);
 expect(media.currentTime).toBe(0);
 playableAudio(98,0,true,false);
 mocks.rpc.mockResolvedValue(body(0,true,4));
 fireEvent.click(screen.getByText('Refresh audio'));
 await screen.findByText(/Tutor playback: playing/);
 fireEvent.loadedMetadata(media);
 await waitFor(()=>expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1));
});

it('fails closed if link signing stalls, and discards a late signed response',async()=>{
 let finish!:(value:unknown)=>void;
 mocks.signed.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 vi.useFakeTimers();
 render(<GuidedSession session="class-1"/>);
 await act(async()=>{await vi.advanceTimersByTimeAsync(0);});
 expect(mocks.signed).toHaveBeenCalledTimes(1);
 // Advance only to the current timeout, before the next eligible poll.
 await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
 expect(screen.getByRole('alert')).toHaveTextContent('Playback is paused');
 await act(async()=>{finish({data:{signedUrl:renewedLink}});});
 expect(document.querySelector('audio')).toBeNull();
});

it('does not use an old track when the tutor switches files and its new link is pending',async()=>{
 mocks.rpc.mockResolvedValue(response(false,true));
 render(<GuidedSession session="class-1"/>);
 await waitFor(()=>expect(document.querySelector('audio')).toHaveAttribute('src',initialLink));
 const media=playableAudio();
 fireEvent.click(screen.getByText('Enable class audio'));
 mocks.rpc.mockResolvedValue({data:{...response(false,true).data,state:{...state,title:'Replacement',storage_path:'class-1/new.mp3',playing:true}},error:null});
 let finish!:(value:unknown)=>void;
 mocks.signed.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 fireEvent.click(screen.getByText('Refresh audio'));
 await waitFor(()=>expect(media).not.toHaveAttribute('src'));
 expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
 await act(async()=>{finish({data:{signedUrl:renewedLink}});});
 expect(media).toHaveAttribute('src',renewedLink);
 expect(screen.getByText('Replacement')).toBeInTheDocument();
});
