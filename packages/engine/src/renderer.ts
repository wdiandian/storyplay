import { generateImage } from "@yume/ai-client";
import type { ProviderConfig, Scene } from "@yume/types";
import { buildImagePrompt } from "./prompts";

export async function render(
  config: ProviderConfig,
  scene: Scene,
  styleGuide: string,
): Promise<string> {
  const prompt = buildImagePrompt(scene, styleGuide);
  return generateImage(config, prompt);
}
