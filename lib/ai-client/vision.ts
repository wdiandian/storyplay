import OpenAI from "openai";
import type { ProviderConfig } from "@storyplay/types";
import { normalizeBaseUrl } from "./normalizeUrl";

const DEFAULT_VISION_TIMEOUT_MS = 20_000;

export async function interpretClick(
  config: ProviderConfig,
  imageBase64: string,
  prompt: string,
  timeoutMs = DEFAULT_VISION_TIMEOUT_MS,
): Promise<string> {
  return analyzeImageDataUrl(
    config,
    `data:image/png;base64,${imageBase64}`,
    prompt,
    timeoutMs,
  );
}

export async function analyzeImageDataUrl(
  config: ProviderConfig,
  imageDataUrl: string,
  prompt: string,
  timeoutMs = DEFAULT_VISION_TIMEOUT_MS,
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: normalizeBaseUrl(config.baseUrl, "openai_compatible"),
    maxRetries: 0,
    timeout: timeoutMs,
    dangerouslyAllowBrowser: true,
  });

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    temperature: 0.2,
    stream: false,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  if (text.length === 0) {
    throw new Error(`Vision API returned no content.`);
  }
  return text;
}
