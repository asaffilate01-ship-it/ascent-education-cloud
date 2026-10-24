import {describe,it,expect} from 'vitest';
import {riskFlags} from '../../scripts/lib/unipathway-migration-risk.mjs';
describe('migration constraint scanner',()=>{
 it('accepts valid RLS subqueries without labelling them table constraints',()=>{
  expect(riskFlags('CREATE POLICY p ON t WITH\n CHECK (EXISTS (SELECT 1 FROM memberships));')).toEqual([]);
 });
 it('finds invalid table constraints even after a valid policy',()=>{
  expect(riskFlags('CREATE POLICY p ON t WITH CHECK(EXISTS(SELECT 1)); ALTER TABLE t ADD CHECK(x=(SELECT max(x) FROM t));')).toContain('CHECK_CONTAINS_SUBQUERY');
 });
 it('ignores comments and SELECT inside a string literal',()=>{
  expect(riskFlags("-- CHECK((SELECT 1))\nCREATE TABLE t(x text CHECK(x <> 'SELECT')); ")).toEqual([]);
 });
 it('flags historical auth fixture scripts for explicit review',()=>{
  expect(riskFlags('UPDATE auth.users SET email_change = NULL;')).toContain('HISTORICAL_AUTH_FIXTURE_REVIEW');
 });
});
