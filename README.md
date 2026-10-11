# Unity 手游客户端开发面试应对手册

基于 SVS 项目（Unity 2022.3 / URP + C# + XLua + FairyGUI + HybridCLR + YooAssets）真实工作整理的面试准备手册。

## 在线阅读

直接打开 [index.html](index.html) —— 单文件 HTML 版，左侧带全书目录。

## 下载

- [EPUB 版（13 章）](docs/SVS面试应对手册.epub) —— 适配 EPUB3 阅读器。

## 内容结构

| 章节 | 主题 |
|------|------|
| 前言 | 使用原则 + 30秒/2分钟自我介绍 |
| 第 1 章 | BI 打点体系与 Adjust 归因 |
| 第 2 章 | 内存泄漏审计与治理 |
| 第 3 章 | 死代码扫描与清理 |
| 第 4 章 | 引导系统（Guide System） |
| 第 5 章 | FPS 战斗表现与 AI |
| 第 6 章 | UI 框架与 FairyGUI |
| 第 7 章 | 渠道 SDK 与登录链路 |
| 第 8 章 | BGM 与音效系统 |
| 第 9 章 | 工程工具链与环境适配 |
| 第 10 章 | 通用 Unity/Lua 题的项目化回答 |
| 第 11 章 | 优化方向汇总（跨模块路线图） |
| 附录 | 18 张 STAR 故事速查卡 |

每章结构：模块背景 → 高频 Q&A → 深水区追问 → 优化方向 → 核心记忆点。

## 重建

```bash
node scripts/build_epub.js   # 生成 EPUB
node scripts/build_html.js   # 生成 index.html
```

源稿在 `chapters/`（Markdown），改完重跑脚本即可。
