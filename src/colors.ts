import { flavors } from "@catppuccin/palette";

// Every color of the video comes from the Catppuccin Mocha palette.
export const mocha = flavors.mocha.colors;

export type MochaColor = keyof typeof mocha;

export const hex = (name: MochaColor): string => mocha[name].hex;

export const rgba = (name: MochaColor, alpha: number): string => {
  const { r, g, b } = mocha[name].rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
