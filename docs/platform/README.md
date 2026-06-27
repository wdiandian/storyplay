# Platform Infrastructure

Status: Plan / Current Map.

本目录负责 StoryPlay 的内部基建总览，重点覆盖 Agent 系统、模型 API、服务端路由、数据库和运行环境。更细的 agent 文档仍放在 `../agent-system/`。

## 范围

- Agent system：注册、contract、parser、fallback、fixtures、测试。
- Model API：文本、图像、视觉、TTS 的 provider 调用和降级。
- Server API：生成、续写、视觉点击、插入剧情、音频、故事打包。
- Runtime config：环境变量、供应商 key、用户自带 key、部署配置。
- Data layer：数据库 schema、repository、Supabase、migration。

## 当前主要代码

- `lib/engine/agent-system/`
- `lib/engine/agents/`
- `lib/engine/director.ts`
- `lib/engine/orchestrator.ts`
- `lib/engine/vision.ts`
- `lib/engine/voice.ts`
- `lib/ai-client/`
- `lib/tts-client/`
- `lib/config.ts`
- `lib/db/`
- `lib/supabase/`
- `app/api/`

## 关联文档

- [../project-modules.md](../project-modules.md)
- [../agent-system/README.md](../agent-system/README.md)
- [../creative-engine/current-architecture.md](../creative-engine/current-architecture.md)
- [../integrations/README.md](../integrations/README.md)

## 后续文档建议

- `model-routing.md`：模型 provider、fallback、成本和限流策略。
- `api-map.md`：所有 API route 的职责、输入输出和调用关系。
- `data-layer.md`：数据库 schema、repository 和迁移策略。
- `runtime-config.md`：环境变量、部署配置和本地开发配置。
