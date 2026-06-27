import { NextResponse } from "next/server";

export const runtime = "nodejs";

const requiredEngineVars = [
  "TEXT_BASE_URL",
  "TEXT_API_KEY",
  "TEXT_MODEL",
  "IMAGE_BASE_URL",
  "IMAGE_API_KEY",
  "IMAGE_MODEL",
  "VISION_BASE_URL",
  "VISION_API_KEY",
  "VISION_MODEL",
];

export async function GET() {
  const missing = requiredEngineVars.filter((name) => !process.env[name]);

  return NextResponse.json({
    serverEngineConfigured: missing.length === 0,
    missing,
  });
}
