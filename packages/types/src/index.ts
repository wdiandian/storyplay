// ──────────────────────────────────────────────────────────────────────
//  Beat — one dialogue / narration moment within a Scene.
//  Multiple beats share the same background image; tapping or choosing
//  advances among them WITHOUT regenerating the image.
// ──────────────────────────────────────────────────────────────────────

export type Beat = {
  id: string;
  narration?: string;
  speaker?: string;
  line?: string;
  next: BeatNext;
};

export type BeatNext =
  | { type: "continue"; nextBeatId: string }
  | { type: "choice"; choices: BeatChoice[] };

export type BeatChoice = {
  id: string;
  label: string;
  effect: BeatChoiceEffect;
};

export type BeatChoiceEffect =
  | { kind: "advance-beat"; targetBeatId: string }
  | { kind: "change-scene"; nextSceneSeed: string };

// ──────────────────────────────────────────────────────────────────────
//  Scene — one background image + a graph of beats.
//  The Director emits an entire Scene per call; the player navigates
//  through its beats locally with zero network until exiting.
// ──────────────────────────────────────────────────────────────────────

export type Scene = {
  id: string;
  scenePrompt: string;
  beats: Beat[];
  entryBeatId: string;
};

export type SceneExit =
  | {
      kind: "choice";
      choiceId: string;
      label: string;
      nextSceneSeed: string;
    }
  | { kind: "freeform"; action: string };

export type SceneHistoryEntry = {
  scene: Scene;
  visitedBeatIds: string[];
  exit?: SceneExit;
};

// ──────────────────────────────────────────────────────────────────────
//  Session
// ──────────────────────────────────────────────────────────────────────

export type Session = {
  id: string;
  createdAt: number;
  worldSetting: string;
  styleGuide: string;
  history: SceneHistoryEntry[];
};

// ──────────────────────────────────────────────────────────────────────
//  Vision
// ──────────────────────────────────────────────────────────────────────

export type ClickIntent = {
  freeformAction: string;
  reasoning: string;
};

export type VisionClassify = "insert-beat" | "change-scene";

// ──────────────────────────────────────────────────────────────────────
//  Provider config
// ──────────────────────────────────────────────────────────────────────

export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type EngineConfig = {
  text: ProviderConfig;
  image: ProviderConfig;
  vision: ProviderConfig;
};

// ──────────────────────────────────────────────────────────────────────
//  API contracts
// ──────────────────────────────────────────────────────────────────────

export type StartRequest = {
  worldSetting: string;
  styleGuide: string;
};

export type StartResponse = {
  sessionId: string;
  scene: Scene;
  imageBase64: string;
};

// /api/scene — generates the next Scene, given session whose latest
// history entry has `exit` set. Also used for prefetch speculation
// (frontend synthesizes a speculative exit).
export type SceneRequest = {
  session: Session;
};

export type SceneResponse = {
  scene: Scene;
  imageBase64: string;
};

// /api/vision — interprets a background click on the current image and
// classifies whether it should insert a beat (in-scene exploration) or
// trigger a scene change.
export type VisionRequest = {
  session: Session;
  prevImageBase64: string;
  click: { x: number; y: number };
};

export type VisionResponse = {
  intent: ClickIntent;
  classify: VisionClassify;
};

// /api/insert-beat — generates a single transient beat in response to
// a freeform vision action. Does NOT regenerate the image.
export type InsertBeatRequest = {
  session: Session;
  freeformAction: string;
};

export type InsertBeatResponse = {
  partial: {
    narration?: string;
    speaker?: string;
    line?: string;
  };
};
