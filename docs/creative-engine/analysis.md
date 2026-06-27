# StoryPlay Creative Engine Analysis

> Status: Historical Analysis + Planning.
>
> 这份文档是早期对 Creative Engine 和 Creator System 方向的分析。它可以作为背景和产品化思路参考，但里面关于 Creator System、StoryProject、Studio 面板、创作者编辑能力的描述不代表当前已经实现。开发前请先对照 [README.md](README.md) 和 [../agent-system/overview.md](../agent-system/overview.md)。

本文档梳理当前 StoryPlay 创作引擎的真实工作方式，并判断它能否支撑下一阶段更重的创作者工具。

## 结论

项目本身可以继续改造。当前引擎已经具备“一个想法 -> 一幕可玩的视觉故事 -> 分支推进 -> 场内探索”的闭环，核心不是从零重写，而是把现在隐藏在 prompt、session 和代码里的能力产品化。

当前更像“实时故事导演”：用户输入一句世界观和风格，引擎自动完成故事圣经、角色、场景、画面、对白、选项和记忆更新。它还不是“创作者工作台”：创作者暂时不能系统地编辑世界观、角色卡、章节结构、分支图、镜头、变量、测试日志和发布版本。

下一阶段可行方向：

- 保留实时生成引擎作为底层运行时。
- 增加“故事工程”层，把 `storyState`、`characters`、`worldBooks`、`history`、`sceneKey`、prompt segments 显性化。
- 先做轻量创作 MVP：故事设定、角色设定、章节/场景规划、首幕生成、试玩调试。
- 后续再做可视化分支图、变量/条件、素材锁定、版本发布。

## 当前核心模型

### Session

`Session` 是整局故事的运行时容器，前端每次请求下一幕都会把它带回服务端。

它包含：

- `worldSetting`：用户输入的故事设定。
- `styleGuide`：画风描述或自动选择后的画风。
- `history`：已经发生过的场景、玩家访问过的节拍、离开场景时的选择或自由动作。
- `characters`：累计角色注册表，包含视觉描述、音色、肖像引用等。
- `storyState`：故事档案，分为稳定主线和每幕更新的动态记忆。
- `styleReferenceImage`：用户上传的风格参考图。
- `orientation`：横屏或竖屏，决定出图比例。
- `playerName` / `language`：玩家称呼和输出语言。
- `worldBooks`：世界设定注入系统，已有类型但尚未产品化。

### StoryState

`StoryState` 是连续故事的主线记忆。

稳定部分：

- `logline`：一句话主线。
- `genreTags`：题材和基调。
- `protagonist`：第二人称主角设定。
- `castNotes`：核心配角设定。

动态部分：

- `synopsis`：滚动剧情梗概。
- `relationships`：人物关系和情绪温度。
- `openThreads`：未收悬念。
- `nextHook`：下一幕方向。

目前这些由 Writer 在开局和每幕末尾自动生成，创作者无法直接编辑。这里是后续创作工具最值得产品化的资产之一。

### Scene 与 Beat

一幕 `Scene` 是一个可播放单位：

- `scenePrompt`：分镜导演给画师的英文画面提示。
- `sceneKey`：场景空间标识，用于判断是否沿用同一地点和前景图参考。
- `imageUrl` / `imageUuid`：本幕背景图。
- `entryBeatId`：进入本幕的第一个节拍。
- `beats`：被播放器逐步呈现的叙事节拍。

一个 `Beat` 可能是：

- 旁白。
- 玩家内心独白，speaker 会归一为“你”，不配音。
- NPC 对白，带 speaker、line、lineDelivery。
- 一个选择节点，通常在场景最后提供 2-3 个 `change-scene` 出口。

当前系统的可玩性主要来自“场景级分支 + 场内临时互动”，不是传统 RPG 那种完整变量状态机。

## 从首页到第一幕

### 1. 首页创建

首页收集：

- 故事想法。
- 主角性别倾向。
- 画风。
- 情节风格。
- 节奏。

这些会组装成 `worldSetting` 和 `styleGuide`，写入 `sessionStorage.storyplay:custom`，然后跳转到 `/play?custom=1`。

精选卡片则不一定实时生成。它会优先读取 `public/home/firstact.../*.json` 里的预生成首幕，用来降低首页进入延迟。

### 2. Play 页启动

`/play` 支持几种入口：

- `?custom=1`：读取首页输入，调用 `/api/start` 实时生成。
- `?preset=<id>`：用内置 preset 调用 `/api/start`。
- `?card=<id>`：读取预生成首幕 JSON。
- `?share=1`：读取分享包并本地回放。
- `?storyId=<id>`：读取本地保存的故事。

自定义和预设路径会进入真正的创作引擎。

### 3. /api/start

`/api/start` 做基础校验、鉴权、模型配置加载和可选 SSE 流式输出，然后调用 `startSession`。

`startSession` 会创建新的 `Session`。如果 `styleGuide` 是 `auto`，会先调用 `styleSelector` 根据剧情选择画风；然后进入 `directScene` 生成第一幕。

## directScene：一幕如何生成

`directScene` 是当前创作引擎的核心。它把一幕拆成多智能体流水线，但关键优化是 Writer 只调用一次，并用标签流分段。

### Step 1. Writer 流式输出

Writer 必须按顺序输出：

- `<plan>`：JSON，给下游系统看的导演规划。
- `<story>`：连续散文正文。
- `<choices>`：JSON，场景出口选项。

`<plan>` 一结束，系统就立刻截获它，不等正文写完。

`<plan>` 包含：

- `sceneSummary`：给分镜和画师看的本幕概要。
- `sceneKey`：同一物理空间复用的 slug。
- `entryBeatId`：入口节拍。
- `cast`：本幕出场 NPC。
- `entryActiveCharacters`：开场画面里出现的人和姿态。
- `entrySpeaker`：开场主导者。
- `characterIntents`：角色本幕情绪、动机、说话基调。
- 开局时还会生成 `storyBible`。

### Step 2. 并行生成视觉资产

拿到 `<plan>` 后，系统并行做三件事：

- `CharacterDesigner`：为新角色生成视觉卡、音色描述、可选音色 ID。
- `Cinematographer`：把场景概要转成英文构图提示，不负责角色外貌。
- Writer 继续输出 `<story>` 和 `<choices>`。

这样能把文本创作和出图准备重叠起来，降低等待。

### Step 3. 角色肖像、配音与主场景图

系统先生成开场画面需要的角色肖像，再调用 `Painter` 生成本幕背景图。

`Painter` 的参考图优先级：

1. 用户上传的风格参考图。
2. 同 `sceneKey` 的上一幕场景图。
3. 开场说话角色肖像。
4. 其他开场角色肖像。

这套机制用于维持画风、空间和角色连续性。

### Step 4. 散文拆成 Beat

Writer 的 `<story>` 不是 JSON，而是连续散文。`proseSplitter` 会按空行拆段，并识别：

- 普通段落 -> 旁白 beat。
- `<i>...</i>` -> 玩家内心独白 beat。
- `角色名：「台词」` -> NPC 对白 beat。
- `<memory>{...}</memory>` -> 提取为 `storyState` 动态更新，不展示给玩家。

系统会修复 beat id、断链、重复 id、无出口等问题，保证场景可播放、可退出。

### Step 5. 组装结果

最终返回：

- `scene`：场景、节拍、入口、图片、构图 prompt。
- `imageUrl`：本幕背景图。
- `characters`：更新后的角色注册表。
- `storyState`：更新后的故事记忆。

前端把它写回 `Session`，后续场景继续带着这份状态请求 `/api/scene`。

## 玩家如何推进故事

### 选择分支

玩家点击选项时，前端会把当前场景的 visited beats 和 exit 写入 session，然后调用 `/api/scene`。

`exit` 会告诉 Writer：

- 玩家选了哪个 label。
- 下一幕命题 `nextSceneSeed` 是什么。

Writer 必须从上一刻情绪和这个转场命题无缝续写。

### 自由输入

玩家输入一段自由动作后，系统先调用 `classifyFreeform`：

- `insert-beat`：只插入一个临时 beat，不换图、不换场景。
- `change-scene`：把自由动作作为 exit，生成新场景。

这让玩家可以在当前画面里探索，也可以用自己的语言推进剧情。

### 点击背景

玩家点击背景时，前端会把点击位置标注到图片上，调用 vision 模型理解玩家意图，再分类为：

- 场内探索：插入 beat。
- 场景推进：生成新场景。

这是当前引擎里最接近“图像可交互”的能力，但还没有被包装成创作者可配置的热点系统。

### 预取

播放页会对可能的选择路径做 speculative prefetch。玩家还没点时，系统就可能提前生成下一幕甚至下下幕。这样能改善切场速度，但会增加生成成本。

## 样例故事链路

样例输入：

> 她说这不是第一次和我相遇。

假设首页配置：

- 主角：男性向或不指定。
- 画风：Claude 风格 UI 无关，故事画风可选日系视觉小说或电影感插画。
- 情节：悬疑 / 恋爱 / 轮回。
- 节奏：慢热但开场有钩子。

### A. 首页输入变成 worldSetting

首页会把用户想法和配置压成类似：

```text
故事想法：她说这不是第一次和我相遇。
主角倾向：...
情节风格：悬疑 / 恋爱 / 轮回
叙事节奏：慢热，保留情绪铺垫
```

这不是最终剧情，只是 Writer 的命题。

### B. Writer 开局生成 storyBible

开局没有历史和故事档案，所以 Writer 会在 `<plan>` 里额外生成 `storyBible`。

可能得到：

- `logline`：你在雨夜便利店遇见一个陌生女孩，她却说已经和你重复相遇过很多次；你必须在下一次遗忘前弄清她是谁。
- `genreTags`：都市悬疑 / 轮回恋爱 / 慢热治愈带一点危险。
- `protagonist`：你是一个总觉得生活断片的普通人，最近频繁在醒来后发现口袋里多出陌生票根。
- `castNotes`：林澈、夏栀、便利店店员等。

这一步是“故事脊梁”，后续每幕都会带着它。

### C. 第一幕 plan

Writer 的 `<plan>` 可能选择：

- `sceneKey`: `rainy-convenience-store-night`
- `sceneSummary`: 雨夜便利店，霓虹灯和积水反光，一个女孩隔着货架看着你，说这不是你们第一次见面。
- `cast`: `["夏栀"]`
- `entrySpeaker`: `"夏栀"`
- `entryActiveCharacters`: 夏栀站在冷柜旁，手里攥着一张被雨水浸湿的电影票。
- `characterIntents`: 夏栀紧张、克制，想确认你是否还记得她。

这个 plan 会立刻分发给角色设计、分镜和画师。

### D. 角色与画面

`CharacterDesigner` 会把“夏栀”的叙事意图翻译成：

- 英文视觉卡：发色、眼睛、服装、气质、轮廓识别点。
- 中文音色卡：女性、年龄段、音色、语速、情绪。

`Cinematographer` 会把便利店雨夜转成镜头：

- 中近景。
- 货架和冷柜形成纵深。
- 女孩看向镜头，玩家是第一人称不入画。
- 冷白灯、雨夜反光、悬疑但温柔。

`Painter` 再合并画风、构图、角色视觉卡和参考图，生成第一幕背景。

### E. story 变成节拍

Writer 的正文可能由几段组成：

1. 雨夜便利店的环境旁白。
2. 夏栀出现的动作描写。
3. `<i>我应该不认识她，可她看我的眼神太熟了。</i>`
4. `夏栀：「你果然又忘了。」`
5. 她递来湿掉的电影票。
6. `<memory>{...}</memory>`

系统会把这些拆成 b1、b2、b3...，播放器逐拍展示。NPC 对白会触发音频合成；玩家内心独白不配音。

### F. 选项推动下一幕

`<choices>` 可能生成：

- 追问她我们到底见过几次。
- 接过电影票，查看背面的字。
- 假装不认识她，离开便利店。

每个选项都是 `change-scene`，带一个 `nextSceneSeed`。玩家选“查看电影票”后，下一次 `/api/scene` 会把它作为转场命题，生成新的场景，例如“便利店门口雨棚下，电影票背面显出明天的日期”。

## 对创作者工具的启发

当前引擎已经存在很多“创作资产”，但它们没有 UI：

- 故事圣经：现在由 Writer 自动生成，应该允许创作者查看、编辑、锁定。
- 角色卡：现在由角色设计师自动生成，应该支持手动增删、头像重生、音色重选。
- 世界书：类型已存在，应该做成设定条目和关键词触发。
- 场景列表：现在藏在 `history`，应该做成章节/场景管理。
- 分支：现在是每幕末尾的 choices，应该可视化成故事流图。
- 镜头和画面：现在是 `scenePrompt` 与 `sceneKey`，应该支持查看、重写、锁定空间连续性。
- 测试记录：现在试玩直接改变 session，应该支持创作者测试分支、回滚、固定满意结果。

## 第一版创作者 MVP 建议

不要一开始做完整复杂编辑器。建议先做“生成前可控 + 生成后可修”的轻量工作台。

### 1. 故事工程首页

显示：

- 故事标题。
- 一句话简介。
- 题材标签。
- 当前草稿状态。
- 继续编辑 / 试玩 / 发布。

### 2. 设定面板

对应当前 `worldSetting` + `storyState`：

- 故事概念。
- 主角设定。
- 题材基调。
- 核心悬念。
- 当前梗概。
- 未收伏笔。

### 3. 角色面板

对应当前 `characters`：

- 名字。
- 人设。
- 外观描述。
- 说话风格。
- 与玩家关系。
- 肖像和音色。

### 4. 场景/章节面板

对应 `history`、`sceneKey`、`choices`：

- 场景标题。
- 场景概要。
- 入口节拍。
- 结尾选项。
- 下一幕种子。
- 是否锁定图片和文字。

### 5. 试玩调试

基于现有 `/play`：

- 从指定场景开始试玩。
- 显示当前 StoryState。
- 显示本幕 plan / prompt / choices。
- 允许“重写本幕”“重生图片”“固定结果”。

## 风险与优先级

### 主要风险

- 现在 Session 由前端携带，复杂工程变大后不能长期依赖纯本地状态。
- prompt segments 已经拆分，但缺少创作者级权限和版本控制。
- 预取会增加成本，创作者测试模式需要可关闭或受控。
- 角色一致性依赖参考图和文字卡，仍可能漂移，需要锁定/重生策略。
- storyState 是滚动摘要，长篇创作需要更明确的章节记忆和世界书。

### 优先级

1. 先把创作资产显性化：故事圣经、角色卡、世界书、场景列表。
2. 再做编辑闭环：修改设定后重新生成首幕或下一幕。
3. 再做调试能力：查看 plan、prompt、memory、分支。
4. 最后做复杂能力：分支图、变量、条件、版本发布。

## 下一步开发建议

如果进入项目本身改造，建议先从“创作工程数据层 + 最小创作工作台”开始：

1. 定义 `StoryProject` 数据结构，不直接把运行时 `Session` 当创作工程。
2. 新建 `/studio` 或 `/create` 工作台入口。
3. 做故事设定表单和角色列表，先存 localStorage。
4. 从工作台生成一个可试玩 `Session`，复用现有 `/play`。
5. 在试玩页增加调试抽屉，显示本幕 plan、memory、scenePrompt。

这样能保留当前引擎优势，同时开始把 StoryPlay 从“即玩生成器”升级为“创作者可编辑的互动故事工具”。
