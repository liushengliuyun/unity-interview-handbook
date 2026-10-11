'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const DIR = __dirname, CH = path.join(DIR, 'chapters'), OUT = path.join(DIR, 'SVS面试应对手册.epub');
const ORDER = ['ch00_intro.md','ch01_bi_adjust.md','ch02_memory_leak.md','ch03_dead_code.md','ch04_guide.md','ch05_fps.md','ch06_ui.md','ch07_channel_sdk.md','ch08_audio.md','ch09_toolchain.md','ch10_basics.md','ch11_roadmap.md','appendix_star.md'];
const TBL = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = ~0; for (let i = 0; i < b.length; i++) c = TBL[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ ~0) >>> 0; };
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
const xname = b => b.f.replace(/\.md$/, '.xhtml');
const page = (b, k) => '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN"><head><meta charset="utf-8"/><title>' + esc(b.title) + '</title><link rel="stylesheet" type="text/css" href="stylesheet.css"/></head><body><section id="ch' + k + '" epub:type="chapter">\n' + b.body + '\n</section></body></html>';
const nav = '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN"><head><meta charset="utf-8"/><title>目录</title><link rel="stylesheet" type="text/css" href="stylesheet.css"/></head><body><nav epub:type="toc" id="toc"><h1>目录</h1><ol>' +
  books.map((b, k) => '<li><a href="' + xname(b) + '">' + esc(b.title) + '</a></li>').join('') + '</ol></nav></body></html>';
const uuid = crypto.randomUUID();
const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const ncxPts = books.map((b, k) => '<navPoint id="np' + k + '" playOrder="' + (k + 1) + '"><navLabel><text>' + esc(b.title) + '</text></navLabel><content src="' + xname(b) + '"/></navPoint>').join('');
const ncx = '<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="urn:uuid:' + uuid + '"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head><docTitle><text>SVS 面试应对手册</text></docTitle><navMap>' + ncxPts + '</navMap></ncx>';
const manifest = books.map((b, k) => '<item id="c' + k + '" href="' + xname(b) + '" media-type="application/xhtml+xml"/>').join('') +
  '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="stylesheet.css" media-type="text/css"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>';
const opf = '<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
  '<dc:identifier id="bookid">urn:uuid:' + uuid + '</dc:identifier><dc:title>SVS 面试应对手册</dc:title><dc:creator>代亦凡</dc:creator><dc:language>zh-CN</dc:language><meta property="dcterms:modified">' + modified + '</meta></metadata>' +
  '<manifest>' + manifest + '</manifest><spine toc="ncx">' + books.map((b, k) => '<itemref idref="c' + k + '"/>').join('') + '</spine></package>';
const css = 'body{font-family:"Source Han Serif SC","Noto Serif CJK SC","SimSun",serif;line-height:1.7;margin:1em;}h1{margin-top:1.5em;}h2{margin-top:1.2em;}table{border-collapse:collapse;width:100%;margin:0.8em 0;}th,td{border:1px solid #999;padding:4px 8px;}code{background:#eee;padding:1px 4px;font-family:Consolas,monospace;}pre{background:#f4f4f4;padding:8px;overflow-x:auto;}pre code{padding:0;background:none;}blockquote{border-left:4px solid #aaa;margin:0.8em 0;padding:0.2em 0.8em;color:#444;}';
const container = '<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
const entries = [], bufs = []; let off = 0;
const now = new Date(), dt = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), tm = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
function add(name, data, method) { const crc = crc32(data), comp = method === 0 ? data : zlib.deflateRawSync(data, { level: 9 });
  const nb = Buffer.from(name, 'utf8'), h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(method, 8); h.writeUInt16LE(tm, 10); h.writeUInt16LE(dt, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26); h.writeUInt16LE(0, 28);
  bufs.push(h, nb, comp);
  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(method, 10); c.writeUInt16LE(tm, 12); c.writeUInt16LE(dt, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt16LE(0, 30); c.writeUInt16LE(0, 32); c.writeUInt16LE(0, 34); c.writeUInt16LE(0, 36); c.writeUInt32LE(0, 38); c.writeUInt32LE(off, 42);
  entries.push(c, nb); off += 30 + nb.length + comp.length; }
add('mimetype', Buffer.from('application/epub+zip', 'utf8'), 0);
add('META-INF/container.xml', Buffer.from(container, 'utf8'), 8);
add('OEBPS/content.opf', Buffer.from(opf, 'utf8'), 8);
add('OEBPS/nav.xhtml', Buffer.from(nav, 'utf8'), 8);
add('OEBPS/toc.ncx', Buffer.from(ncx, 'utf8'), 8);
add('OEBPS/stylesheet.css', Buffer.from(css, 'utf8'), 8);
books.forEach((b, k) => { add('OEBPS/' + xname(b), Buffer.from(page(b, k), 'utf8'), 8); console.log('built: ' + b.f + ' (' + b.title + ')'); });
const e = Buffer.alloc(22);
const nFiles = books.length + 6;
e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(0, 4); e.writeUInt16LE(0, 6); e.writeUInt16LE(nFiles, 8); e.writeUInt16LE(nFiles, 10); e.writeUInt32LE(entries.reduce((s, b) => s + b.length, 0), 12); e.writeUInt32LE(off, 16); e.writeUInt16LE(0, 20);
fs.writeFileSync(OUT, Buffer.concat(bufs.concat(entries, [e])));
console.log('done, epub bytes=' + fs.statSync(OUT).size + ', chapters=' + books.length);
