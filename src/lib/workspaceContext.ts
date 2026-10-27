// Preserve context only on destinations that explicitly consume that parameter.
const modulePaths=new Set(['/student/module','/student/lessons','/student/learning-plan','/student/classroom','/student/library','/student/materials','/student/lesson-archive','/student/assignments','/student/grades','/lecturer/module','/lecturer/lessons','/lecturer/learning-plans','/lecturer/classroom','/lecturer/materials','/lecturer/lesson-archive','/lecturer/assessments','/lecturer/attendance']);
export function workspacePath(path:string,search:string){
 const current=new URLSearchParams(search),module=current.get('module');
 if(!module||!modulePaths.has(path))return path;
 return `${path}?${new URLSearchParams({module})}`;
}
