import { MusicNote } from "@solar-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CoverImage, useCoverReady } from "@/features/covers";
import type { ImmersiveSleeve } from "@/features/settings/store/customizationStore";
import styles from "./ImmersiveCover.module.css";
import cdCase from "@/assets/sleeves/cd-case-clear.png";

interface ImmersiveCoverProps {
  sleeve: ImmersiveSleeve;
  coverUrl: string;
  title: string;
  trackId?: string;
  size: number;
  isPlaying?: boolean;
}

export function ImmersiveCover({
  sleeve,
  coverUrl,
  title,
  trackId,
  size,
  isPlaying = false,
}: ImmersiveCoverProps) {
  const loaded = useCoverReady(coverUrl);
  const reducedMotion = useReducedMotion();

  return (
    <div className={styles.stage} data-sleeve={sleeve} data-playing={isPlaying}>
      {sleeve === "vinyl" && (
        <div className={styles.record} aria-hidden="true">
          <div className={styles.recordSurface} />
        </div>
      )}
      <div className={styles.housing}>
        <div className={styles.media}>
          <div
            className={`${styles.artwork} ${coverUrl && !loaded ? "motion-safe:animate-pulse" : ""}`}
            aria-busy={Boolean(coverUrl && !loaded)}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={trackId || coverUrl || "empty"}
                initial={{
                  opacity: 0,
                  filter: reducedMotion ? "none" : "blur(8px)",
                }}
                animate={{
                  opacity: 1,
                  filter: reducedMotion ? "none" : "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  filter: reducedMotion ? "none" : "blur(8px)",
                }}
                transition={{
                  duration: reducedMotion ? 0 : 0.2,
                  ease: "easeOut",
                }}
                className={styles.image}
              >
                {coverUrl ? (
                  <CoverImage
                    key={coverUrl}
                    src={coverUrl}
                    alt={title}
                    fill
                    sizes={`${size}px`}
                    priority
                    className="object-cover"
                  />
                ) : (
                  <div className={styles.placeholder}>
                    <MusicNote size={64} aria-label={title} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {sleeve === "cd" && (
          <>
            <div className={styles.discSheen} aria-hidden="true" />
            <div className={styles.discHub} aria-hidden="true" />
            <img
              className={styles.plastic}
              src={cdCase}
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
            />
          </>
        )}
        {sleeve === "vinyl" && (
          <div className={styles.paper} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
