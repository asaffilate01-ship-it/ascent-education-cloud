// Synthetic PGlite-only security rehearsal. Never connects to Supabase/Dishbee.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const id={
 a:'10000000-0000-4000-8000-000000000001',
 b:'10000000-0000-4000-8000-000000000002',
 guardA:'20000000-0000-4000-8000-000000000001',
 guardB:'20000000-0000-4000-8000-000000000002',
 student:'20000000-0000-4000-8000-000000000003',
 director:'20000000-0000-4000-8000-000000000004',
 checkin:'30000000-0000-4000-8000-000000000001',
 checkout:'30000000-0000-4000-8000-000000000002',
};
let checks=0;const uuid=x=>`'${x}'::uuid`,q=sql=>db.query(sql);
await db.exec(`
CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE TYPE public.app_role AS ENUM('security_officer','centre_director','student');
CREATE TABLE public.tenants(id uuid PRIMARY KEY,status text NOT NULL);
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid NOT NULL);
CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);
CREATE TABLE public.centre_visitors(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,full_name text NOT NULL,
 id_type text,id_reference_masked text,host_user_id uuid,purpose text,pass_number text NOT NULL,
 checked_in_at timestamptz,checked_out_at timestamptz,status text NOT NULL DEFAULT 'pre_registered',
 created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.centre_access_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,credential_id uuid,
 visitor_id uuid,gate_id text NOT NULL,direction text NOT NULL,decision text NOT NULL,
 reason text,occurred_at timestamptz DEFAULT now(),security_user_id uuid,device_reference text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE public.centre_occupancy(
 tenant_id uuid NOT NULL,person_key text NOT NULL,person_type text NOT NULL,user_id uuid,visitor_id uuid,
 in_building boolean NOT NULL DEFAULT false,last_event_at timestamptz,last_gate_id text,
 PRIMARY KEY(tenant_id,person_key));
CREATE TABLE public.cctv_cameras(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,camera_code text,display_name text,status text,last_health_at timestamptz,stream_reference text,nvr_channel text);
CREATE TABLE public.security_devices(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,device_code text,device_type text,status text,last_health_at timestamptz,endpoint_reference text,metadata jsonb);
CREATE TABLE public.emergency_muster_events(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,status text,started_at timestamptz,ended_at timestamptz);
CREATE TABLE public.emergency_muster_status(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,muster_event_id uuid,person_key text,person_type text,expected_inside boolean,status text,muster_point text);
ALTER TABLE public.centre_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centre_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centre_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_muster_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_muster_status ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
INSERT INTO public.tenants VALUES('${id.a}','active'),('${id.b}','active');
INSERT INTO public.profiles VALUES
 ('${id.guardA}','${id.a}'),('${id.guardB}','${id.b}'),
 ('${id.student}','${id.a}'),('${id.director}','${id.a}');
INSERT INTO public.user_roles VALUES
 ('${id.guardA}','${id.a}','security_officer'),
 ('${id.guardB}','${id.b}','security_officer'),
 ('${id.student}','${id.a}','student'),
 ('${id.director}','${id.a}','centre_director');
`);
await db.exec(readFileSync('scripts/activation/unipathway-physical-security-operations-forward.sql','utf8'));
async function as(actor,sql,role='authenticated'){
 await db.exec('RESET ROLE');
 await q(`SELECT set_config('test.uid','${actor||''}',false)`);
 await db.exec(`SET ROLE ${role}`);
 try{return await q(sql);}finally{await db.exec('RESET ROLE');}
}
async function deny(actor,sql){
 await assert.rejects(()=>as(actor,sql),/(denied|permission|required|invalid|missing|receipt|checkout|visitor|identifier|role|schema|unknown|dataset|page)/i);checks++;
}
const register=(tenant,request=id.checkin,attest=true)=>`SELECT public.unipathway_register_centre_visitor(
 ${uuid(tenant)},'Sample Visitor','Academic appointment','Reception',${attest},${uuid(request)}) AS receipt`;
const read=(tenant,kind,event=null)=>`SELECT public.get_unipathway_security_operations_rows(${uuid(tenant)},'${kind}',0,200,${event?uuid(event):'NULL'}) AS receipt`;
const checkout=(tenant,visitor,request=id.checkout)=>`SELECT public.unipathway_checkout_centre_visitor(
 ${uuid(tenant)},${uuid(visitor)},'Reception',${uuid(request)}) AS receipt`;
const body=r=>typeof r.rows[0].receipt==='string'?JSON.parse(r.rows[0].receipt):r.rows[0].receipt;
// The forward patch does not activate physical reads or visitor writes by itself.
await deny(id.guardA,read(id.a,'centre_visitors'));
await deny(id.guardA,register(id.a));
const disabled=(await q('SELECT physical_reads_enabled,visitor_writes_enabled FROM unipathway_security.activation_gate')).rows[0];
assert.deepEqual(disabled,{physical_reads_enabled:false,visitor_writes_enabled:false});checks++;
await q('UPDATE unipathway_security.activation_gate SET physical_reads_enabled=true');
const readOnly=body(await as(id.guardA,read(id.a,'centre_visitors')));
assert.deepEqual(readOnly,[]);checks++;
await deny(id.guardA,register(id.a));
await q('UPDATE unipathway_security.activation_gate SET visitor_writes_enabled=true');

await deny(id.student,register(id.a));
await deny(id.guardB,register(id.a));
await deny(id.director,register(id.a));
await deny(id.guardA,register(id.b));
await deny(id.guardA,register(id.a,id.checkin,false));
await deny(id.guardA,`INSERT INTO public.centre_visitors(tenant_id,full_name,pass_number) VALUES(${uuid(id.a)},'Unsafe','unsafe')`);
await deny(id.guardA,'SELECT * FROM unipathway_security.visitor_command_receipts');
await deny(id.guardA,'SELECT id FROM public.centre_visitors');
await deny(id.guardA,'SELECT stream_reference FROM public.cctv_cameras');
await deny(id.guardA,read(id.b,'centre_visitors'));
await deny(id.guardA,read(id.a,'not-allowlisted'));
await deny(id.guardA,`SELECT public.get_unipathway_security_operations_rows(${uuid(id.a)},'centre_visitors',0,201,NULL)`);
await deny(id.guardA,checkout(id.a,id.checkin));
const first=body(await as(id.guardA,register(id.a)));
assert.equal(first.tenant_id,id.a);assert.equal(first.status,'in_building');assert.match(first.pass_number,/^UP-/);checks++;
assert.equal(body(await as(id.guardA,register(id.a))).id,first.id);checks++;
assert.equal((await q('SELECT count(*)::int AS n FROM public.centre_access_events')).rows[0].n,1);checks++;
assert.equal((await q('SELECT count(*)::int AS n FROM public.centre_occupancy WHERE in_building')).rows[0].n,1);checks++;
await deny(id.guardB,checkout(id.b,first.id));
const guardAList=body(await as(id.guardA,read(id.a,'centre_visitors')));
assert.deepEqual(guardAList.map(r=>r.tenant_id),[id.a]);checks++;
const guardBList=body(await as(id.guardB,read(id.b,'centre_visitors')));
assert.equal(guardBList.length,0);checks++;
await q(`INSERT INTO public.cctv_cameras(id,tenant_id,camera_code,display_name,status,last_health_at,stream_reference,nvr_channel)
VALUES (gen_random_uuid(),${uuid(id.a)},'CAM-A','Front gate','online',now(),'SECRET-CAMERA-STREAM','NVR-CREDENTIAL')`);
const projectedCameras=body(await as(id.guardA,read(id.a,'cctv_cameras')));
assert.equal(projectedCameras.length,1);
assert.equal(projectedCameras[0].camera_code,'CAM-A');
assert.equal('stream_reference' in projectedCameras[0],false);
assert.equal('nvr_channel' in projectedCameras[0],false);checks++;
const out=body(await as(id.guardA,checkout(id.a,first.id)));
assert.equal(out.status,'checked_out');checks++;
assert.equal(body(await as(id.guardA,checkout(id.a,first.id))).id,first.id);checks++;
assert.equal((await q('SELECT count(*)::int AS n FROM public.centre_access_events')).rows[0].n,2);checks++;
assert.equal((await q('SELECT in_building FROM public.centre_occupancy')).rows[0].in_building,false);checks++;
await deny(id.guardA,checkout(id.a,first.id,'30000000-0000-4000-8000-000000000003'));
await deny(id.guardA,checkout(id.a,'30000000-0000-4000-8000-000000000003'));
await q('UPDATE unipathway_security.activation_gate SET visitor_writes_enabled=false');
await deny(id.guardA,register(id.a,'30000000-0000-4000-8000-000000000005'));
await q('UPDATE unipathway_security.activation_gate SET visitor_writes_enabled=true');
await q(`UPDATE public.tenants SET status='suspended' WHERE id=${uuid(id.a)}`);
await deny(id.guardA,register(id.a,'30000000-0000-4000-8000-000000000004'));
await deny(id.guardA,read(id.a,'centre_visitors'));
checks++;
// Exercise the actual facilities forward patches in the same isolated two-centre rehearsal.
const priorChecks=checks;
await q(`UPDATE public.tenants SET status='active' WHERE id=${uuid(id.a)}`);
await db.exec(readFileSync('scripts/activation/unipathway-facilities-register-forward.sql','utf8'));
await db.exec(readFileSync('scripts/activation/unipathway-facilities-register-read-forward.sql','utf8'));
const assetTable='public.unipathway_facilities_assets';
const inspectionTable='public.unipathway_facilities_inspections';
const snapshot=tenant=>`SELECT public.get_unipathway_facilities_register(${uuid(tenant)}) AS receipt`;
const assetInsert=(tenant,code='F01')=>`INSERT INTO ${assetTable}(tenant_id,category,asset_code,location,planned_inspection_date) VALUES(${uuid(tenant)},'extinguisher','${code}','Reception',CURRENT_DATE+1) RETURNING id,tenant_id,created_by`;
const inspectionInsert=(tenant,asset,date="(now() AT TIME ZONE 'Asia/Karachi')::date")=>`INSERT INTO ${inspectionTable}(tenant_id,asset_id,inspected_on,outcome,notes) VALUES(${uuid(tenant)},${uuid(asset)},${date},'defect','Test defect') RETURNING id,recorded_by`;
async function rejectsSql(actor,sql,role='authenticated',code='42501'){
 await assert.rejects(()=>as(actor,sql,role),err=>err.code===code, `Expected SQLSTATE ${code}`);checks++;
}
assert.equal((await q('SELECT enabled FROM unipathway_security.facilities_activation')).rows[0].enabled,false);checks++;
await rejectsSql(id.director,snapshot(id.a));
await rejectsSql(id.director,assetInsert(id.a));
await rejectsSql(null,snapshot(id.a),'anon');
await rejectsSql(null,`SELECT * FROM ${assetTable}`,'anon');
await q('UPDATE unipathway_security.facilities_activation SET enabled=true');
await q('UPDATE unipathway_security.activation_gate SET physical_reads_enabled=false');
await rejectsSql(id.director,snapshot(id.a));
await q('UPDATE unipathway_security.activation_gate SET physical_reads_enabled=true');
assert.deepEqual(body(await as(id.director,snapshot(id.a))),{assets:[],inspections:[]});checks++;
await rejectsSql(id.guardA,assetInsert(id.a));
await rejectsSql(id.student,snapshot(id.a));
await rejectsSql(id.guardB,snapshot(id.a));
await rejectsSql(id.director,assetInsert(id.b));
await rejectsSql(id.director,`UPDATE unipathway_security.facilities_activation SET enabled=false`);
const asset=(await as(id.director,assetInsert(id.a))).rows[0];
assert.equal(asset.created_by,id.director);checks++;
await rejectsSql(id.director,assetInsert(id.a,'f01'),'authenticated','23505');
await rejectsSql(id.director,`INSERT INTO ${assetTable}(tenant_id,category,asset_code,location,planned_inspection_date,created_by) VALUES(${uuid(id.a)},'ups','U01','Room',CURRENT_DATE,${uuid(id.guardA)})`);
const inspection=(await as(id.director,inspectionInsert(id.a,asset.id))).rows[0];
assert.equal(inspection.recorded_by,id.director);checks++;
await rejectsSql(id.guardA,inspectionInsert(id.a,asset.id));
await rejectsSql(id.director,inspectionInsert(id.a,asset.id,"(now() AT TIME ZONE 'Asia/Karachi')::date+1"));
await rejectsSql(id.director,`DELETE FROM ${inspectionTable} WHERE id=${uuid(inspection.id)}`);
await rejectsSql(id.director,`UPDATE ${inspectionTable} SET notes='Rewritten' WHERE id=${uuid(inspection.id)}`);
const otherAsset=(await q(`INSERT INTO ${assetTable}(tenant_id,category,asset_code,location,planned_inspection_date,created_by) VALUES(${uuid(id.b)},'ups','U01','Other centre',CURRENT_DATE,${uuid(id.guardB)}) RETURNING id`)).rows[0].id;
await rejectsSql(id.director,inspectionInsert(id.a,otherAsset),'authenticated','23503');
const own=body(await as(id.guardA,snapshot(id.a)));
assert.equal(own.assets.length,1);assert.equal(own.assets[0].id,asset.id);
assert.equal(own.inspections.length,1);assert.equal(own.inspections[0].id,inspection.id);
assert.equal('created_by' in own.assets[0],false);assert.equal('recorded_by' in own.inspections[0],false);checks++;
assert.deepEqual(body(await as(id.guardB,snapshot(id.b))).assets.map(row=>row.id),[otherAsset]);checks++;
await q('UPDATE unipathway_security.facilities_activation SET enabled=false');
await rejectsSql(id.guardA,snapshot(id.a));
assert.equal((await as(id.director,`SELECT id FROM ${assetTable}`)).rows.length,0);checks++;
await q('UPDATE unipathway_security.facilities_activation SET enabled=true');
await q(`UPDATE public.tenants SET status='suspended' WHERE id=${uuid(id.a)}`);
await rejectsSql(id.director,snapshot(id.a));
// Rehearse the third forward patch: disabled writes, private receipts and bounded replay.
await q(`UPDATE public.tenants SET status='active' WHERE id=${uuid(id.a)}`);
await db.exec(readFileSync('scripts/activation/unipathway-facilities-register-write-forward.sql','utf8'));
const requestA='40000000-0000-4000-8000-000000000001';
const requestB='40000000-0000-4000-8000-000000000002';
const requestC='40000000-0000-4000-8000-000000000003';
const today=(await q("SELECT ((now() AT TIME ZONE 'Asia/Karachi')::date)::text AS d")).rows[0].d;
const tomorrow=(await q("SELECT ((now() AT TIME ZONE 'Asia/Karachi')::date+1)::text AS d")).rows[0].d;
const payloadA={category:'fire_alarm',asset_code:'ALARM-01',location:'Reception',planned_inspection_date:today};
const command=(tenant,request,kind,payload)=>`SELECT public.unipathway_record_facilities_item(${uuid(tenant)},${uuid(request)},'${kind}','${JSON.stringify(payload).replaceAll("'","''")}'::jsonb) AS receipt`;
assert.equal((await q('SELECT enabled FROM unipathway_security.facilities_write_activation')).rows[0].enabled,false);checks++;
await rejectsSql(id.director,command(id.a,requestA,'asset',payloadA));
assert.equal(body(await as(id.guardA,snapshot(id.a))).assets.length,1);checks++;
await q('UPDATE unipathway_security.facilities_write_activation SET enabled=true');
await rejectsSql(id.guardA,command(id.a,requestA,'asset',payloadA));
await rejectsSql(id.student,command(id.a,requestA,'asset',payloadA));
await rejectsSql(id.director,command(id.b,requestA,'asset',payloadA));
await rejectsSql(null,command(id.a,requestA,'asset',payloadA),'anon');
await rejectsSql(id.director,assetInsert(id.a,'DIRECT'));
await rejectsSql(id.director,inspectionInsert(id.a,asset.id));
await rejectsSql(id.director,'SELECT * FROM unipathway_security.facilities_command_receipts');
await rejectsSql(id.director,'UPDATE unipathway_security.facilities_write_activation SET enabled=false');
await rejectsSql(id.director,command(id.a,requestA,'asset',{...payloadA,created_by:id.guardA}),'authenticated','22023');
const registered=body(await as(id.director,command(id.a,requestA,'asset',payloadA)));
assert.deepEqual(registered,{id:registered.id,tenant_id:id.a,kind:'asset',request_id:requestA});checks++;
assert.deepEqual(body(await as(id.director,command(id.a,requestA,'asset',payloadA))),registered);checks++;
await rejectsSql(id.director,command(id.a,requestA,'asset',{...payloadA,location:'Different'}),'authenticated','22023');
await rejectsSql(id.director,command(id.a,requestC,'asset',{...payloadA,asset_code:'alarm-01'}),'authenticated','23505');
const payloadB={asset_id:registered.id,inspected_on:today,outcome:'not_verified',notes:'Observed example only',next_due_date:null};
await rejectsSql(id.director,command(id.a,requestA,'inspection',payloadB),'authenticated','22023');
await rejectsSql(id.director,command(id.a,requestB,'inspection',{...payloadB,asset_id:otherAsset}));
await rejectsSql(id.director,command(id.a,requestB,'inspection',{...payloadB,inspected_on:tomorrow}),'authenticated','22023');
const recorded=body(await as(id.director,command(id.a,requestB,'inspection',payloadB)));
assert.deepEqual(recorded,{id:recorded.id,tenant_id:id.a,kind:'inspection',request_id:requestB});checks++;
assert.deepEqual(body(await as(id.director,command(id.a,requestB,'inspection',payloadB))),recorded);checks++;
await rejectsSql(id.director,command(id.a,requestB,'inspection',{...payloadB,notes:'Changed'}),'authenticated','22023');
const result=body(await as(id.guardA,snapshot(id.a)));
assert.equal(result.assets.length,2);assert.equal(result.inspections.length,2);
assert.equal(result.inspections.find(i=>i.id===recorded.id).notes,payloadB.notes);checks++;
assert.equal((await q(`SELECT recorded_by FROM ${inspectionTable} WHERE id=${uuid(recorded.id)}`)).rows[0].recorded_by,id.director);checks++;
await rejectsSql(id.director,`UPDATE ${inspectionTable} SET notes='Overwrite' WHERE id=${uuid(recorded.id)}`);
await q('UPDATE unipathway_security.facilities_write_activation SET enabled=false');
await rejectsSql(id.director,command(id.a,requestB,'inspection',payloadB));
assert.equal(body(await as(id.guardA,snapshot(id.a))).inspections.length,2);checks++;
await q('UPDATE unipathway_security.facilities_write_activation SET enabled=true');
await q(`UPDATE public.tenants SET status='suspended' WHERE id=${uuid(id.a)}`);
await rejectsSql(id.director,command(id.a,requestB,'inspection',payloadB));
console.log(`UniPathway PGlite facilities register: ${checks-priorChecks} assertions passed`);
await db.close();
console.log(`UniPathway PGlite physical-security authorization and idempotency: ${checks} assertions passed`);
