# 运行环境配置

状态：当前线上配置基线。

本文记录 StoryPlay 当前推荐的运行环境变量。目标是先跑通官方模式，再逐步开启模型 profile 分流、额度控制、账号和监控。

## 配置原则

- 线上默认走官方模式，用户不需要配置 API Key。
- BYOK 是用户侧高级模式，用户的 Key 保存在浏览器本地，不需要在线上环境变量里为每个用户配置。
- 服务端只需要配置平台自己的官方模型 Key。
- 不设置 `MODEL_PROFILE_*` 时，所有 profile 都会回退到基础 `TEXT_*`、`IMAGE_*`、`VISION_*`、`TTS_*`。
- `*_PROVIDER` 只表示协议类型，不表示供应商名字。文本和视觉通常使用 `openai_compatible`。

## 最小必填

官方模式要跑通文本和图片，至少需要：

```env
TEXT_BASE_URL=
TEXT_API_KEY=
TEXT_MODEL=

IMAGE_BASE_URL=
IMAGE_API_KEY=
IMAGE_MODEL=
```

推荐同时显式配置：

```env
TEXT_PROVIDER=openai_compatible
IMAGE_PROVIDER=runware
MOCK_IMAGE=false
```

说明：

- `TEXT_*` 用于核心剧情文本，也会作为 text profile 的最终 fallback。
- `IMAGE_*` 用于场景图和角色肖像。
- 如果没有配置 `VISION_*`，识图会回退使用 `TEXT_*`。但生产环境建议单独配置视觉模型。
- 如果不配置 `TTS_*`，配音关闭，游戏仍可运行。

## 官方模型基础配置

### Text

```env
TEXT_BASE_URL=https://openrouter.ai/api/v1
TEXT_API_KEY=
TEXT_MODEL=
TEXT_PROVIDER=openai_compatible
```

也可以使用火山引擎、DeepSeek、OpenAI-compatible 网关等。关键是 `TEXT_BASE_URL` 必须是 OpenAI-compatible endpoint。

### Image

```env
IMAGE_BASE_URL=
IMAGE_API_KEY=
IMAGE_MODEL=
IMAGE_PROVIDER=
```

当前支持：

| Provider | `IMAGE_PROVIDER` | 说明 |
| --- | --- | --- |
| Runware | `runware` | 当前推荐，低成本、速度快，`runware.ai` URL 会自动识别。 |
| OpenAI gpt-image | `openai` | 支持 OpenAI SDK 路径。 |
| OpenAI-compatible 图像接口 | `openai_compatible` | 需要供应商兼容 `/images/generations`。 |

如果使用火山引擎图片模型，需要确认其接口是否兼容 OpenAI 图片生成协议；如果不是，需要单独增加 image adapter，不能只改环境变量。

### Vision

```env
VISION_BASE_URL=
VISION_API_KEY=
VISION_MODEL=
VISION_PROVIDER=openai_compatible
VISION_TIMEOUT_MS=20000
```

Vision 用于：

- 点击画面识别。
- 上传参考图解析画风。

如果先不配，系统会回退到 `TEXT_*`，但不建议长期这样做。文本模型不一定支持图片输入。

### TTS

```env
TTS_BASE_URL=
TTS_API_KEY=
TTS_SPEECH_MODEL=
```

不配置时配音关闭。

当前 TTS provider 根据 `TTS_BASE_URL` host 自动判断：

| Provider | 配置方式 |
| --- | --- |
| Xiaomi MiMo | `TTS_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1`，`TTS_SPEECH_MODEL=mimo-v2.5-tts` |
| StepFun | `TTS_BASE_URL=https://api.stepfun.com/v1`，`TTS_SPEECH_MODEL=step-tts-mini` / `step-tts-2` / `stepaudio-2.5-tts` |

## 场景模型 Profile

Profile 是官方模式内部路由，不是用户可见配置。

当前默认路由：

| 场景 / Agent | Profile | 默认回退 |
| --- | --- | --- |
| Writer | `text-main` | `TEXT_*` |
| CharacterDesigner | `text-fast` | `text-main` -> `TEXT_*` |
| Cinematographer | `text-fast` | `text-main` -> `TEXT_*` |
| StyleSelector | `text-lite` | `text-fast` -> `text-main` -> `TEXT_*` |
| FreeformClassifier | `text-lite` | `text-fast` -> `text-main` -> `TEXT_*` |
| InsertBeat | `text-fast` | `text-main` -> `TEXT_*` |
| Vision click | `vision-fast` | `vision-main` -> `VISION_*` -> `TEXT_*` |
| Style image parsing | `vision-main` | `VISION_*` -> `TEXT_*` |
| Scene image | `image-scene` | `IMAGE_*` |
| Character portrait | `image-character` | `image-scene` -> `IMAGE_*` |
| Beat audio | `tts-main` | `TTS_*` |

第一版部署可以只配置基础变量。确认跑通后，再逐步加下面这些 profile。

### Text Main

用于 Writer 和 Studio assistant。建议使用质量最强、协议遵循稳定的模型。

```env
MODEL_PROFILE_TEXT_MAIN_BASE_URL=
MODEL_PROFILE_TEXT_MAIN_API_KEY=
MODEL_PROFILE_TEXT_MAIN_MODEL=
MODEL_PROFILE_TEXT_MAIN_PROVIDER=openai_compatible
```

如果不设置，回退到 `TEXT_*`。

### Text Fast

用于 CharacterDesigner、Cinematographer、InsertBeat。建议使用速度快、成本低但结构化输出稳定的模型。

```env
MODEL_PROFILE_TEXT_FAST_BASE_URL=
MODEL_PROFILE_TEXT_FAST_API_KEY=
MODEL_PROFILE_TEXT_FAST_MODEL=
MODEL_PROFILE_TEXT_FAST_PROVIDER=openai_compatible
```

可以只设置 `MODEL_PROFILE_TEXT_FAST_MODEL`，其余沿用 `text-main` 或 `TEXT_*`。

### Text Lite

用于 FreeformClassifier、StyleSelector。建议使用最便宜的分类/短输出模型。

```env
MODEL_PROFILE_TEXT_LITE_BASE_URL=
MODEL_PROFILE_TEXT_LITE_API_KEY=
MODEL_PROFILE_TEXT_LITE_MODEL=
MODEL_PROFILE_TEXT_LITE_PROVIDER=openai_compatible
```

可以只设置 `MODEL_PROFILE_TEXT_LITE_MODEL`。

### Vision Profile

```env
MODEL_PROFILE_VISION_MAIN_BASE_URL=
MODEL_PROFILE_VISION_MAIN_API_KEY=
MODEL_PROFILE_VISION_MAIN_MODEL=
MODEL_PROFILE_VISION_MAIN_PROVIDER=openai_compatible

MODEL_PROFILE_VISION_FAST_BASE_URL=
MODEL_PROFILE_VISION_FAST_API_KEY=
MODEL_PROFILE_VISION_FAST_MODEL=
MODEL_PROFILE_VISION_FAST_PROVIDER=openai_compatible
```

如果只想简化配置，直接配 `VISION_*` 即可。

### Image Profile

```env
MODEL_PROFILE_IMAGE_SCENE_BASE_URL=
MODEL_PROFILE_IMAGE_SCENE_API_KEY=
MODEL_PROFILE_IMAGE_SCENE_MODEL=
MODEL_PROFILE_IMAGE_SCENE_PROVIDER=

MODEL_PROFILE_IMAGE_CHARACTER_BASE_URL=
MODEL_PROFILE_IMAGE_CHARACTER_API_KEY=
MODEL_PROFILE_IMAGE_CHARACTER_MODEL=
MODEL_PROFILE_IMAGE_CHARACTER_PROVIDER=
```

第一阶段可以不拆图片 profile，统一使用 `IMAGE_*`。

### TTS Profile

```env
MODEL_PROFILE_TTS_MAIN_BASE_URL=
MODEL_PROFILE_TTS_MAIN_API_KEY=
MODEL_PROFILE_TTS_MAIN_SPEECH_MODEL=
```

第一阶段可以不配置，使用 `TTS_*`。

## 推荐上线配置

### 最简单可上线

```env
TEXT_BASE_URL=
TEXT_API_KEY=
TEXT_MODEL=
TEXT_PROVIDER=openai_compatible

IMAGE_BASE_URL=
IMAGE_API_KEY=
IMAGE_MODEL=
IMAGE_PROVIDER=

VISION_BASE_URL=
VISION_API_KEY=
VISION_MODEL=
VISION_PROVIDER=openai_compatible

MOCK_IMAGE=false
OFFICIAL_DAILY_CREDIT_LIMIT=50
```

### 开启文本分流

```env
MODEL_PROFILE_TEXT_MAIN_MODEL=
MODEL_PROFILE_TEXT_FAST_MODEL=
MODEL_PROFILE_TEXT_LITE_MODEL=
```

如果这些模型来自同一个平台同一个 Key，只配置 `*_MODEL` 即可。baseUrl / apiKey / provider 会继承上一级 profile 或 `TEXT_*`。

例如：

```env
TEXT_BASE_URL=https://openrouter.ai/api/v1
TEXT_API_KEY=
TEXT_MODEL=anthropic/claude-sonnet-4.6
TEXT_PROVIDER=openai_compatible

MODEL_PROFILE_TEXT_FAST_MODEL=anthropic/claude-haiku-4.5
MODEL_PROFILE_TEXT_LITE_MODEL=deepseek/deepseek-v4-flash
```

## 官方额度

匿名测试期每日官方额度：

```env
OFFICIAL_DAILY_CREDIT_LIMIT=50
```

说明：

- 这是临时成本控制，不是正式钱包。
- D1 可用时会按 `guestId` 或用户 ID 统计每日消费。
- D1 不可用时会降级放行，不阻断官方模型跑通。

## 数据库与 Cloudflare

D1 不是模型调用的必填项，但生产环境如果要启用 usage / ledger 持久化，需要 Cloudflare D1 binding：

```text
DB
```

本地 `next dev` 没有 Cloudflare Workers 上下文时，调用 D1 会降级或返回空账单。要本地真实测试 D1，需要走 OpenNext Cloudflare dev 初始化和 `wrangler dev`。

R2 当前不是核心模型路径必填项。后续如果要把生成图片、音频、导出包持久化到对象存储，再配置：

```env
R2_PUBLIC_DOMAIN=
```

并在 Cloudflare Worker 环境绑定：

```text
R2_BUCKET
```

## 前端公开变量

这些变量会在构建时写入前端包，修改后需要重新 build。

```env
NEXT_PUBLIC_BASE_URL=

NEXT_PUBLIC_IMAGE_PROXY_URL=
NEXT_PUBLIC_IMAGE_PROXY_ALLOWED_HOSTS=im.runware.ai

NEXT_PUBLIC_UMAMI_SRC=
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
NEXT_PUBLIC_UMAMI_DOMAINS=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

说明：

- Supabase 两个变量都为空时，账号系统关闭，API 使用匿名模式。
- Umami 两个变量都为空时，不加载统计脚本。
- 图片代理为空时，浏览器直接加载供应商图片。

## 部署前检查

```bash
pnpm typecheck
pnpm lint
```

部署后手动检查：

1. 打开首页。
2. 使用官方模式开始一个故事。
3. 生成下一幕。
4. 点击画面触发 Vision。
5. 打开设置 -> 模型，确认官方额度展示正常。
6. 查看服务端日志中的 `[model-usage]`，确认包含 `modelRoute` 和 `textAgentProfiles`。
