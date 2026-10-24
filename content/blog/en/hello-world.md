---
title: "Hello, world"
description: "Why I'm starting to write about AI engineering, and what to expect here: agents, multi-agent systems, RAG, MCP, Azure AI and shipping GenAI to production."
date: "2026-10-24"
tags: ["ai-engineering", "agents", "writing"]
draft: false
translationKey: "hello-world"
---

Every programmer's first program prints "Hello, world". It felt right to start writing the same way.

I'm Davi, an AI Engineer at Algar in Uberlândia, Brazil. Most of my days are spent turning large language models into software that people actually use, which is a very different job from getting a demo to work once. Along the way I keep collecting notes: what worked, what broke in surprising ways, and the patterns I find myself reaching for again and again. This blog is where those notes will live.

## Why write

Writing forces clarity. If I can't explain why an agent picked the wrong tool, or why retrieval returned the wrong chunk, I probably don't understand it yet.

AI engineering also moves fast, and a lot of what gets published sits at one of two extremes: launch-day hype or dense research papers. I want to write from the middle, as someone who builds these systems and has to keep them working on Monday morning.

## What I'll write about

- **Agents**: tool calling, planning, and when an agent loop earns its complexity (and when a plain function is the better choice).
- **Multi-agent systems**: splitting work between specialized agents, orchestrating them, and keeping the whole thing debuggable.
- **RAG**: chunking, embeddings, retrieval quality, and when retrieval is the wrong answer.
- **MCP**: using the Model Context Protocol to connect models to real tools and data.
- **Azure AI**: building enterprise AI on Microsoft's stack, with security and governance in mind from day one.
- **Shipping GenAI to production**: evaluation, observability, cost and latency, and interfaces that make AI features feel trustworthy.

## One principle to start with

If one idea shows up in almost everything I build, it's this one:

> Treat model output like user input: useful, but untrusted until validated.

In code, that usually means a well-typed boundary right after the model answers:

```ts title="summarize.ts" {13-14}
import { z } from "zod";

const Summary = z.object({
  title: z.string(),
  bullets: z.array(z.string()).max(5),
});

export async function summarize(text: string) {
  const raw = await callModel({
    system: "Summarize the text as JSON.",
    input: text,
  });
  // Validate before the rest of the app sees it.
  return Summary.parse(JSON.parse(raw));
}
```

Small, boring and easy to test. A surprising amount of reliable AI software looks like this.

## Say hi

If you want to talk about AI engineering, email me at [davi16lacerda@gmail.com](mailto:davi16lacerda@gmail.com) or find me on [LinkedIn](https://www.linkedin.com/in/davi16lacerda/). To catch the next post, subscribe to the [RSS feed](/en/personal/blog/rss.xml).
