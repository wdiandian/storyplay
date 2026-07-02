# 图片模型路由与 fal.ai / OpenRouter 配置

本文档说明 StoryPlay 图片生成目前的路由关系，以及如何接入 fal.ai / OpenRouter 图片模型。

## fal.ai 推荐配置

如果使用 fal.ai 的 Nano Banana 2 Lite：

```text
google/nano-banana-2-lite
```

推荐配置：

```env
IMAGE_BASE_URL=https://fal.run
IMAGE_API_KEY=fal-xxx
IMAGE_MODEL=google/nano-banana-2-lite
IMAGE_PROVIDER=fal_image
# 可选：参考图编辑模型。默认会按 fal 当前 endpoint 走 google/nano-banana-lite/edit。
# FAL_IMAGE_EDIT_MODEL=google/nano-banana-lite/edit
```

项目会根据是否有参考图自动选择 fal endpoint：

| 场景 | fal endpoint |
| --- | --- |
| 无参考图 | `https://fal.run/google/nano-banana-2-lite` |
| 有参考图 | `https://fal.run/google/nano-banana-lite/edit`，可用 `FAL_IMAGE_EDIT_MODEL` 覆盖 |

当前传给 fal 的主要参数：

| 参数 | 当前值 |
| --- | --- |
| `prompt` | 场景图 / 角色图提示词 |
| `num_images` | `1` |
| `aspect_ratio` | 横屏 `16:9`，竖屏 `9:16` |
| `output_format` | `png` |
| `sync_mode` | `true`，优先让 fal 返回 data URI，避免临时 URL 404 |
| `image_urls` | 仅参考图生成时传入 |

fal 如果仍返回远程 URL，服务端会立刻下载并转成 `data:image/...;base64,...` 返回给前端。

如果误把 `IMAGE_BASE_URL` 填成完整模型地址，例如 `https://fal.run/google/nano-banana-2-lite`，代码会自动拆回 `https://fal.run` + 模型路径，避免重复拼接。

## OpenRouter 配置

如果使用 OpenRouter 的图片模型：

```text
google/gemini-3.1-flash-lite-image
```

需要使用项目新增的 `openrouter_image` 协议：

```env
IMAGE_BASE_URL=https://openrouter.ai/api/v1
IMAGE_API_KEY=sk-or-v1-xxx
IMAGE_MODEL=google/gemini-3.1-flash-lite-image
IMAGE_PROVIDER=openrouter_image
```

不要把这个模型配置为 `IMAGE_PROVIDER=openai_compatible`。`openai_compatible` 是旧的 `/images/generations` 路径，而 OpenRouter 图片模型走专用 Images API。

## 当前调用参数

项目对 OpenRouter Images API 的调用方式：

| 参数 | 当前值 |
| --- | --- |
| `model` | `IMAGE_MODEL` 或图片 profile 模型 |
| `prompt` | 场景图 / 角色图提示词 |
| `n` | `1` |
| `aspect_ratio` | 横屏 `16:9`，竖屏 `9:16` |
| `resolution` | `1K` |
| `input_references` | 仅在场景图有参考图时传入 |

`google/gemini-3.1-flash-lite-image` 当前支持 `input_references` 0-14 张、`resolution=1K`，适合先作为低成本图片链路跑通。

## 图片 Profile

官方模式里图片已经拆成两个 profile：

| Profile | 用途 | 默认回退 |
| --- | --- | --- |
| `image-scene` | 场景主图 / 背景图 | `IMAGE_*` |
| `image-character` | 角色头像 / 基础立绘 | `image-scene` -> `IMAGE_*` |

如果场景图和角色图使用同一个模型，只配置基础 `IMAGE_*` 即可。

如果想拆开：

```env
MODEL_PROFILE_IMAGE_SCENE_BASE_URL=https://openrouter.ai/api/v1
MODEL_PROFILE_IMAGE_SCENE_API_KEY=sk-or-v1-xxx
MODEL_PROFILE_IMAGE_SCENE_MODEL=google/gemini-3.1-flash-lite-image
MODEL_PROFILE_IMAGE_SCENE_PROVIDER=openrouter_image

MODEL_PROFILE_IMAGE_CHARACTER_BASE_URL=https://openrouter.ai/api/v1
MODEL_PROFILE_IMAGE_CHARACTER_API_KEY=sk-or-v1-xxx
MODEL_PROFILE_IMAGE_CHARACTER_MODEL=google/gemini-3.1-flash-lite-image
MODEL_PROFILE_IMAGE_CHARACTER_PROVIDER=openrouter_image
```

## 什么时候走参考生成

场景主图优先走参考生成。参考图来源按优先级收集：

1. 用户上传的风格参考图。
2. 同一 `sceneKey` 的上一幕场景图。
3. 当前入场角色的角色头像。
4. 当前入场其他角色的角色头像。

如果收集到参考图：

```text
先调用参考生成
如果参考生成失败，再降级为直接文生图
```

如果没有参考图：

```text
直接文生图
```

## 什么时候走直接生成

角色头像默认走直接文生图：

```text
角色视觉描述 + 画风 -> 角色头像
```

这样做是为了让角色头像成为后续场景图的稳定锚点，避免“角色头像依赖场景图、场景图又依赖角色头像”的循环。

## 当前限制

1. `resolution` 目前固定为 `1K`，后续可以做成环境变量。
2. OpenRouter 图片返回 URL 或 base64 都兼容，但不同上游的 URL 保留时长可能不同。
3. 参考图传入 URL 或 data URL。若上游不接受某种 URL 形态，会自动降级为直接文生图。
4. `IMAGE_HEDGE_MS` 不建议用于 OpenRouter/Gemini 图片模型，先留空；只建议给 Runware 这类快模型使用。
