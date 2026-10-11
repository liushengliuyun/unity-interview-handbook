# 第 10 章 通用 Unity/Lua 题的项目化回答

> 面试官问通用基础题时，用项目经历把答案"落地"，区分度立刻不同。本章给每类通用题一个"项目化锚点"。

## Q1: GC 优化怎么做过？

- 项目锚点：性能规范——VM.hashset/VM.array 用于大集合、对象池复用+Clear()、循环内禁字符串拼接用 StringBuilder、避免 LINQ/foreach（旧 Unity）。
- 项目化答法：不只背"GC 原理"，而是说"我们项目的性能规范第一条就是……，落地案例是改装车界面防连点+对象池"。
- 补充：Lua 侧 GC 压力靠 LuaProfiler 分场景采样监控（见第 2 章）。

## Q2: 热更原理？HybridCLR 和 XLua 的区别？

- 锚点：本项目 C# 用 HybridCLR、逻辑热更用 XLua。
- 一句话区别：**HybridCLR 是 C# 解释执行方案（补充元数据+解释器），XLua 是 Lua 绑定方案**——前者热更 C# 代码本身，后者热更 Lua 脚本。
- 项目化深挖点：双热更体系的**时序问题**是真实踩过的坑——桥接方法在热更程序集，任何依赖它的调用必须等 LoadDll 完成后（_G.Root.DllEntry 门禁，见第 1 章）。
- 泛化句：热更体系面试的核心不是背原理，是讲"热更时序"这个工程难点。

## Q3: Update 里该做什么/不该做什么？

- 锚点：本项目 ECS/System 架构，System 生命周期由框架驱动，控制器框架缓存，不手动缓存。
- 项目化答法：讲"事件驱动替代轮询"的实际案例——BGM 切换靠事件/终态标记而非每帧查询（第 8 章）。

## Q4: xpcall 保护？

- 锚点：XLua 下 C# 调 Lua 必须有 xpcall 保护，错误回传 C# 侧日志；本项目调试规范"追踪完整调用链再提修复"。
- 泛化句：xpcall 是"错误可观测性"的一部分，不只是防崩。

## Q5: FairyGUI 和 UGUI 的区别？

- 锚点：本项目 FairyGUI + GObjectPool。
- 要点：FairyGUI 编辑器驱动+GObject 池化；合批机制差异（invalidateBatchingEveryFrame 案例，第 6 章）；Prefab 坐标转换用 FairyGUI API（LocalToGlobal/LocalToRoot）而非 Unity API。
- 泛化句：UI 框架选型的面试答案是"讲清失效模式"而不是"讲清优点"。

## Q6: 资源管理怎么做？

- 锚点：YooAssets 引用计数（handle→provider→bundle 释放链）+ Luban 配置表体系（Excel→导出→Configs.base_xxx.Hash[]/INT_GROUP.In(x).Rows 查询）。
- 项目化答法：引用计数失衡的泄漏形态与配对审计（第 2 章）+ 配置表"导出物只读"纪律。

## 深水区追问

1. "你们 GC 优化收益多少？"——如实答：有性能规范与 Profiler 验证流程，无精确收益数字；诚实比编数字安全。
2. "HybridCLR 补充元数据的原理？"——AOT 泛型/反射调用缺失元数据由解释器补齐；答出"易变代码进热更程序集，AOT 侧只留稳定壳"的工程经验。

## 通用答法模板

1. 定义（一句）→ 2. 项目锚点（我们怎么做/踩过什么坑）→ 3. 泛化句（可迁移的方法论）。三段式，30 秒内完成。

## 本章核心记忆点

- 通用题+项目锚点=区分度。
- 双热更体系的时序门禁是最有项目味的深挖点。
- 诚实答"没有精确数字"优于编造。
