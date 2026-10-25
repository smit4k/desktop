import { useEffect, useState } from "react";
import { useCustomizationStore } from "@/features/settings/store/customizationStore";
import { cn } from "@/shared/lib";
import { usePlayerState } from "../hooks/usePlayerState";
import { VolumePicker } from "./VolumePicker";
import { ImmersiveCover } from "./ImmersiveCover";
import { FullscreenTrackInfo } from "./FullscreenTrackInfo";
import { FullscreenTimeline } from "./FullscreenTimeline";
import { FullscreenTransportControls } from "./FullscreenTransportControls";
import { BASE_COLUMN_WIDTH, fullscreenColumnScale } from "../lib/fullscreenScale";
import { useWindowState } from "@/features/navigation/hooks/useWindowState";

function useFullscreenColumnScale(): number {
  const { isEdgeToEdge } = useWindowState();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!isEdgeToEdge) {
      setScale(1);
      return;
    }
    const update = () => setScale(fullscreenColumnScale(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isEdgeToEdge]);

  return scale;
}

interface PlayerUiElementsProps {
  onDuration?: (duration: number) => void;
  onClose?: () => void;
}

export function PlayerUiElements({ onClose }: PlayerUiElementsProps) {
  const player = usePlayerState();
  const track = player.currentTrack;
  const coverUrl = track?.coverUrl || "";
  const sleeve = useCustomizationStore((s) => s.immersiveSleeve);
  const scale = useFullscreenColumnScale();
  const scaled = scale > 1;

  return (
    <div
      className={cn(
        "flex min-w-[240px] flex-col items-stretch",
        !scaled && "w-[min(340px,32vw,calc(100vh-340px))]",
      )}
      style={scaled ? { width: Math.round(BASE_COLUMN_WIDTH * scale) } : undefined}
    >
      <ImmersiveCover
        sleeve={sleeve}
        coverUrl={coverUrl}
        title={track?.title || ""}
        trackId={track?.id}
        size={Math.round(BASE_COLUMN_WIDTH * scale)}
        isPlaying={player.status === "playing"}
      />

      <div className="mt-[24px]">
        <FullscreenTrackInfo onClose={onClose} />
      </div>

      <div className="mt-[22px]">
        <FullscreenTimeline />
      </div>

      <div className="mt-[20px]">
        <FullscreenTransportControls />
      </div>

      <div className="mt-[22px] flex justify-center">
        <VolumePicker
          className="w-[60%]"
          size="sm"
          iconSize={22}
          iconClassName="text-white opacity-80 hover:opacity-100"
        />
      </div>
    </div>
  );
}

export default PlayerUiElements;
