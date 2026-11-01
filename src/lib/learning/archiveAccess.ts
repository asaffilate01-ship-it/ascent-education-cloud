import {classReleaseStatus,type ClassReleaseClock} from '@/lib/learning/classRelease';

/**
 * Classroom archive access follows the currently selected and verified role.
 * Backend RLS and the storage-signing RPC remain the final authority.
 */
export type ArchiveAudience='student'|'lecturer'|'blocked';
export function archiveAudience(user:{
 id?:string|null;tenantId?:string|null;role?:string|null;roles?:readonly string[]|null
}|null|undefined):ArchiveAudience{
 if(!user?.id||!user.tenantId||!user.role||!user.roles?.includes(user.role))return 'blocked';
 return user.role==='student'?'student':user.role==='lecturer'?'lecturer':'blocked';
}

type ArchivedClass=Pick<ClassReleaseClock,'status'|'ends_at'|'actual_ended_at'>;
type ArchivedAsset={publication_status:string;available_at:string|null};

/**
 * A displayed item needs independently confirmed class completion and a valid
 * availability timestamp. At least twelve hours must pass, even when an
 * academic manager has recorded the exceptional urgent release.
 *
 * The ordinary 24-hour vs approved 12-hour decision is SERVER controlled:
 * this client check is a second, conservative guard, not authorisation.
 */
export function archiveMinimumEmbargoElapsed(session:ArchivedClass,now=Date.now()){
 return classReleaseStatus({...session,urgent_approved:true},now).unlocked;
}

export function publishedArchiveAssetAvailable(
 asset:ArchivedAsset,session:ArchivedClass,now=Date.now()
){
 if(asset.publication_status!=='published'||!asset.available_at)return false;
 const at=Date.parse(asset.available_at);
 if(!Number.isFinite(at)||at>now)return false;
 const earliest=classReleaseStatus({...session,urgent_approved:true},at);
 return earliest.unlocked&&archiveMinimumEmbargoElapsed(session,now);
}
