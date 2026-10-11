'use strict';
const fs = require('fs'), path = require('path');
const DIR = __dirname, CH = path.join(DIR, 'chapters'), OUT = path.join(DIR, 'index.html');
const ORDER = ['ch00_intro.md','ch01_bi_adjust.md','ch02_memory_leak.md','ch03_dead_code.md','ch04_guide.md','ch05_fps.md','ch06_ui.md','ch07_channel_sdk.md','ch08_audio.md','ch09_toolchain.md','ch10_basics.md','ch11_roadmap.md','appendix_star.md'];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => { s = esc(s);
  s = s.replace(/`([^`]+)`/g, (m, c) => '<code>' + c + '</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => '<a href="' + u.replace(/"/g, '%22') + '">' + t + '</a>');
  return s; };
function md2html(md) {
  const out = [], lines = md.split(/\r?\n/); let i = 0, fence = null, ul = [], ol = [], bq = [];
  const flush = () => { if (ul.length) out.push('<ul>' + ul.map(x => '<li>' + x + '</li>').join('') + '</ul>');
    if (ol.length) out.push('<ol>' + ol.map(x => '<li>' + x + '</li>').join('') + '</ol>');
    if (bq.length) out.push('<blockquote>' + bq.filter(x => x.trim()).map(x => '<p>' + inline(x) + '</p>').join('') + '</blockquote>');
    ul = []; ol = []; bq = []; };
  while (i < lines.length) { const L = lines[i];
    if (/^```/.test(L)) { flush(); if (fence) { out.push('<pre><code>' + fence.join('\n') + '</code></pre>'); fence = null; } else fence = []; i++; continue; }
    if (fence) { fence.push(L); i++; continue; }
    if (/^\|/.test(L)) { flush(); const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { const r = lines[i++].replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
        if (r.length && r.every(c => /^:?-+:?$/.test(c))) continue; rows.push(r); }
      if (rows.length) out.push('<table><tr>' + rows[0].map(c => '<th>' + inline(c) + '</th>').join('') + '</tr>' +
        rows.slice(1).map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</table>');
      continue; }
    const mBq = L.match(/^> ?(.*)$/);
    if (mBq) { if (ul.length || ol.length) flush(); bq.push(mBq[1]); i++; continue; }
    const mUl = L.match(/^\s*[-*] +(.*)$/);
    if (mUl) { if (ol.length || bq.length) flush(); ul.push(inline(mUl[1])); i++; continue; }
    const mOl = L.match(/^\s*\d+\. +(.*)$/);
    if (mOl) { if (ul.length || bq.length) flush(); ol.push(inline(mOl[1])); i++; continue; }
    flush();
    const mH = L.match(/^(#{1,4}) +(.*)$/);
    if (mH) { const n = mH[1].length; out.push('<h' + n + '>' + inline(mH[2].replace(/#+\s*$/, '')) + '</h' + n + '>'); i++; continue; }
    if (L.trim()) out.push('<p>' + inline(L.trim()) + '</p>');
    i++; }
  flush(); if (fence) out.push('<pre><code>' + fence.join('\n') + '</code></pre>');
  return out.join('\n'); }
const books = [];
for (const f of ORDER) { const p = path.join(CH, f);
  if (!fs.existsSync(p)) { console.log('skip missing: ' + f); continue; }
  const md = fs.readFileSync(p, 'utf8');
  const t = md.match(/^# +(.+)$/m); const title = t ? t[1].trim() : f.replace(/\.md$/, '');
  books.push({ f, title, body: md2html(md) }); }
const css = `*{box-sizing:border-box;}html{scroll-behavior:smooth;}body{margin:0;font-family:"Source Han Serif SC","Noto Serif CJK SC","SimSun",serif;line-height:1.7;color:#222;background:#fff;}
#layout{display:flex;}#toc{position:sticky;top:0;align-self:flex-start;width:240px;height:100vh;overflow-y:auto;padding:16px;border-right:1px solid #ddd;background:#fafafa;}
#toc h1{font-size:1.05em;margin:0 0 12px;}#toc a{display:block;padding:4px 6px;color:#333;text-decoration:none;font-size:0.9em;border-radius:4px;}#toc a:hover{background:#eee;}
#main{flex:1;padding:24px;min-width:0;}section{max-width:46em;margin:0 auto 3em;}h2{margin-top:1.6em;}
table{border-collapse:collapse;width:100%;margin:0.8em 0;}th,td{border:1px solid #999;padding:4px 8px;text-align:left;}
code{background:#eee;padding:1px 4px;font-family:Consolas,monospace;font-size:0.92em;}pre{background:#f4f4f4;padding:8px;overflow-x:auto;}pre code{padding:0;background:none;}
blockquote{border-left:4px solid #aaa;margin:0.8em 0;padding:0.2em 0.8em;color:#444;background:#fafafa;}
@media(max-width:900px){#toc{display:none;}#main{padding:12px;}}`;
const html = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SVS 面试应对手册</title><style>' + css + '</style></head><body><div id="layout"><nav id="toc"><h1>SVS 面试应对手册</h1>' +
  books.map((b, k) => '<a href="#ch' + k + '">' + esc(b.title) + '</a>').join('') + '</nav><main id="main">' +
  books.map((b, k) => '<section id="ch' + k + '">\n' + b.body + '\n</section>').join('\n') + '</main></div></body></html>';
fs.writeFileSync(OUT, html);
console.log('done, index.html bytes=' + Buffer.byteLength(html) + ', sections=' + books.length);
