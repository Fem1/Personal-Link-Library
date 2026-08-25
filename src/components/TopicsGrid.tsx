"use client";

import { useState } from "react";
import Link from "next/link";
import { UNCATEGORIZED_TOPIC } from "@/lib/constants";
import MergeTopicButton from "./MergeTopicButton";

interface TopicCount {
  topic: string;
  count: number;
}

export default function TopicsGrid({
  initialTopics,
}: {
  initialTopics: TopicCount[];
}) {
  const [topics, setTopics] = useState<TopicCount[]>(initialTopics);

  // Same removal-on-success pattern as delete/move elsewhere, plus bumping
  // (or creating) the target's card so merged links don't appear to vanish
  // until the next reload.
  function handleMerged(sourceTopic: string, targetTopic: string, moved: number) {
    setTopics((prev) => {
      const withoutSource = prev.filter((t) => t.topic !== sourceTopic);
      const targetExists = withoutSource.some((t) => t.topic === targetTopic);
      if (targetExists) {
        return withoutSource.map((t) =>
          t.topic === targetTopic ? { ...t, count: t.count + moved } : t
        );
      }
      return [...withoutSource, { topic: targetTopic, count: moved }];
    });
  }

  if (topics.length === 0) {
    return (
      <p className="text-sm text-black/40 dark:text-white/40">
        No topics yet.{" "}
        <a href="/add" className="underline">
          Add a link
        </a>{" "}
        to get started.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {topics.map(({ topic, count }) => (
        <div
          key={topic}
          className={`rounded-lg border p-4 transition-colors hover:border-black/30 dark:hover:border-white/30 ${
            topic === UNCATEGORIZED_TOPIC
              ? "border-black/10 border-dashed dark:border-white/10"
              : "border-black/10 dark:border-white/10"
          }`}
        >
          <Link href={`/topics/${encodeURIComponent(topic)}`} className="block">
            <div className="font-medium">{topic}</div>
            <div className="mt-1 text-sm text-black/50 dark:text-white/50">
              {count} {count === 1 ? "link" : "links"}
            </div>
          </Link>
          <div className="mt-2">
            <MergeTopicButton
              topic={topic}
              count={count}
              otherTopics={topics
                .map((t) => t.topic)
                .filter((t) => t !== topic)}
              onMerged={handleMerged}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
