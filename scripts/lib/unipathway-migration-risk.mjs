// Only table CHECK constraints prohibit subqueries; RLS WITH CHECK permits them.
export const riskFlags=(sql)=>{
 const warnings=[];
 const clean=sql.replace(/--[^\n]*/g,' ').replace(/\/\*[\s\S]*?\*\//g,' ');
 for(const match of clean.matchAll(/\bCHECK\s*\(/gi)){
  if(/\bWITH\s*$/i.test(clean.slice(0,match.index)))continue;
  let depth=1,end=match.index+match[0].length,quoted=false;
  const start=end;
  for(;end<clean.length&&depth;end++){
   const c=clean[end];
   if(c==="'"){if(quoted&&clean[end+1]==="'"){end++;continue;}quoted=!quoted;}
   if(!quoted){if(c==='(')depth++;if(c===')')depth--;}
  }
  if(/\bSELECT\b/i.test(clean.slice(start,end).replace(/'(?:''|[^'])*'/g,''))){warnings.push('CHECK_CONTAINS_SUBQUERY');break;}
 }
 if(/\b(?:INSERT\s+INTO|UPDATE)\s+auth\.users\b|\bseed_dev_user\s*\(/i.test(clean))warnings.push('HISTORICAL_AUTH_FIXTURE_REVIEW');
 if(/\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i.test(sql))
  warnings.push('DISABLES_RLS');
 if(/\bTRUNCATE\s+(?:TABLE\s+)?(?:public\.|auth\.|storage\.)/i.test(sql))
  warnings.push('TRUNCATES_DATA');
 if(/\bDROP\s+TABLE\s+(?!IF\s+EXISTS)/i.test(sql))
  warnings.push('DROP_TABLE_REVIEW');
 if(/\bDELETE\s+FROM\s+auth\.users\b/i.test(sql))
  warnings.push('DELETES_AUTH_USERS');
 return warnings;
};

