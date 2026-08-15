"use client";

import { useState } from "react";

/**
 * Fixed-size thumbnail for a link's article image. Falls back to a plain
 * placeholder when there's no image_url, or when the remote image URL
 * fails to load (source pages aren't guaranteed to keep serving it).
 */
export default function LinkThumbnail({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className="h-28 w-28 flex-shrink-0 rounded-md bg-black/5 dark:bg-white/5"
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
      className="h-28 w-28 flex-shrink-0 rounded-md object-cover"
    />
  );
}
