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
await db.close();
console.log(`UniPathway PGlite physical-security authorization and idempotency: ${checks} assertions passed`);
