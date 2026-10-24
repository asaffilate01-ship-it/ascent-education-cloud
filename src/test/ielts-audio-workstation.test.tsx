import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import IELTSAudioWorkstation from '@/components/ielts/IELTSAudioWorkstation';
let stopTrack: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;
let recorders: FakeRecorder[];
class FakeRecorder {
  state = 'inactive'; mimeType = 'audio/webm';
  ondataavailable?: (event: {data: Blob}) => void;
  onstop?: () => void;
  onerror?: () => void;
  constructor() {recorders.push(this);}
  start() {this.state = 'recording';}
  stop() {this.state = 'inactive'; this.ondataavailable?.({data: new Blob(['voice'])}); this.onstop?.();}
}
beforeEach(() => {
  recorders = []; stopTrack = vi.fn();
  getUserMedia = vi.fn().mockResolvedValue({getTracks: () => [{stop: stopTrack}]});
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([{kind: 'audioinput', deviceId: 'usb-mic', label: 'USB headset'}])}});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  URL.createObjectURL = vi.fn().mockReturnValue('blob:local-test'); URL.revokeObjectURL = vi.fn();
});
afterEach(() => {cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();});
function openFile() {
  fireEvent.change(screen.getByLabelText('Open practice audio'), {target: {files: [new File(['audio'], 'lesson.mp3', {type: 'audio/mpeg'})]}});
  const player = screen.getByLabelText('Practice audio player') as HTMLAudioElement;
  Object.defineProperty(player, 'duration', {configurable: true, value: 60}); fireEvent.loadedMetadata(player); return player;
}
describe('individual language-lab workstation', () => {
  it('does not request microphone access automatically', () => {render(<IELTSAudioWorkstation />); expect(getUserMedia).not.toHaveBeenCalled();});
  it('provides independent volume, speed, seek and repeat controls', () => {
    render(<IELTSAudioWorkstation />); const player = openFile();
    expect(player.volume).toBe(0.5);
    fireEvent.change(screen.getByLabelText(/Volume/), {target: {value: '0.25'}}); expect(player.volume).toBe(0.25);
    fireEvent.change(screen.getByLabelText('Playback speed'), {target: {value: '0.75'}}); expect(player.playbackRate).toBe(0.75);
    player.currentTime = 10; fireEvent.timeUpdate(player); fireEvent.click(screen.getByText('Set repeat start'));
    player.currentTime = 20; fireEvent.timeUpdate(player); fireEvent.click(screen.getByText('Set repeat end')); fireEvent.click(screen.getByText('Repeat section'));
    expect(player.currentTime).toBe(10); player.currentTime = 21; fireEvent.timeUpdate(player); expect(player.currentTime).toBe(10);
    fireEvent.click(screen.getByText('Stop repeating')); player.currentTime = 21; fireEvent.timeUpdate(player); expect(player.currentTime).toBe(21);
    fireEvent.click(screen.getByText('Back 10 seconds')); expect(player.currentTime).toBe(11);
  });
  it('rejects non-audio files and handles decoding failures', () => {
    render(<IELTSAudioWorkstation />);
    fireEvent.change(screen.getByLabelText('Open practice audio'), {target: {files: [new File(['text'], 'file.txt', {type: 'text/plain'})]}});
    expect(screen.getByRole('alert')).toHaveTextContent('audio file'); const player = openFile(); fireEvent.error(player);
    expect(screen.getByRole('alert')).toHaveTextContent('could not be decoded');
  });
  it('releases local file URLs on clear and unmount', () => {
    const view = render(<IELTSAudioWorkstation />); openFile(); fireEvent.click(screen.getByText('Clear audio'));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-test'); expect(screen.queryByLabelText('Practice audio player')).not.toBeInTheDocument();
    openFile(); view.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
  it('records locally, stops capture and allows preview disposal', async () => {
    render(<IELTSAudioWorkstation />); fireEvent.click(screen.getByText('Test microphone for 10 seconds'));
    await screen.findByText('Stop microphone check'); fireEvent.click(screen.getByText('Stop microphone check'));
    expect(stopTrack).toHaveBeenCalled(); expect(screen.getByLabelText('Local microphone check')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Discard microphone check')); expect(screen.queryByLabelText('Local microphone check')).not.toBeInTheDocument();
    expect(screen.getByRole('option', {name: 'USB headset'})).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Microphone'), {target: {value: 'usb-mic'}}); fireEvent.click(screen.getByText('Test microphone for 10 seconds'));
    await screen.findByText('Stop microphone check'); expect(getUserMedia).toHaveBeenLastCalledWith({audio: {deviceId: {exact: 'usb-mic'}, echoCancellation: true, noiseSuppression: true}});
  });
  it('automatically stops after ten seconds', async () => {
    vi.useFakeTimers(); render(<IELTSAudioWorkstation />);
    await act(async () => {fireEvent.click(screen.getByText('Test microphone for 10 seconds'));});
    act(() => vi.advanceTimersByTime(10000)); expect(stopTrack).toHaveBeenCalled(); expect(screen.getByLabelText('Local microphone check')).toBeInTheDocument();
  });
  it('reports microphone denial and permits retry', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('denied')); render(<IELTSAudioWorkstation />);
    fireEvent.click(screen.getByText('Test microphone for 10 seconds')); await screen.findByRole('alert');
    expect(screen.getByText('Test microphone for 10 seconds')).toBeEnabled();
  });
  it('releases a microphone permission result arriving after unmount', async () => {
    let resolve!: (value: unknown) => void; getUserMedia.mockReturnValue(new Promise(r => {resolve = r;}));
    const view = render(<IELTSAudioWorkstation />); fireEvent.click(screen.getByText('Test microphone for 10 seconds')); view.unmount();
    await act(async () => resolve({getTracks: () => [{stop: stopTrack}]}));
    expect(stopTrack).toHaveBeenCalled(); expect(recorders).toHaveLength(0);
  });
  it('stops an active microphone when leaving', async () => {
    const view = render(<IELTSAudioWorkstation />); fireEvent.click(screen.getByText('Test microphone for 10 seconds'));
    await waitFor(() => expect(recorders[0]?.state).toBe('recording')); view.unmount();
    expect(recorders[0].state).toBe('inactive'); expect(stopTrack).toHaveBeenCalled();
  });
});
