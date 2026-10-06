#!/usr/bin/env node
import fs from 'node:fs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('用法: node scripts/shortlist.mjs <输入JSON> <输出JSON>');
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!input.keyword || !input.audience) throw new Error('输入必须包含 keyword 与 audience');
if (!Array.isArray(input.visible_results)) throw new Error('visible_results 必须是数组');
if (input.visible_results.length > 10) throw new Error('最多允许10条可见结果；请分批处理');
const write = value => fs.writeFileSync(outputPath, JSON.stringify(value, null, 2) + '\n');

if (input.page_state && /login|verify|captcha|安全验证|登录|验证码|滑块|风控/i.test(input.page_state)) {
  write({status:'paused', keyword:input.keyword, audience:input.audience, groups:[], coverage:{visible_results_reviewed:0,shortlist_count:0}, limitations:['检测到登录或验证，未继续读取页面。']});
  process.exit(0);
}

// The Agent reviews visible card text. This script validates and assembles that judgment;
// it does not infer semantic relevance from a closed keyword list.
for (const [index, card] of input.visible_results.entries()) {
  const review = card.agent_review;
  if (!review || !Number.isInteger(review.relevance_score) || review.relevance_score < 0 || review.relevance_score > 5 ||
      !Number.isInteger(review.audience_fit_score) || review.audience_fit_score < 0 || review.audience_fit_score > 5 ||
      typeof review.rationale !== 'string' || !review.rationale.trim() || !Array.isArray(review.evidence) || review.evidence.length === 0) {
    throw new Error(`第${index + 1}张可见卡片缺少完整 agent_review（相关度、受众适配、理由和可见证据）`);
  }
  const body = typeof card.body === 'string' ? card.body.trim() : '';
  const bodyActuallyVisible = card.body_visible === true && body.length > 0;
  const visibleText = `${card.title || ''}\n${card.summary || ''}\n${bodyActuallyVisible ? body : ''}`;
  if (review.evidence.some(quote => typeof quote !== 'string' || quote.trim().length < 2 || !visibleText.includes(quote))) {
    throw new Error(`第${index + 1}张卡片的 agent_review.evidence 必须逐字来自可见标题或摘要`);
  }
  if (review.relevance_score > 0 && (typeof review.theme !== 'string' || !review.theme.trim() || typeof review.angle !== 'string' || !review.angle.trim())) {
    throw new Error(`第${index + 1}张相关卡片必须由 Agent 提供主题和受众角度`);
  }
  const locationClaims = review.relevance_score > 0 ? ['一线城市'] : [];
  const groundingText = `${input.audience}\n${visibleText}`;
  if (locationClaims.some(claim => review.angle.includes(claim) && !groundingText.includes(claim))) {
    throw new Error(`第${index + 1}张卡片的角度包含输入和可见资料均未支持的城市限定`);
  }
}
const ranked = input.visible_results.map((card, index) => ({card, index, review:card.agent_review}))
  .filter(item => item.review.relevance_score > 0)
  .sort((a, b) => b.review.relevance_score - a.review.relevance_score || b.review.audience_fit_score - a.review.audience_fit_score || a.index - b.index)
  .slice(0, 5);
const groups = new Map();
for (const {card, review} of ranked) {
  const missing = new Set(Array.isArray(card.missing) ? card.missing : []);
  const body = typeof card.body === 'string' ? card.body.trim() : '';
  const bodyActuallyVisible = card.body_visible === true && body.length > 0;
  if (!card.title) missing.add('标题缺失');
  if (!card.summary) missing.add('摘要缺失');
  if (!card.source) missing.add('来源缺失');
  if (!bodyActuallyVisible) missing.add('正文不可见');
  const note = {title:card.title || null, summary:card.summary || null, body:bodyActuallyVisible ? body : null, source:card.source || null,
    relevance_score:review.relevance_score, audience_fit_score:review.audience_fit_score,
    review_rationale:review.rationale, evidence:review.evidence, theme:review.theme || null, angle:review.angle || null, missing:[...missing]};
  if (!groups.has(review.theme)) groups.set(review.theme, {theme:review.theme, angle:review.angle, notes:[]});
  groups.get(review.theme).notes.push(note);
}
const notes = [...groups.values()].flatMap(group => group.notes);
const incomplete = notes.some(note => note.missing.length > 0);
const limitations = [];
if (notes.length < 5) limitations.push('相关可见结果不足5条，未使用无关卡片补足。');
if (incomplete) limitations.push('部分入选卡片的摘要、正文或来源不可见/缺失，已逐条标记，结果为不完整短名单。');
write({status:notes.length === 5 && !incomplete ? 'completed' : 'partial', keyword:input.keyword, audience:input.audience,
  groups:[...groups.values()], coverage:{visible_results_reviewed:input.visible_results.length,shortlist_count:notes.length},limitations});
