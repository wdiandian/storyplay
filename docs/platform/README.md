# 平台基建

状态：规划 / 当前地图。

本目录记录 StoryPlay 的平台基建：agent 运行时、模型 API、服务端路由、运行配置、数据层和部署相关内容。更细的 agent 文档仍放在 `../agent-system/`。

## 范围

- Agent system：注册表、contracts、parser、fallback、fixtures、测试。
- Model API：Text、Image、Vision、TTS 的供应商调用、路由、降级、成本、限流和 BYOK 行为。
- Server API：生成、续写、视觉点击、插入互动、音频、故事打包、Studio 路由。
- Runtime config：环境变量、供应商 Key、用户自带 Key、部署配置。
- Data layer：数据库 schema、repositories、Supabase、migrations。

## 主要代码

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

## 模型 / 运行时文档

- [model-infrastructure.md](model-infrastructure.md)：官方托管模型、BYOK、用量记录、点数计费、模型路由和后台控制。
- `api-map.md`：API route 职责、输入输出协议和运行时调用图。
- `data-layer.md`：数据库 schema、repository 和迁移策略。
- `runtime-config.md`：环境变量、部署配置和本地开发配置。
