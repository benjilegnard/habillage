/** Stereo float samples (-1 to 1) to a 16-bit PCM WAV file. */
export const encodeWav = (
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): ArrayBuffer => {
  const frames = left.length;
  const buffer = new ArrayBuffer(44 + frames * 4);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };
  // Explicit rounding and clipping, do not rely on the encoder
  const toInt16 = (x: number) =>
    Math.max(-32768, Math.min(32767, Math.round(x * 32767)));

  text(0, "RIFF");
  view.setUint32(4, 36 + frames * 4, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 2, true); // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true); // byte rate
  view.setUint16(32, 4, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  text(36, "data");
  view.setUint32(40, frames * 4, true);
  for (let i = 0; i < frames; i++) {
    view.setInt16(44 + i * 4, toInt16(left[i]), true);
    view.setInt16(46 + i * 4, toInt16(right[i]), true);
  }
  return buffer;
};
