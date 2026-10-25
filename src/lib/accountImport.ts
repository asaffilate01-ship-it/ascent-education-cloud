export const accountRoles=['student','parent_guardian','admissions_admin','lecturer','assessor','programme_leader','iqa_officer','exams_officer','finance_officer','marketing_officer','agent','welfare_officer','security_officer'] as const;
export type AccountRow={email:string;fullName:string;role:string;status?:string;error?:string};
export function parseAccountCsv(text:string):AccountRow[]{
 if(text.length>100000)throw new Error('CSV must be under 100 KB.');
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 const source=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
 for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quoted&&source[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(field.trim());field='';if(c==='\n'){if(row.some(Boolean))rows.push(row);row=[];}}else field+=c;}
 if(quoted)throw new Error('Unclosed CSV quote.');row.push(field.trim());if(row.some(Boolean))rows.push(row);
 const headers=rows.shift()?.map(h=>h.toLowerCase());if(headers?.join(',')!=='email,full_name,role')throw new Error('Use the exact headers: email,full_name,role.');
 if(!rows.length||rows.length>50)throw new Error('Import between 1 and 50 accounts per batch.');
 const seen=new Set<string>();return rows.map((cells,i)=>{const [email,name,role]=cells;const normalized=email?.toLowerCase();if(cells.length!==3||!normalized||!/^\S+@[^\s@]+\.[^\s@]+$/.test(normalized)||normalized.length>254||!name||name.length<2||name.length>120||!accountRoles.includes(role as typeof accountRoles[number]))throw new Error(`Invalid email, name or role on row ${i+2}.`);if(seen.has(normalized))throw new Error(`Duplicate email on row ${i+2}.`);seen.add(normalized);return {email:normalized,fullName:name,role};});
}
