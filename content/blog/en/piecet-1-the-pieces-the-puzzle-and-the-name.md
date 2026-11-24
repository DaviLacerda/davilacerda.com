---
title: "piecet #1: the pieces, the puzzle and the name"
description: "How piecet began: recording ideas and never finding them again, a jigsaw puzzle as a metaphor for life, and a name that had to fit."
date: "2026-11-24"
tags: ["piecet", "ios", "product", "design", "ai"]
draft: false
translationKey: "piecet-1"
kicker: "the piecet series, part 1"
accent: "#8b5cf6"
cover: "/images/blog/piecet-1/04-nasce-o-piet.webp"
---

I record voice notes about everything. An idea in the middle of the day, a possibility out of nowhere, a "what if we did it this way?". Recording was never the problem. The problem was [finding them later](scribble:underline).

This is the first post in a series about [piecet](brand:piecet), the app I've been building these past few weeks, which is about to launch. Here is where the idea came from, why everything in it is a puzzle piece and how it got its name. With pictures of the process, from the first sketch to the final brand.

## The itch

My ideas lived all over the place: loose voice notes, untitled notes, screenshots I never opened again. Everything kept, almost nothing findable. I didn't need one more place to write things down. I needed a place that would [put things together](scribble:double) for me.

The spark came from [Pool](brand:pool), a screenshots app. It captures first and organizes later. I kept thinking: what if that worked for everything? Text, voice, photos, video. You drop it in, and the app works out what relates to what.

## The first step was a bet

Before a single line of code, I did two things. I subscribed to [Claude](brand:claude) Ultra, the 20x plan, to have the room to really build. And I joined the [Apple Developer Program](brand:apple-developer), so I could test on my own iPhone without rebuilding after every change.

The first commit landed on November 7, [at 12:49 a.m.](note:) It held only the product spec and the project's rules. No code yet. By the 24th there were 773 commits and about 197 pull requests.

## Before the app, the name

The first thing I made wasn't a screen. It was the name.

I wanted an analogy with a small part and a bigger whole: each thing you keep, and the cluster that forms when they relate, with the pictures, the people, the places. Searching, I landed on _pieces_, as in the pieces of a puzzle. But the domain was taken.

So I looked at one of the brands that inspire me most for how it was made: [Vivet](brand:vivet), Kai Cenat's brand. And I put two words together. _Piece_ and _it_. [piece it](scribble:circle). To fit together. That's **piecet**.

> Sometimes it's hard to make a piece fit. But when it does, the picture is beautiful.

It's how I see life, and it became the concept of the app. I bought the domain and started drawing the icon.

## Everything is a piece

In piecet, everything you keep is a piece: a note, a voice memo, a photo, a video. When several pieces are about the same person, the same trip or the same plan, the app fits them into a puzzle on its own. A puzzle starts at two pieces, and every new one fills in a bit more of the picture.

The metaphor had to live in the interface, not just in the name. So even the joint between pieces was drawn with care: a round head on a narrow neck, like a real jigsaw.

![The board's piece joints before and after the tweak: a larger head and a narrower neck](/images/blog/piecet-1/07b-encaixe-das-pecas.webp "the joint, before and after. November 9.")

## Piet

To me, the app needed a mascot. Someone to be the brand's presence, the way Pumpy is for [FitFolio](brand:fitfolio), and like the mascots of other AI products I keep an eye on. So I made a puzzle piece with a face.

The first sketches came out of [ChatGPT](brand:chatgpt). Still blue, the face not quite right. It started out as Pip and later became **Piet**.

![Three mascot sketches: a smiling blue piece, the same piece with big eyes, and a grid of faces in many colours](/images/blog/piecet-1/02-primeiros-rascunhos-do-mascote.webp "the first sketches, before the face was right.")

Here's the funny part: the spec I wrote that same night said, in so many words, _no blob mascots_. That afternoon, Piet was born.

![The purple Piet in four forms: a loose piece, a square icon and two smaller versions](/images/blog/piecet-1/04-nasce-o-piet.webp "November 7, afternoon: Piet is born.") ![The final piecet brand: the round icon with Piet's face and the wordmark, in light and dark](/images/blog/piecet-1/16-marca-final.webp "and the final brand, November 23.")

## From the first screens to Piet at the center

The first screens covered the basics: add a piece, record, find. The first build in the simulator came out on the morning of the 7th, in a look I called _Instrument_: burnt orange, no mascot at all.

Once Piet showed up, it was clear the whole app had to revolve around him. That same night I redesigned everything: purple, real puzzles in the interface and a first screen that says [Hi, I'm Piet.](scribble:underline)

![The first build in the simulator, in the orange Instrument look with no mascot](/images/blog/piecet-1/03-primeiro-build.webp "morning: the first build, still no Piet.") ![Fourteen screens of the redesign around Piet: welcome, capture, recording, puzzles, search and settings](/images/blog/piecet-1/05-redesign-com-o-piet.webp "night: the whole redesign around him.")

## Taste can be trained

If this process taught me one thing, it's that [taste](scribble:circle) makes all the difference: taste in UI and UX, and good references at hand. [X](brand:x) has become a key source for that. Its Explore tab puts the work of designers from all over the world in front of you, every day.

In the early hours of the 7th, before any code, I took the 585 images I had liked on X and studied screens from them. Three directions came out of it: _Ledger_, _Print_ and _Instrument_.

![A study of screens drawn from the images liked on X, with many iPhone screens side by side](/images/blog/piecet-1/01-estudo-de-telas.webp "the early hours of the 7th: screens from my likes on X.")

From there, it was refining. I used Claude to research and to iterate on prototypes, with [Emil Kowalski](brand:emil-kowalski)'s skills guiding every animation, until the interface had the puzzle feel I wanted.

## All on your iPhone

I wanted everything I'd been missing in one app: puzzles that build themselves, a place for text, voice, photos and video, and search across all of it [on the device itself](scribble:underline), without paying for remote AI.

Being in Apple's ecosystem helps a lot here. And besides Apple's own models, I curated a few open-source models to run right there, on the iPhone. No account, no server: your pieces stay on your device and in your iCloud.

> [!note] Coming up in the series
> piecet is nearly out of the oven, and the series goes on:
>
> - how I built the whole app with Claude, one pull request at a time;
> - the testing;
> - what it took to get it on the App Store;
> - and the launch marketing.

To follow along, subscribe to the [RSS feed](/en/personal/blog/rss.xml) or find me on [LinkedIn](https://www.linkedin.com/in/davi16lacerda/). The next piece is on its way.
