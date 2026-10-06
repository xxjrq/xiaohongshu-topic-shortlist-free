#!/usr/bin/env node
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(os.tmpdir(), `xiaohongshu-shortlist-${process.pid}.json`);
const cli = path.join(root, 'scripts/shortlist.mjs');
const fixture = name => path.join(root, 'fixtures', name);
const run = name => {
  execFileSync(process.execPath, [cli, fixture(name), out], {stdio:'inherit'});
  return JSON.parse(fs.readFileSync(out, 'utf8'));
};
try {
  const result = run('success-input.json');
  const notes = result.groups.flatMap(group => group.notes);
  if (result.status !== 'completed' || result.coverage.shortlist_count !== 5 || result.coverage.visible_results_reviewed !== 7) throw new Error('五条完整成功样例未产出五条短名单');
  const expectedOrder = [1,2,3,6,5].map(n => `https://example.invalid/note/${n}`);
  if (notes.map(note => note.source).join(',') !== expectedOrder.join(',')) throw new Error('未按 Agent 相关度、受众适配和稳定顺序排序五条来源');
  if (notes.some(note => note.source?.includes('unrelated'))) throw new Error('与穿搭无关的通勤整理/露营卡片不得入选');
  if (!notes.some(note => note.title === '通勤胶囊衣橱：五件轮换')) throw new Error('应依据可见标题语义选入“通勤胶囊衣橱”');
  if (notes.some(note => !note.source || !note.evidence.length || !note.review_rationale)) throw new Error('每条入选结果需保留来源、可见证据和 Agent 理由');

  if (run('failure-login-input.json').status !== 'paused') throw new Error('中文验证状态暂停断言失败');
  const incomplete = run('partial-missing-input.json');
  const hiddenBody = incomplete.groups.flatMap(group => group.notes).find(note => note.title === null);
  if (incomplete.status !== 'partial' || !hiddenBody || !hiddenBody.missing.includes('标题缺失') || !hiddenBody.missing.includes('正文不可见')) throw new Error('被选中的正文不可见卡片必须保留摘要并标成 partial');
  if (!incomplete.groups.flatMap(group => group.notes).some(note => note.missing.includes('摘要缺失'))) throw new Error('线上卡片缺少摘要时必须显式标记并保持 partial');
  const summaryOnly = JSON.parse(fs.readFileSync(fixture('success-input.json'), 'utf8'));
  delete summaryOnly.visible_results[1].body_visible;
  const summaryPath = path.join(os.tmpdir(), `xiaohongshu-shortlist-summary-${process.pid}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summaryOnly));
  try {
    execFileSync(process.execPath, [cli, summaryPath, out], {stdio:'inherit'});
    const summaryResult = JSON.parse(fs.readFileSync(out, 'utf8'));
    const summaryNote = summaryResult.groups.flatMap(group => group.notes).find(note => note.source.endsWith('/note/1'));
    if (summaryResult.status !== 'partial' || !summaryNote.missing.includes('正文不可见')) throw new Error('仅有标题和摘要且未声明正文可见时必须降为 partial');
  } finally { for (const file of [summaryPath, out]) if (fs.existsSync(file)) fs.unlinkSync(file); }
  const falseBodyClaim = JSON.parse(fs.readFileSync(fixture('success-input.json'), 'utf8'));
  delete falseBodyClaim.visible_results[1].body;
  const falseBodyPath = path.join(os.tmpdir(), `xiaohongshu-shortlist-false-body-${process.pid}.json`);
  fs.writeFileSync(falseBodyPath, JSON.stringify(falseBodyClaim));
  try {
    execFileSync(process.execPath, [cli, falseBodyPath, out], {stdio:'inherit'});
    const bodyResult = JSON.parse(fs.readFileSync(out, 'utf8'));
    const bodyNote = bodyResult.groups.flatMap(group => group.notes).find(note => note.source.endsWith('/note/1'));
    if (bodyResult.status !== 'partial' || !bodyNote.missing.includes('正文不可见')) throw new Error('body_visible=true 但缺正文原文时必须保持 partial');
  } finally { for (const file of [falseBodyPath, out]) if (fs.existsSync(file)) fs.unlinkSync(file); }
  const fabricatedCity = JSON.parse(fs.readFileSync(fixture('partial-one-related-input.json'), 'utf8'));
  fabricatedCity.visible_results[1].agent_review.angle = '面向一线城市上班族，提炼穿搭方法。';
  const cityPath = path.join(os.tmpdir(), `xiaohongshu-shortlist-city-${process.pid}.json`);
  fs.writeFileSync(cityPath, JSON.stringify(fabricatedCity));
  try {
    const failed = spawnSync(process.execPath, [cli, cityPath, out], {encoding:'utf8'});
    if (failed.status === 0 || !`${failed.stderr}${failed.stdout}`.includes('未支持的城市限定')) throw new Error('不得输出输入和可见资料都未支持的一线城市角度');
  } finally { for (const file of [cityPath, out]) if (fs.existsSync(file)) fs.unlinkSync(file); }

  const none = run('failure-no-related-input.json');
  if (none.status !== 'partial' || none.coverage.shortlist_count !== 0 || none.groups.length !== 0) throw new Error('无相关结果时不得用无关卡片补足');
  const one = run('partial-one-related-input.json');
  if (one.status !== 'partial' || one.coverage.shortlist_count !== 1 || one.groups.flatMap(g => g.notes).some(n => n.source.endsWith('/unrelated'))) throw new Error('相关不足时仅交付真实相关条目');

  const badInput = path.join(os.tmpdir(), `xiaohongshu-shortlist-invalid-${process.pid}.json`);
  const badOut = path.join(os.tmpdir(), `xiaohongshu-shortlist-invalid-${process.pid}-out.json`);
  const invalid = JSON.parse(fs.readFileSync(fixture('success-input.json'), 'utf8'));
  delete invalid.visible_results[0].agent_review;
  fs.writeFileSync(badInput, JSON.stringify(invalid));
  try {
    const failed = spawnSync(process.execPath, [cli, badInput, badOut], {encoding:'utf8'});
    if (failed.status === 0 || !`${failed.stderr}${failed.stdout}`.includes('缺少完整 agent_review')) throw new Error('缺少 Agent 逐条审阅的负向 CLI 用例未失败');
  } finally {
    for (const file of [badInput, badOut]) if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  console.log('self-test passed: five reviewed picks, semantic evidence provenance, irrelevant-card rejection, partial/empty/login cases, unsupported-city rejection, and negative CLI');
  console.log('Note: fixtures are offline mocks; the CLI validates Agent review records and does not claim general semantic understanding or online collection.');
} finally { if (fs.existsSync(out)) fs.unlinkSync(out); }
