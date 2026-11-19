import { Audio } from "@remotion/media";
import React from "react";

/**
 * Plays a generated music loop (see `useMusic`). The source is a blob URL:
 * it only works with the @remotion/media decoder, so the HTML5 audio
 * fallback is disabled (it would fail in render, Node cannot read blob URLs).
 */
export const Music: React.FC<{ src: string | null; volume?: number }> = ({
  src,
  volume = 0.8,
}) => {
  if (!src) {
    return null;
  }
  return <Audio src={src} volume={volume} loop disallowFallbackToHtml5Audio />;
};
