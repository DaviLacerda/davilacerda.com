---
title: "piecet #1: the pieces, the puzzle and the name"
description: "How piecet began: recording ideas and never finding them again, a jigsaw puzzle as a metaphor for life, and a name that had to fit."
date: "2026-11-24"
tags: ["piecet", "ios", "product", "design", "ai"]
draft: false
translationKey: "piecet-1"
series: "piecet"
kicker: "the piecet series, part 1"
accent: "#8b5cf6"
cover: "/images/blog/piecet-1/04-nasce-o-piet.webp"
mascot: true
---

I record voice notes about everything. An idea in the middle of the day, a possibility out of nowhere, a "what if we did it this way?". Recording was never the problem. The problem was [finding them later](scribble:underline).

That's where [piecet](brand:piecet) came from: an iPhone app that is days away from the App Store. This is the first post in a series about it. Here is where the idea came from, why everything in it is a puzzle piece and how it got its name, with pictures of the process, from the first sketch to the final brand.

## The itch

My ideas lived all over the place: loose voice notes, untitled notes, screenshots I never opened again. Everything kept, almost nothing findable. I didn't need one more place to write things down. I needed a place that would [put things together](scribble:double) for me.

The spark came from [Pool](brand:pool), an app that captures your screenshots first and sorts them out later. It stuck with me: what if that worked for everything? Text, voice, photos, video. You just drop it in, and the app works out on its own what goes with what.

## The first step was a bet

Before writing a single line, I made two bets. I signed up for [Claude](brand:claude) on the 20x plan, to have the room to really build. And I joined the [Apple Developer Program](brand:apple-developer), to test on my own iPhone instead of relying on the simulator for every change.

The first commit landed on November 7, [at 12:49 a.m.](note:) It was only the product spec and the project's rules, no code at all. Seventeen days later, the repository had 773 commits and about 197 pull requests.

## Before the app, the name

The first thing I made wasn't a screen. It was the name.

I wanted an image with two scales: each small thing you keep, and the whole that shows up once they connect, with the people, the places, the plans. Searching around, I landed on _pieces_, as in a jigsaw puzzle. The domain was taken.

So I looked at a brand that inspires me for the way it was made: [Vivet](brand:vivet), Kai Cenat's. I put _piece_ and _it_ together. [piece it](scribble:circle): make it fit. That's **piecet**.

> Sometimes a piece is hard to fit. But when it fits, the picture turns out beautiful.

That's how I see life, and it became the idea behind the app. I bought the domain and went off to draw the icon.

## Everything is a piece

In piecet, everything you keep is a piece: a note, a voice memo, a photo, a video. When several pieces are about the same person, the same trip or the same plan, the app fits them into a puzzle on its own. Two pieces already start a puzzle, and every new piece shows a little more of the picture.

The metaphor had to live in the interface, not just the name. Even the joint was redrawn on the 9th: the piece's head grew and its neck got narrower, like a real jigsaw. It looks like a detail, but it's what makes a piece look like it fits.

![The outline of one side of a piece: before, dashed and smaller; after, in ink, with a rounder head and a narrower neck](/images/blog/piecet-1/07b-encaixe-das-pecas.webp "the joint: dashed, before; in ink, after.")

## Piet

The app needed someone. A presence that would be the face of the brand, the way Pumpy is for [FitFolio](brand:fitfolio), and like the mascots of the AI products I keep an eye on. So I made a puzzle piece with a face.

The first sketches came out of [ChatGPT](brand:chatgpt): still blue, the face not right yet. He started out as Pip and later became **Piet**.

![Three mascot sketches: a smiling blue piece, the same piece with big eyes, and a grid of face variations in several colours](/images/blog/piecet-1/02-primeiros-rascunhos-do-mascote.webp "the first sketches, before the face was right.")

Here's the funny part: the spec I wrote that same night said, in so many words, _no blob mascots_. That afternoon, Piet was born. (He's right there on the side, keeping you company while you read.)

![Purple Piet in four forms: a loose piece, a square icon and two smaller versions](/images/blog/piecet-1/04-nasce-o-piet.webp "November 7, afternoon: Piet is born.") ![The final piecet brand: the round icon with Piet's face and the wordmark, light and dark](/images/blog/piecet-1/16-marca-final.webp "and the final brand, November 23.")

## From the first screens to Piet at the center

The first screens covered the basics: keep a piece, record, find. The first simulator build came out on the morning of the 7th, in a look I called _Instrument_: burnt orange, and no mascot at all.

Once Piet showed up, it was clear the whole app had to revolve around him. That same night I redesigned everything: purple, real puzzles in the interface and a first screen that says [Hi, I'm Piet.](scribble:underline)

![The first build in the simulator, with the orange Instrument look and no mascot](/images/blog/piecet-1/03-primeiro-build.webp "morning: the first build, no Piet yet.") ![Fourteen redesigned screens built around Piet: welcome, capture, recording, puzzles, search and settings](/images/blog/piecet-1/05-redesign-com-o-piet.webp "night: the whole redesign, built around him.")

## Taste can be trained

If this process taught me one thing, it's that [taste](scribble:circle) makes all the difference: taste in UI and UX, and good references at hand. [X](brand:x) became my main source. Its Explore tab puts the work of designers from all over the world in front of you, every day.

In the early hours of the 7th, before any code, I gathered the 585 images I had liked on X and studied screens from them. What made that possible was the Grok bot, which gives free access to the X API: it's how I pulled all my likes in one go. That study produced three directions: _Ledger_, _Print_ and _Instrument_.

![A screen study made from images liked on X, with many iPhone screens side by side](/images/blog/piecet-1/01-estudo-de-telas.webp "the early hours of the 7th: screens from my likes on X.")

From there, it was refining. I used Claude to research and iterate on prototypes, with [Emil Kowalski](brand:emil-kowalski)'s skills guiding every animation, until the interface looked like the puzzle I had in mind.

## All on your iPhone

I wanted everything I was missing in one app: puzzles that build themselves, text, voice, photos and video in one place, and search that runs [on the device itself](scribble:underline), with no remote AI to pay for.

Apple's ecosystem helps a lot here. Besides Apple's own models, I curated a few open-source models that run right there, on the iPhone. No account and no server: your pieces stay on your device and in your iCloud. You can see all of it at [piecet.com](https://piecet.com).

## The next piece

So far I've told you the why. The next post is the how: 773 commits in 17 days, from a spec written in the middle of the night to an app for iPhone, iPad, Mac and Apple Watch. How I worked with Claude [one pull request at a time](scribble:underline), what I handed over to it, what I never did, and what went wrong along the way.

If you'd like to know when it's out, subscribe to the [RSS feed](/en/personal/blog/rss.xml) or find me on [LinkedIn](https://www.linkedin.com/in/davi16lacerda/).
