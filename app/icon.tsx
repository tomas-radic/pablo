import { ImageResponse } from "next/og";
import { IconArt } from "./icon-art";

export const contentType = "image/png";

const SIZES = [32, 192, 512];

export function generateImageMetadata() {
  return SIZES.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType,
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const size = Number(await id);
  return new ImageResponse(<IconArt size={size} />, { width: size, height: size });
}
