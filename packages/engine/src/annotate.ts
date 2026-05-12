import sharp from "sharp";

export async function annotateClick(
  imageBase64: string,
  click: { x: number; y: number },
): Promise<string> {
  const buf = Buffer.from(imageBase64, "base64");

  const resized = await sharp(buf)
    .resize({ width: 768, withoutEnlargement: true, fit: "inside" })
    .png()
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const w = meta.width ?? 768;
  const h = meta.height ?? 1152;

  const cx = Math.round(click.x * w);
  const cy = Math.round(click.y * h);
  const r = Math.max(8, Math.round(Math.min(w, h) * 0.025));
  const stroke = Math.max(2, Math.round(r * 0.25));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,40,40,0.55)"
            stroke="rgba(255,255,255,0.95)" stroke-width="${stroke}" />
    <circle cx="${cx}" cy="${cy}" r="${Math.round(r * 0.25)}"
            fill="rgba(255,255,255,1)" />
  </svg>`;

  const out = await sharp(resized)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return out.toString("base64");
}
