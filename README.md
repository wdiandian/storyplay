# StoryPlay

StoryPlay 是一个 AI 互动故事创作与游玩项目。

当前项目已经从原开源项目改造为新的独立项目：

```text
https://github.com/wdiandian/storyplay
https://storyplay.cc/
```

## 本地开发

要求：

- Node.js 22+
- pnpm 9.12.0+

```bash
pnpm install
pnpm dev
```

常用检查：

```bash
pnpm typecheck
pnpm build
```

## 环境变量

本地复制 `.env.example` 或 `.dev.vars.example` 后填写真实值。

核心变量：

```text
TEXT_BASE_URL
TEXT_API_KEY
TEXT_MODEL

IMAGE_BASE_URL
IMAGE_API_KEY
IMAGE_MODEL

VISION_BASE_URL
VISION_API_KEY
VISION_MODEL

MOCK_IMAGE=false
```

可选：

```text
TTS_BASE_URL
TTS_API_KEY
TTS_SPEECH_MODEL
IMAGE_TIMEOUT_MS
IMAGE_HEDGE_MS
```

## 部署

当前推荐部署路线：

```text
GitHub -> GHCR Docker image -> 腾讯云服务器 -> Nginx -> storyplay.cc
```

部署文档：

- [腾讯云服务器部署](docs/deployment/tencent-cloud-server.md)
- [Cloudflare Workers 部署，可选](docs/deployment/cloudflare-workers.md)

Docker 镜像：

```text
ghcr.io/wdiandian/storyplay:latest
```

## 数据持久化

当前 Studio MVP 使用 `.storyplay` 保存故事工程与发布数据。

Docker 部署时已经通过命名卷挂载：

```text
storyplay_data -> /app/.storyplay
```

后续多用户生产版本应迁移到数据库和对象存储。
