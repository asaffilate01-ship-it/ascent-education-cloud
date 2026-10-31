import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';

/**
 * Informational only until official academic-release, centre sign-off and
 * awarding-body certificate issuance can be verified server-side.
 */
interface CertificateDownloadModalProps{
 open:boolean;onOpenChange:(open:boolean)=>void;studentName?:string;programmeName?:string;
}
export default function CertificateDownloadModal({open,onOpenChange,studentName,programmeName}:CertificateDownloadModalProps){
 return <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
   <DialogHeader><DialogTitle>Certificate verification required</DialogTitle>
    <DialogDescription>UniPathway cannot issue or print an official award using editable names, grades or awarding-body labels.</DialogDescription>
   </DialogHeader>
   <div className="space-y-3 text-sm">
    {studentName&&<p className="break-words">Learner: {studentName}</p>}
    {programmeName&&<p className="break-words">Programme: {programmeName}</p>}
    <p>Only the approved centre records team can confirm completion, independent assessment and the issuing organisation's authority. Request a verified record through your centre.</p>
   </div>
   <Button className="min-h-11" onClick={()=>onOpenChange(false)}>Close</Button>
  </DialogContent>
 </Dialog>;
}
