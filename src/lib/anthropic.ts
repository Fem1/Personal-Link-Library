import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

const MODEL = "claude-opus-5";

// Roughly caps how much scraped text we send per link so a topic with many
// long articles doesn't blow the context window in the chat endpoint.
const MAX_CHARS_PER_LINK = 6000;

function firstNWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(" ");
}

/**
 * Ask Claude to assign a scraped page to an existing topic, or propose a
 * new concise (1-3 word) topic name.
 */
export async function categorizeLink(params: {
  title: string;
  description: string | null;
  fullText: string;
  existingTopics: string[];
}): Promise<string> {
  const { title, description, fullText, existingTopics } = params;
  const client = getClient();

  const topicsList =
    existingTopics.length > 0
      ? existingTopics.map((t) => `- ${t}`).join("\n")
      : "(none yet — this will be the first)";

  const prompt = `Here's a page that was just saved:

Title: ${title}
Description: ${description || "(none)"}
First ~2000 words of content:
${firstNWords(fullText, 2000)}

Existing topics:
${topicsList}

Assign this page to the single best-fitting existing topic, or if nothing fits well, propose a new concise topic name (1-3 words, title case, e.g. "Distributed Systems" or "Home Cooking").

Respond with ONLY the topic name, nothing else — no punctuation, no explanation.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 50,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content.find((b) => b.type === "text");
  const topic = block?.type === "text" ? block.text.trim() : "";

  return topic || "Uncategorized";
}

export interface TopicChatLink {
  id: number;
  title: string | null;
  url: string;
  full_text: string | null;
}

/**
 * One-shot (non-conversation-persisted) chat call scoped to a topic's links.
 */
export async function chatAboutTopic(params: {
  topic: string;
  links: TopicChatLink[];
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}): Promise<string> {
  const { topic, links, history, message } = params;
  const client = getClient();

  // Numbered in the same order getLinksByTopic returns them, which is the
  // same order/query the topic page's sidebar renders from — so these
  // numbers already line up with what the user sees there.
  const context = links
    .map((link, i) => {
      const body = (link.full_text || "").slice(0, MAX_CHARS_PER_LINK);
      return `[${i + 1}] "${link.title || link.url}" (${link.url})\n${body}`;
    })
    .join("\n\n---\n\n");

  const system = `You are a sparring partner for the topic "${topic}". Answer only using the content of the links below. Cite which link(s) you're drawing from.

When citing a source, reference it by its number as a markdown link to its exact URL from below — e.g. [3](https://example.com/article) — not as plain text like "Link 3" or "[3]" alone. The number in brackets IS the link text; the URL must exactly match the one given for that numbered source.

Keep answers short and direct — a few sentences by default, not paragraphs. Skip preamble/hedging ("Based on the links provided..." etc) — just answer. Use bullet points only when listing multiple distinct things; otherwise plain sentences. If the question is broad and a fuller answer is genuinely needed, it's fine to go longer — but default to brief.

${context}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    // Low reasoning effort: this is grounded retrieval/synthesis over a
    // handful of provided links, not a task that benefits from heavy
    // deliberation — and without capping it, thinking tokens can eat
    // most or all of max_tokens before any visible answer is written
    // (observed: an 1024-max_tokens call spending 1349 tokens thinking
    // and returning an empty reply). Same pattern as categorizeLink.
    output_config: { effort: "low" },
    system,
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}
