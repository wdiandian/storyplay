# StoryPlay 账号系统 Roadmap

Status: In Progress.

账号系统是 StoryPlay 的独立基建板块。它不只是加登录按钮，而是让创作后台、模型调用、项目归属、试玩记录、发布内容和后续计费都能落到明确的用户身份上。

## 产品目标

账号 MVP 首先服务创作者闭环：

```text
登录 -> 创建 StoryProject -> 编辑 -> 生成素材 / 使用创作助手 -> 试玩 -> 发布 SKU
```

这条链路里的关键问题：

- 当前用户是谁。
- 这个故事工程属于谁。
- 当前用户是否有权限编辑、试玩、生成素材、发布。
- 这次模型消耗应该记到谁名下。
- 发布后的内容和试玩沉淀如何继续归属。

## 当前进度

### 已落地

- 新增基础文档入口：`docs/infrastructure/README.md`。
- `StoryProject` 增加 `ownerUserId`。
- 新建 StoryProject 时由服务端写入当前登录用户，不信任前端传入 owner。
- 新增 `lib/storyProject/auth.ts`，统一处理 Studio 用户、项目 owner 校验、项目列表过滤。
- Studio 项目列表、详情、保存、删除、试玩、试玩回收、固定剧情包、发布、素材上传、素材生成、创作助手均接入 owner 校验。
- 创作助手和 Studio 素材生成的官方模型用量改为归因到当前登录用户。
- Server Component 侧的 Studio 项目列表和项目详情不再直接暴露全局项目。
- 官方预设导入会创建属于当前用户的可编辑副本。
- SKU 草稿接口先做登录门槛，后续仍需改成真正的 user-scoped 草稿。
- Studio 项目列表、新建页、详情页、SKU 管理页已接入未登录门禁。
- Studio 客户端请求对 401 / 403 给出明确提示，避免静默失败。
- 恢复玩家故事服务端存档基础版，当前使用 Docker volume 内的文件存储：`.storyplay/stories/saved-stories.json`。
- `/play` 增加“保存故事”入口，优先保存到账号，失败时降级到本地。
- `/stories` 恢复为“我的故事”入口，可读取服务端存档并合并本地兜底存档。
- 新增 `/account` 最小账号中心，聚合当前账号、创作项目、故事存档和额度摘要。
- 右上角用户菜单新增账号中心、创作后台、我的故事入口，并修复退出登录文案。

### 仍未完成

- 历史无 `ownerUserId` 的项目当前按 legacy/system 处理，不自动归属给任何用户。
- StoryProject / SKU 草稿仍使用现有 store provider，还没有迁移到账号维度数据库。
- 服务端故事存档已恢复基础版，但还没有迁移到数据库。
- 最小账号中心已完成基础版，但还没有个人资料编辑和更完整的用量明细。
- 已发布 SKU 的 owner 元数据还需要进一步补齐。

## 当前实现原则

### Auth 开关

账号保护依赖 Supabase 环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

本地未配置 Supabase 时，`requireUser()` 会走匿名兼容路径，因此本地开发仍能继续使用 Studio。

### 项目归属

```ts
type StoryProject = {
  id: string;
  ownerUserId?: string;
  // existing fields...
};
```

规则：

- 登录后新建项目必须写入 `ownerUserId`。
- 项目列表只返回当前用户自己的项目。
- 修改、删除、发布、试玩、生成素材等操作必须校验 owner。
- 旧项目如果没有 `ownerUserId`，先视为 legacy/system 项目，不直接归属给任何用户。
- 用户要编辑官方预设或 legacy 项目时，创建一个属于自己的可编辑副本。

### SKU 归属

已发布 SKU 后续需要补齐：

```ts
type PublishedStorySku = {
  id: string;
  sourceProjectId?: string;
  ownerUserId?: string;
  publishedByUserId?: string;
  // existing fields...
};
```

规则：

- 所有人都可以游玩公开发布的 SKU。
- 只有 owner 可以更新、下架、重新发布自己的 SKU。
- 官方预设 SKU 保持 system-owned。

## 模块边界

账号系统负责：

- 登录态和服务端 auth guard。
- 用户身份规范化。
- `ownerUserId` 等所有权字段。
- API 权限校验。
- 用户维度的项目列表。
- 用户维度的故事保存和试玩记录。
- 用户维度的模型用量、额度和点数归因。
- 匿名数据、旧项目、官方预设的迁移或复制规则。

账号系统不负责：

- StoryProject 编辑器的具体 UI。
- 首页 SKU 卡片和分类体验。
- `/play` 的沉浸式交互设计。
- 剧情生成 prompt 质量。
- 生图供应商选择，除非涉及用户归因和额度。
- 完整商业化定价设计。

## Roadmap

### Phase 0: 文档和盘点

目标：账号系统成为独立可追踪的基建板块。

状态：已完成。

完成内容：

- 建立账号系统文档。
- 盘点现有 Supabase Auth 代码。
- 盘点 anonymous billing 和 localStorage 持久化路径。
- 标记需要加鉴权的 Studio API。

### Phase 1: Studio 项目归属 MVP

目标：让创作者项目真正属于账号。

状态：已完成主体。

完成内容：

- `StoryProject` 增加 `ownerUserId`。
- 新建项目写入当前登录用户。
- 增加 Studio auth helper。
- 保护 Studio 项目 API。
- 项目列表按当前用户过滤。
- 官方预设 / legacy 项目通过“创建可编辑副本”进入用户空间。

验收标准：

- 登录创作者只能看到自己的项目。
- 登录创作者不能编辑别人的项目。
- 新项目一定有 owner。

### Phase 2: Studio 模型用量归因

目标：创作者侧模型消耗真正记到账号名下。

状态：已完成主体，后续随新模型能力持续补齐。

完成内容：

- 创作助手不再使用 anonymous billing。
- 创作者素材生成不再使用 anonymous billing。
- Studio 关键生成链路接入当前用户。

后续补齐：

- 人物参考图生成。
- 封面图生成。
- 首图 / 场景图生成。
- Studio 试玩生成的更细粒度用量统计。
- BYOK 和官方额度的展示区分。

### Phase 3: Studio 登录体验

目标：让账号要求在产品体验上说得通。

状态：已完成基础版。

完成内容：

- 未登录进入 Studio 项目列表、新建页、项目详情、SKU 管理页时展示登录门禁。
- 登录后刷新当前页面，继续原来的操作路径。
- 创建、保存、发布、导入等请求遇到 401 / 403 时显示明确提示。

后续优化：

- 登录后恢复更细粒度的 pending action，例如“刚才点了发布”。
- 已登录但没有项目时，增加更强的“创建新项目 / 从预设创建副本”引导。
- 无权限访问项目时从 `notFound()` 升级为更明确的无权限页面。

### Phase 4: 服务端故事保存

目标：把玩家游玩记录从本地保存升级到账号保存。

状态：基础版已完成。

完成内容：

- 恢复 `app/api/stories/save/route.ts`，并加 auth。
- 恢复 `app/api/stories/list/route.ts`，并按用户过滤。
- 恢复 `app/api/stories/[id]/route.ts`，并加 owner 校验。
- 增加 `lib/storyStore.ts`，在腾讯云 Docker 部署下写入 `.storyplay/stories/saved-stories.json`。
- 更新 `lib/clientStoryPersistence.ts`：
  - 登录用户优先保存到服务端。
  - 游客继续保存到 localStorage。
  - 服务端失败时降级本地保存。
  - 读取故事列表时合并服务端存档和本地兜底存档。
- 更新 `/play?storyId=`，服务端优先读取，找不到时回退本地。
- 恢复 `/stories` 页面作为“我的故事”入口。

后续补齐：

- 登录后导入本地旧存档。
- 存档自动保存策略。
- 迁移到 Supabase Postgres 或其他正式数据库。

验收标准：

- 登录用户可以跨设备读取自己的故事存档。
- 用户不能读取或删除别人的存档。
- 游客轻量体验不被打断。

### Phase 5: 最小账号中心

目标：提供一个轻量但有用的账号入口，不做重后台。

状态：基础版已完成。

完成内容：

- 增加 `/account` 账号页。
- 扩展右上角账号菜单。
- 展示当前登录邮箱 / provider。
- 展示我的创作项目。
- 展示我的故事存档。
- 展示额度 / 用量摘要。
- 支持退出登录。

后续补齐：

- 更详细的模型用量明细。
- 本地游客存档导入账号。
- 个人资料展示优化。

验收标准：

- 用户知道自己登录的是哪个账号。
- 用户能找回自己的项目和故事。

### Phase 6: 发布、分享、固定剧情包归属

目标：让公开内容和分享内容可控。

任务：

- 已发布 SKU 增加 owner 元数据。
- 发布、更新、下架时校验 owner。
- 固定剧情包增加 owner 和来源 playtest。
- 分享可见性分级：
  - private
  - unlisted link
  - public published SKU
- 公共分享包只读，不允许外部用户编辑源项目。

验收标准：

- 创作者发布内容有明确归属。
- 玩家可以游玩公开内容，但不能修改源项目。

### Phase 7: 点数、套餐和风控

目标：为后续商业化和成本控制做准备。

任务：

- 登录后将 guest quota 迁移或折算为账号 quota。
- 建立用户点数发放和消耗记录。
- 增加账号、IP、设备维度的滥用控制。
- 定义免费创作者额度。
- 预留支付集成，但不在 MVP 阶段实现。

验收标准：

- 模型成本可以按用户追踪。
- 免费使用有上限。
- 后续付费/点数体系有干净的数据基础。

## 推荐执行顺序

已完成：

```text
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 基础版 -> Phase 4 基础版 -> Phase 5 基础版
```

下一步：

```text
Phase 6 -> Phase 7
```

原因：

- 发布、分享、固定剧情包已经依赖稳定的账号归属边界。
- 点数、套餐和风控需要先有更明确的公开内容归属和用量入口。

更后面：

```text
数据库迁移 -> 个人资料 -> 团队协作
```

原因：

- 当前腾讯云 Docker 单机可以用 file provider 跑通 MVP，但长期多用户需要数据库迁移。

## MVP 范围

账号 MVP 必须包含：

- 生产环境 Supabase 登录可用。
- Studio 要求登录。
- StoryProject 有 `ownerUserId`。
- Studio API 校验 owner。
- 创作助手和素材生成使用登录用户额度。
- 用户能看到自己的项目列表。

账号 MVP 暂不包含：

- 完整个人资料编辑。
- 社交关系。
- 团队协作。
- 复杂角色权限。
- 支付套餐。
- 公开创作者主页。

## 待决策问题

### 存储 provider

短期：

- 腾讯云单机 Docker 可以继续 file provider，但必须确保 `.storyplay` 挂载持久化 volume。

更合理的生产方向：

- Supabase Postgres。账号已经使用 Supabase Auth，用户数据、项目归属、故事存档放在 Supabase Postgres 会更顺。

Phase 4 前需要决定：

- 故事存档是否进入 Supabase Postgres。
- StoryProject 是否继续短期 file provider，还是和故事存档一起迁移。

### 旧数据

推荐：

- 不直接“认领”旧项目。
- 统一复制为当前用户项目。
- 官方预设导入永远创建自己的可编辑副本。

### 游客模式

推荐：

- 首页保留很轻的游客体验，用于转化。
- Studio、创作助手、生图等昂贵工作流必须登录。

## 相关文档

- [Studio 存储 Roadmap](studio-storage-roadmap.md)
- [模型基建](../platform/model-infrastructure.md)
- [创作助手](../creator-workspace/creator-story-assistant.md)
- [创作者 MVP 发布闭环](../creator-workspace/creator-mvp-publish-loop.md)
- [项目模块划分](../project-modules.md)

## 2026-07-03 Phase 6 落地记录

本轮完成账号基建 Phase 6 的最小闭环：

- Creator 发布出来的 SKU 会写入 `sourceProjectId`、`ownerUserId`、`publishedByUserId`、`publishedAt`。
- Studio 删除已发布 SKU 时优先校验 SKU 自身的 `ownerUserId`，旧数据继续回退到源 StoryProject owner 校验。
- 固定剧情包发布到 SKU 时会带上 `sourceProjectId`、`ownerUserId`、`publishedAt`，后续可追踪它来自哪个项目和 playtest。
- `.storyplay` 分享包新增可选 `source` 元数据，记录来源是 `playtest`、`published` 还是 `direct`，以及对应的 project / SKU / playtest id。
- 分享包仍然是只读回放文件，不授予外部用户编辑源项目的权限。

后移项：

- `private / unlisted / public` 的完整可见性分级。
- 发布 SKU 的数据库化迁移和历史数据 owner 回填。
- 团队协作、复杂权限和公开创作者主页。

## 2026-07-03 Phase 7 落地记录

本轮完成点数 / 额度 / 模型用量的最小基建：

- 新增 `lib/billingStore.ts`，统一封装模型用量记录、积分 ledger、每日消耗统计和账单摘要。
- 存储策略改为数据库优先；没有 D1 / 数据库时自动落到 `.storyplay/billing/usage-ledger.json`。
- 腾讯云 Docker 单机部署下，官方模型调用现在也能真实记录消耗，并按 `OFFICIAL_DAILY_CREDIT_LIMIT` 做每日额度检查。
- `/api/billing/summary` 和 `/account` 统一读取同一套 billing store，不再因为没有 D1 就永远显示默认满额度。
- `modelUsage` 写入从直接依赖 D1 改为调用 billing store，后续迁移 Supabase / Postgres 时只需要替换存储层。

当前仍是额度 MVP，不包含：

- 充值、支付、套餐和发票。
- 精确 token / 图片成本计价。
- 管理员手动发点数后台。
- 多服务器并发写入的强一致保障；单机 Docker volume 可以跑 MVP。
