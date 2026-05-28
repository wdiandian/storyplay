import type {
  EngineConfig,
  InsertBeatRequest,
  InsertBeatResponse,
  SceneRequest,
  SceneResponse,
  Session,
  StartRequest,
  StartResponse,
  VisionRequest,
  VisionResponse,
} from "@yume/types";
import { annotateClick } from "./annotate";
import { directInsertBeat, directScene } from "./director";
import { render } from "./renderer";
import { interpret } from "./vision";

function newSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ──────────────────────────────────────────────────────────────────────
//  startSession — first scene + image
// ──────────────────────────────────────────────────────────────────────

export async function startSession(
  config: EngineConfig,
  req: StartRequest,
): Promise<StartResponse> {
  const session: Session = {
    id: newSessionId(),
    createdAt: Date.now(),
    worldSetting: req.worldSetting.trim(),
    styleGuide: req.styleGuide.trim(),
    history: [],
  };

  const scene = await directScene(config.text, session);
  const imageBase64 = await render(config.image, scene, session.styleGuide);

  return {
    sessionId: session.id,
    scene,
    imageBase64,
  };
}

// ──────────────────────────────────────────────────────────────────────
//  requestScene — generate the NEXT scene + image.
//  Frontend passes a session whose latest history entry has `exit` set.
//  Also used for prefetch speculation (frontend synthesizes the exit).
// ──────────────────────────────────────────────────────────────────────

export async function requestScene(
  config: EngineConfig,
  req: SceneRequest,
): Promise<SceneResponse> {
  const scene = await directScene(config.text, req.session);
  const imageBase64 = await render(config.image, scene, req.session.styleGuide);
  return { scene, imageBase64 };
}

// ──────────────────────────────────────────────────────────────────────
//  visionDecide — interprets a background click into intent + classify.
// ──────────────────────────────────────────────────────────────────────

export async function visionDecide(
  config: EngineConfig,
  req: VisionRequest,
): Promise<VisionResponse> {
  const annotated = await annotateClick(req.prevImageBase64, req.click);
  const current = req.session.history.at(-1)?.scene ?? null;
  return interpret(config.vision, annotated, current);
}

// ──────────────────────────────────────────────────────────────────────
//  requestInsertBeat — generates a transient in-scene beat (no image regen)
// ──────────────────────────────────────────────────────────────────────

export async function requestInsertBeat(
  config: EngineConfig,
  req: InsertBeatRequest,
): Promise<InsertBeatResponse> {
  const partial = await directInsertBeat(
    config.text,
    req.session,
    req.freeformAction,
  );
  return { partial };
}
