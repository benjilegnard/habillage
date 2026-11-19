import { Composition, Folder, Still } from "remotion";
import { Synthwave, synthwaveSchema } from "./compositions/Synthwave";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Backgrounds">
        {/* 20 s seamless loops */}
        <Composition
          id="Synthwave"
          component={Synthwave}
          durationInFrames={20 * FPS}
          fps={FPS}
          width={1920}
          height={1080}
          schema={synthwaveSchema}
          defaultProps={{ seed: "lololololo", theme: "sunset" as const }}
        />
        <Composition
          id="SynthwaveMoon"
          component={Synthwave}
          durationInFrames={20 * FPS}
          fps={FPS}
          width={1920}
          height={1080}
          schema={synthwaveSchema}
          defaultProps={{ seed: "night-drive", theme: "moon" as const }}
        />
      </Folder>
      <Folder name="Images">
        <Still
          id="SynthwaveThumbnail"
          component={Synthwave}
          width={1280}
          height={720}
          schema={synthwaveSchema}
          defaultProps={{ seed: "outrun-1984", theme: "sunset" as const }}
        />
      </Folder>
    </>
  );
};
