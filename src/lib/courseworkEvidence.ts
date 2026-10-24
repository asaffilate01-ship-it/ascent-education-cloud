export const COURSEWORK_BUCKET = 'unipathway-coursework';
export const COURSEWORK_TYPES: Record<string,string> = {pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
export function courseworkFileError(file: Pick<File,'name'|'type'|'size'>): string | null {
 const extension=file.name.split('.').pop()?.toLowerCase()||'';
 if(!COURSEWORK_TYPES[extension] || COURSEWORK_TYPES[extension]!==file.type) return 'Choose a PDF, DOCX, JPG or PNG file.';
 if(!file.size||file.size>20*1024*1024)return 'Choose a non-empty file up to 20 MB.';
 return null;
}
export type CourseworkFile={id:string;file_name:string;mime_type:string;byte_size:number;storage_path:string;attempt_id:string|null};
