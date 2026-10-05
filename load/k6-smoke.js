import http from 'k6/http'; import {check,sleep} from 'k6';
export const options={scenarios:{student_browse:{executor:'ramping-vus',startVUs:0,stages:[{duration:'30s',target:50},{duration:'60s',target:200},{duration:'30s',target:0}]},large_class_api:{executor:'constant-vus',vus:300,duration:'30s'}},thresholds:{http_req_failed:['rate<0.01'],http_req_duration:['p(95)<1000']}};
const BASE=__ENV.BASE_URL||'http://127.0.0.1:4173';
export default function(){const r=http.get(BASE+'/');check(r,{'home 200':x=>x.status===200});sleep(1)}
