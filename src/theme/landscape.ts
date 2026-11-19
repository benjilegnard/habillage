import { MochaColor } from "./colors";

// Color sets for the <Landscape> scene. Only Catppuccin Mocha colors.
export type LandscapeTheme = {
  sun: {
    // "sun": striped disc, "moon": plain disc
    variant: "sun" | "moon";
    // Vertical gradient, from top to bottom
    gradient: [MochaColor, MochaColor, MochaColor, MochaColor];
    // Halo, from center to edge
    glow: [MochaColor, MochaColor, MochaColor];
  };
  sky: {
    // Colors just above the horizon line
    horizonGlow: MochaColor;
    horizon: MochaColor;
    starCount: number;
    starColors: MochaColor[];
  };
  // Grid line colors: flat floor, slopes, peaks
  grid: [MochaColor, MochaColor, MochaColor];
  farMountainsOutline: MochaColor;
};

export const landscapeThemes = {
  sunset: {
    sun: {
      variant: "sun",
      gradient: ["yellow", "peach", "red", "maroon"],
      glow: ["peach", "red", "mauve"],
    },
    sky: {
      horizonGlow: "mauve",
      horizon: "pink",
      starCount: 140,
      starColors: ["text", "lavender", "pink", "sky"],
    },
    grid: ["mauve", "pink", "peach"],
    farMountainsOutline: "mauve",
  },
  moon: {
    sun: {
      variant: "moon",
      gradient: ["text", "lavender", "blue", "sapphire"],
      glow: ["lavender", "blue", "sapphire"],
    },
    sky: {
      horizonGlow: "blue",
      horizon: "lavender",
      starCount: 320,
      starColors: ["text", "lavender", "sky", "subtext1"],
    },
    grid: ["blue", "sapphire", "sky"],
    farMountainsOutline: "blue",
  },
} satisfies Record<string, LandscapeTheme>;

export type LandscapeThemeName = keyof typeof landscapeThemes;
