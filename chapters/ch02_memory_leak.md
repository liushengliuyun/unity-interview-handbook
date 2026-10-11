# 第 2 章 内存泄漏审计与治理

## 模块背景（开场一句话）

> 我做过两阶段全工程内存泄漏审计：Phase 1 只审 NeoFPS 插件（10 处修复），Phase 2 扩展到 C# 业务层 + Lua 层（19 个文件，11 处确认泄漏），核心发现是 Unity Material 克隆泄漏、静态集合无清理、tween 持有已销毁对象引用。这项工作的价值不在修了多少 bug，而在沉淀了一套可复用的审计方法论。

## 高频问题与回答要点

### Q1: Unity 有哪些常见内存泄漏类型？你怎么审出来的？

**回答框架：先分类，再"每类一个亲手修的案例"。**

**类型 1：Material/材质克隆泄漏（最高频）**

- 机制：`renderer.material` / `renderer.materials` getter **每次访问都实例化新 Material 实例**（不是缓存返回），Unity 文档明确说会克隆；`.material = X` setter 同样每次实例化。
- 审计手段：grep 模式签名（区分 getter/setter）扫全工程，候选点人工确认。
- 亲手修的案例：
  - `GameObjectControlPlayableAsset`（Timeline 资产）：foreach 内 5 段连续 `.material` getter → 缓存到局部变量统一操作，`DOFloat` 原本跑在孤儿副本上导致动画失效。
  - `FpsSingleGame` 假死事件：`.materials` 数组 getter 拷贝整组副本，`SetShaderPassEnabled` 作用在副本上——**原描边禁用功能一直无效**。改 `sharedMaterials` 顺带修复功能 bug。**"泄漏审计顺带挖出功能 bug"是本章面试亮点句**。
  - `MachineGunPlacementDetection`：Update 每帧 `.material = X` setter 持续实例化，旧实例全泄漏 → Awake 缓存 Renderer + sharedMaterial。
  - 瞄准镜（RenderTextureScopeSRP）：OnDestroy 只销毁 RenderTexture，漏 Destroy 材质实例，瞄准镜高频路径一开一关漏一个。
- **深度补充**：为什么引擎要设计成 getter 克隆？Material 是资源级对象，直接改资源会影响所有引用者；克隆是"每 renderer 独立改色"的便利性换来隐性成本——**改实例必须配对销毁，引擎不帮你回收**。

**类型 2：静态集合累积**

- 机制：static Dictionary/List 只增不减，跨局跨场景永不回收。
- 案例：`BuffUtils.DicBuffCreated` 全代码库无 Clear，跨局累积还**污染抽奖权重计算**（不只是内存问题）→ `FpsWorld.OnDestroy` 加 Clear。**"内存问题引发正确性问题"是升级版回答**。
- 深度补充：Material/Texture/Mesh 是 native 对象，C# 包装壳被 GC 但 native 侧不释放，**托管 GC 管不了 native 侧，必须显式 Destroy**。

**类型 3：tween/委托持有已销毁对象**

- DOTween：对象销毁后 tween 仍持有引用。修复方式：缓存克隆材质 + OnUpdate 检测目标销毁后 Kill + Destroy（本项目 DOTween 版本无 SetLink，且持有方是纯 C# 类需完整限定调用）。
- 委托链泄漏：事件订阅不退订（UI 层由框架自动清理，纯 C# 层需手动配对——见第 6 章）。

**类型 4：YooAsset 资源句柄泄漏**

- 引用计数模型：handle（业务侧）→ provider（调度层）→ bundle（包裹层）逐层计数，业务 Load 创建 handle、Release 减计数，减到 0 才触发释放链；任何一环失衡该资源永不释放。
- 泄漏形态：Load 不 Release、重复 Load 不复用、场景卸载遗漏场景专属 handle。
- 兜底对比：强制卸载（ForceUnloadAllAssets）能兜底但不安全——会引发"使用中资源被卸载"（表现层粉块/白块）。**正确姿势是配对审计而不是依赖强制卸载**。

**类型 5：Lua 层泄漏**

- 工具：LuaProfiler 观测 Lua.GC 曲线（分场景采样，对比进出场前后差值）。
- 模式：闭包捕获、事件订阅不退订、全局表污染。
- 修复案例：AnimationSystem tween 持有已销毁 obj，Lua 侧 3 处事件订阅不退订。
- 亮点补充：审计期间 LuaProfiler 窗口数据冻结（HookLuaSetup AddComponent 返回 null），做了窗口侧兜底——**审计工具自身可靠性也是审计工作的一部分**。

## Q2: 审计方法论——"怎么系统地找泄漏"？（本章面试价值最高）

1. **范围切割**：按程序集切（插件 → C# 业务 → Lua），每阶段出审计文档（范围/重点/清单/修复提交/变更量），同步团队，不闷头修。
2. **模式清单驱动**：五类泄漏模式各有代码模式签名，grep 签名扫全工程产生候选点。
3. **人工确认三问**（对每个候选点）：① 有没有配对清理？② 生命周期谁长谁短？③ 修复会否改变表现（sharedMaterial 影响所有引用者，需逐处确认是"误用克隆"还是"本该独立变体"）。
4. **风险分级**：HIGH（确认泄漏）/MED（模式匹配未证实）/LOW（demo 代码低风险），HIGH 优先。
5. **验证**：静态扫描解决"找全"，运行时 Profiler 曲线解决"证实"，**二者不可互替**。
6. **存档纪律**：审计报告独立存档，修复独立提交，不混业务改动。

### Q3: sharedMaterial vs material 完整答案（口诀背熟）

| 维度 | `.material` getter | `.sharedMaterial(s)` |
|------|--------------------|----------------------|
| 返回 | 每次访问实例化新实例 | 资源本身 |
| 影响面 | 只影响该 renderer（实例） | 影响所有引用该材质的 renderer |
| 内存 | 每次克隆 | 0 克隆 |
| 场景 | 真需要 per-renderer 变体时，**配对 Destroy** | 只改共享资源 |

**口诀：默认 shared，独立变体才 material，用了必须配对销毁。**

### Q4: 静态集合泄漏怎么防？

- 机制：static Dictionary/List 只增不减，跨场景累积。
- 案例：BuffUtils.DicBuffCreated 只增不减，跨局累积污染抽奖权重 → OnDestroy 加 Clear。
- 深度：native 对象 C# 包装壳被 GC 但 native 侧不释放，必须显式 Destroy。
- 预防：静态集合必须写 Clear 时机注释（谁负责清、什么时候清）。
- 反直觉点：**disable domain reload 时 static 不自动清空——编辑器迭代速度优化反而引入泄漏源**（面试区分度题）。

### Q5: YooAsset 引用计数怎么工作？泄漏什么样？

- 模型：handle → provider → bundle 逐层引用计数，减到 0 才释放。
- 泄漏形态：Load 不 Release、重复 Load 不复用、场景卸载遗漏。
- 兜底对比：强制卸载能兜底但不安全（粉块/白块），正确姿势是配对审计而非依赖强制卸载。
- 项目事实：有整份 YooAsset handle 泄漏审计文档（按 provider 维度盘点不配对点）。

### Q6: Lua 层泄漏怎么找？

- 工具：LuaProfiler 分场景采样 Lua.GC 曲线。
- 模式：闭包捕获、订阅不退订、全局表污染。
- 亮点句：审计工具自身可靠性也是审计工作的一部分（LuaProfiler 兜底修复）。

## 深水区追问

### 追问 1: 30 处泄漏靠扫描还是 Profiler？

静态扫描（模式清单）+ 运行时验证（Profiler 曲线）双轮。静态解决"找全"，运行时解决"证实"。只静态扫会有假阳/假阴（如 foreach 内 .material getter，静态扫出候选，Profiler 证实泄漏速率）。

### 追问 2: 修复会改变表现吗？

会——这正是人工确认三问之三。逐处判断"本该独立变体"（保留 material + 配对 Destroy）还是"误用克隆"（改 shared）。例如瞄准镜材质本需要 per-renderer 表现，保留 material + 配对 Destroy 而非一刀切改 shared。

### 追问 3: 这类问题能不能自动化到 CI？

两个层次：
1. **模式扫描进 CI**：五类模式签名做成 CI 规则，新增代码命中 → PR 标记 review 关注点（不 block）。
2. **运行时守门**：真机常态化内存基线（分机型分场景 PSS/mono heap 双基线），超基线报警。

### 追问 4: 为什么 Unity 的 material getter 要设计成克隆？

引擎权衡：Material 是资源级对象，直接改会影响所有引用者。克隆是"per-renderer 独立变体"的便利性换取隐性成本，成本转嫁给开发者配对销毁。**理解设计动机，而不是死记 API 差异**——这是面试深度信号。

## 优化方向（本模块）

1. **CI 门禁**：模式签名规则集进 CI，新代码命中泄漏模式 → PR 自动标注。
2. **内存基线看板**：分机型分场景内存基线自动比对，超基线报警（替代人肉 Profiler 对比）。
3. **泄漏规则文档化**：五类模式写进 code review checklist。
4. **YooAsset handle 配对检查工具**：编辑器内可视化 provider 引用计数，Load/Release 不配对实时警告。
5. **Lua 泄漏工具化**：LuaProfiler 自动采样脚本（进出场自动差值对比，替代人肉采样）。

## 本章核心记忆点

- 五类泄漏模式：Material 克隆 / static 累积 / tween-委托持有 / YooAsset handle / Lua 闭包订阅。
- 口诀：默认 shared，独立变体才 material，用了必须配对销毁。
- 方法论：静态扫找全 + 运行时证实，人工确认三问，风险分级，报告存档。
- 亮点句："内存问题引发正确性问题"（BuffUtils）；"泄漏审计顺带挖出功能 bug"（FpsSingleGame）；"审计工具自身可靠也是审计工作"（LuaProfiler）。
