import { Composition } from "remotion";
import { Synthwave, synthwaveSchema } from "./Synthwave";
import { DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from "./Synthwave/config";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Synthwave"
      component={Synthwave}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      schema={synthwaveSchema}
      defaultProps={{ seed: "outrun-1984" }}
    />
  );
};
