---
title: "Hello, world"
description: "Why I'm starting to write about AI engineering: notes from building LLM products, what I plan to cover, and how this site is put together."
date: "2026-10-24"
tags: ["ai-engineering", "llms", "writing"]
draft: false
translationKey: "hello-world"
---

Every programmer's first program prints "Hello, world". It felt right to start writing the same way.

I'm Davi, an AI Engineer at Algar in Uberlândia, Brazil. Most of my days are spent turning large language models into software that people actually use, which is a very different job from getting a demo to work once. Along the way I keep collecting notes: things that worked, things that broke in surprising ways, and patterns I reach for again and again. This blog is where those notes will live.

## Why write

Writing forces clarity. If I can't explain why a retrieval pipeline returns the wrong chunk, I probably don't understand it yet.

AI engineering also moves fast, and a lot of what gets published sits at one of two extremes: launch-day hype or dense research papers. I want to write from the middle, as someone who ships LLM features and has to keep them working on Monday morning.

## What to expect

- **Building with LLMs**: prompts, tool calling, structured outputs, and how to make them reliable.
- **Retrieval (RAG)**: chunking, embeddings, search, and when retrieval is the wrong answer.
- **Agents**: when an agent loop earns its complexity, and when a plain function is better.
- **Evaluation**: how to know whether a change actually made things better.
- **Product and front end**: interfaces that make AI features feel trustworthy.

## A small example

A lot of useful LLM code is just a well-typed function around a model call. The interesting part is what happens _after_ the model answers:

```ts title="summarize.ts" {8-9}
import { z } from "zod";

const Summary = z.object({ title: z.string(), bullets: z.array(z.string()).max(5) });

export async function summarize(text: string) {
  const raw = await callModel({ system: "Summarize the text as JSON.", input: text });

  // Validate before the rest of the app sees it.
  return Summary.parse(JSON.parse(raw));
}
```

> Treat model output like user input: useful, but untrusted until validated.

## How this site is built

This site is a statically generated Next.js app, written in English and Portuguese, with posts as Markdown files in the repository. It also ships structured data so that search engines and AI assistants can understand who I am and what I write about. If you are reading this through an answer engine, hello to you too.

That's it for now. If you want to talk about AI engineering, send me an email at [davi16lacerda@gmail.com](mailto:davi16lacerda@gmail.com) or find me on [LinkedIn](https://www.linkedin.com/in/davi16lacerda/).
