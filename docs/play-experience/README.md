# Play Experience

Status: Plan / Current Map.

故事游戏界面负责玩家进入故事后的核心体验。它消费 runtime session，不直接编辑创作者工程文件。

## 范围

- `/play` 页面。
- 场景图、叙事文本、角色台词、选择项。
- 自由输入、视觉点击、插入剧情。
- 对话历史、存档、分享、gallery。
- TTS、音频、字幕和节奏控制。

## 当前主要代码

- `app/[locale]/play/page.tsx`
- `components/PlayCanvas.tsx`
- `components/DialogueHistoryModal.tsx`
- `app/[locale]/gallery/page.tsx`
- `lib/clientStoryPersistence.ts`
- `lib/storyShare.ts`
- `app/api/story-pack/route.ts`
- `app/api/story-unpack/route.ts`
- `app/api/gallery-pack/route.ts`
- `app/api/gallery-unpack/route.ts`
- `app/api/scene/route.ts`
- `app/api/insert-beat/route.ts`
- `app/api/vision/route.ts`
- `app/api/beat-audio/route.ts`

## 输入来源

Play runtime 未来应支持三种入口：

- 从首页 SKU 开始。
- 从 `/studio` 的 StoryProject 发起 playtest。
- 从分享包或 gallery 恢复。

## 短期开发重点

- 稳定最小闭环：开始故事、展示画面、做选择、续写、保存、分享。
- 明确 session 状态结构，减少 UI 组件直接拼业务状态。
- 把视觉点击、自由输入、插入剧情统一成 runtime action。
- 后续再扩展地图、任务、角色关系、物品、成就等重玩法 UI。

## 后续文档建议

- `runtime-session.md`：Play runtime 的状态结构和生命周期。
- `interaction-actions.md`：选择、自由输入、视觉点击、插入剧情的统一 action 模型。
- `play-ui-ia.md`：游戏界面信息架构和组件分区。
