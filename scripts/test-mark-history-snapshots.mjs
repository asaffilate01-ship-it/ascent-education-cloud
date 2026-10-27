import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const db=new PGlite();try{
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;
CREATE TABLE unipathway_assessment_human_marks(attempt_id uuid,tenant_id uuid,marker_id uuid,revision int,criteria_scores jsonb,feedback text,marked_at timestamptz,raw_score numeric,penalty_points numeric,adjusted_score numeric);
CREATE TABLE unipathway_assessment_mark_history(attempt_id uuid,tenant_id uuid,marker_id uuid,revision int,raw_score numeric,penalty_points numeric,adjusted_score numeric);
INSERT INTO unipathway_assessment_human_marks VALUES('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',2,'[{"code":"A","points":80}]','Actual second feedback',now(),80,0,80);
INSERT INTO unipathway_assessment_mark_history SELECT attempt_id,tenant_id,marker_id,1,70,0,70 FROM unipathway_assessment_human_marks;
INSERT INTO unipathway_assessment_mark_history SELECT attempt_id,tenant_id,marker_id,revision,raw_score,penalty_points,adjusted_score FROM unipathway_assessment_human_marks;`);
await db.exec(readFileSync('supabase/migrations/20261027160742_assessment_revision_snapshots.sql','utf8'));
const rows=(await db.query('SELECT * FROM unipathway_assessment_mark_history ORDER BY revision')).rows;assert.equal(rows[0].feedback,null);assert.equal(rows[1].feedback,'Actual second feedback');assert.equal(rows[1].criteria_scores[0].points,80);
await db.exec("UPDATE unipathway_assessment_human_marks SET revision=3,feedback='Actual third feedback'");
await assert.rejects(db.exec('INSERT INTO unipathway_assessment_mark_history(attempt_id,tenant_id,marker_id,revision,raw_score,penalty_points,adjusted_score) SELECT attempt_id,tenant_id,marker_id,revision,99,0,99 FROM unipathway_assessment_human_marks'));
await db.exec('INSERT INTO unipathway_assessment_mark_history(attempt_id,tenant_id,marker_id,revision,raw_score,penalty_points,adjusted_score) SELECT attempt_id,tenant_id,marker_id,revision,raw_score,penalty_points,adjusted_score FROM unipathway_assessment_human_marks');
assert.equal((await db.query('SELECT feedback FROM unipathway_assessment_mark_history WHERE revision=2')).rows[0].feedback,'Actual second feedback');
assert.equal((await db.query('SELECT feedback FROM unipathway_assessment_mark_history WHERE revision=3')).rows[0].feedback,'Actual third feedback');
assert.equal((await db.query("SELECT has_function_privilege('anon','capture_uni_mark_history_snapshot()','EXECUTE') AS allowed")).rows[0].allowed,false);
console.log('7 revision snapshot backfill, mismatch, preservation and function-grant checks passed');
}finally{await db.close();}
