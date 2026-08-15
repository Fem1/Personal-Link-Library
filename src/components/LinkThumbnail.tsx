"use client";

import { useState } from "react";

const SIZE_CLASSES: Record<"md" | "sm", string> = {
  md: "h-28 w-28 rounded-md",
  sm: "h-9 w-9 rounded",
};

/**
 * Fixed-size thumbnail for a link's article image. Falls back to a plain
 * placeholder when there's no image_url, or when the remote image URL
 * fails to load (source pages aren't guaranteed to keep serving it).
 *
 * size="md" (112px) is the default card-row size used on /timeline and
 * /topics/[topic]'s old layout; size="sm" (36px) is for compact rows,
 * e.g. the topic-page link sidebar.
 */
export default function LinkThumbnail({
  src,
  size = "md",
}: {
  src: string | null;
  size?: "md" | "sm";
}) {
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={`${sizeClass} flex-shrink-0 bg-black/5 dark:bg-white/5`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote, un-hosted images (see spec non-goals)
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${sizeClass} flex-shrink-0 object-cover`}
    />
  );
}
