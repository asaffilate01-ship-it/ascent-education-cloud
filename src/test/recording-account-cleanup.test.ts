import {expect,it} from 'vitest';
import {setLearningAccount} from '@/lib/learning/offlineLessons';
import {RECORDING_PROGRESS_KEY,saveRecordingPosition,recordingPosition} from '@/lib/learning/recordingProgress';
it('clears recording bookmarks on signout and identity changes even without IndexedDB',async()=>{
 const a={id:'student',tenantId:'centre'};
 // jsdom has no IndexedDB. Identity cleanup must precede that optional store.
 await setLearningAccount(a);
 localStorage.setItem('unipathway-learning-owner','centre:student');
 saveRecordingPosition(a,'recording',42);
 await setLearningAccount(null);
 expect(localStorage.getItem(RECORDING_PROGRESS_KEY)).toBeNull();
 expect(recordingPosition(a,'recording')).toBe(0);
 await setLearningAccount(a);localStorage.setItem('unipathway-learning-owner','centre:student');saveRecordingPosition(a,'recording',42);
 await setLearningAccount({...a,tenantId:'other'});
 expect(localStorage.getItem(RECORDING_PROGRESS_KEY)).toBeNull();
});
