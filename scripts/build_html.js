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
const css = `* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
       line-height: 1.75; color: #24292f; background: #fff; }
.layout { display: flex; max-width: 1280px; margin: 0 auto; }
nav.toc { width: 300px; flex: none; position: sticky; top: 0;
          max-height: 100vh; overflow-y: auto; padding: 24px 16px;
          border-right: 1px solid #d0d7de; background: #f6f8fa; }
nav.toc h2 { font-size: 1em; margin: 0 0 12px; color: #57606a; }
nav.toc a { display: block; padding: 5px 10px; border-radius: 6px;
            color: #24292f; text-decoration: none; font-size: 0.9em; }
nav.toc a:hover { background: #eaeef2; }
nav.toc .extra { margin-top: 8px; border-top: 1px solid #d0d7de; padding-top: 8px; }
main { flex: 1; min-width: 0; padding: 24px 40px 80px; max-width: 860px; }
h1 { font-size: 1.55em; border-bottom: 2px solid #d0d7de; padding-bottom: 8px; }
h2 { font-size: 1.25em; border-bottom: 1px solid #eaeef2; padding-bottom: 6px; }
pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px;
      padding: 12px; overflow-x: auto; font-size: 0.88em; line-height: 1.5; }
code { font-family: Consolas, "Cascadia Mono", monospace; font-size: 0.9em;
       background: #f6f8fa; padding: 1px 5px; border-radius: 4px; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.92em; }
th, td { border: 1px solid #d0d7de; padding: 6px 10px; text-align: left; }
th { background: #f6f8fa; }
blockquote { color: #57606a; border-left: 4px solid #d0d7de;
             margin-left: 0; padding-left: 12px; }
header.book { border-bottom: 3px double #d0d7de; margin-bottom: 24px; padding-bottom: 16px; }
header.book h1 { border: none; margin: 0; }
header.book .meta { color: #57606a; }
@media (max-width: 900px) {
  nav.toc { position: static; width: auto; border-right: none;
            border-bottom: 1px solid #d0d7de; max-height: none; }
  .layout { flex-direction: column; }
}`;
const html = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>SVS 面试应对手册</title><style>' + css + '</style></head><body><div class="layout"><nav class="toc"><h2>目录</h2>' +
  books.map((b, k) => '<a href="#ch' + k + '">' + esc(b.title) + '</a>').join('') +
  '<a class="extra" href="docs/SVS%E9%9D%A2%E8%AF%95%E5%BA%94%E5%AF%B9%E6%89%8B%E5%86%8C.epub">📖 EPUB 版下载 →</a>' +
  '</nav><main><header class="book"><h1>SVS 面试应对手册</h1><p class="meta">代亦凡 · 编 · 2026 年 10 月 · <a href="https://github.com/liushengliuyun/unity-interview-handbook">GitHub 仓库</a> · <a href="docs/SVS%E9%9D%A2%E8%AF%95%E5%BA%94%E5%AF%B9%E6%89%8B%E5%86%8C.epub">EPUB 下载</a></p></header>' +
  books.map((b, k) => '<section id="ch' + k + '">\n' + b.body + '\n</section>').join('\n') + '</main></div></body></html>';
fs.writeFileSync(OUT, html);
console.log('done, index.html bytes=' + Buffer.byteLength(html) + ', sections=' + books.length);
