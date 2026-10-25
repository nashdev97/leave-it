---
title: Leave It: a local Gemma that tells you what not to do
published: false
tags: devchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)*

## What I Built

Leave It is a local web app for the guilt pile: unreplied chats, a renewal, a folder you meant to tidy. You paste one item per line. Gemma 3 4B, running through Ollama on your machine, marks each line leave, two minutes, or later, and writes the two-minute step when silence would cost you.

The person who gets to be lazier is you. Likes and optional tidying are supposed to be left alone. An expired domain is not. Lines marked later do not count as time saved, because you still owe them.

## Demo

Local only, on purpose. With Ollama running and `gemma3:4b` pulled:

```bash
npm start
```

Open http://127.0.0.1:8787 and use the sample pile. A four-line sort took about three minutes on the machine this was built on. There is no hosted demo. The page is a lined list, and an earlier pile reopens without another sort.

## Code

https://github.com/nashdev97/leave-it

## How I Built It

Node 22 serves a single page and talks to Ollama at `127.0.0.1:11434`. The open-weight model is Gemma 3 4B (`gemma3:4b`). The request sends a JSON schema with `minItems` and `maxItems` equal to the number of lines, so constrained decoding has to return one object per line. A 1B Gemma mostly copied the line back as the reason, so the default is the 4B tag.

After the model answers, the app rejects a reason that is just the line copied verbatim, and it rejects a two-minute move that is a single word. If that happens it asks the model once more. A separate guardrail can only make a verdict stricter: words such as `expired`, `overdue`, `invoice`, `landlord`, and `leak` promote `leave` or `later` to `two_minute`. It cannot mark an urgent line as safe.

History is a gitignored JSON file, last 50 runs. No account, no database server, no hosted model.

Verified twice with `gemma3:4b`. The script sample deferred Saturday dinner, likes, and the downloads folder, and the guardrail turned the expired domain into a two-minute renewal. The browser sample added "Send the landlord the leak photo from Tuesday". That run still marked the leak `later`, because the guardrail did not know `landlord` or `leak` yet. Those two words are in the guardrail now. Ten unit and server tests passed after that change. Sort the sample again to see the leak promoted.

## Why Does Open Innovation Matter?

The pile is personal. A hosted chat API would mean sending unreplied messages and renewals to someone else's log. Gemma's weights are open, Ollama runs them on the laptop, and the server binds to loopback. There is no per-token bill, so leaving a pile unsorted until you feel like it does not cost money. The 1B and 4B tags are swappable with one environment variable when a smaller model starts echoing instructions, which is exactly what the 1B tag did here.

## The Lazy Payoff

On the sample pile the 4B model deferred three of four lines and the guardrail kept the expired domain from being ignored. Later does not count as minutes saved, and the model estimated the careful version of the domain at one minute, so the minute counter stayed at 0. The lazy payoff on that run is three things you are not doing now, plus one renewal you cannot pretend to forget. A four-line sort took about three minutes, which is still less than rereading the same list all week.

## Prize Categories

- Best Use of Gemma

<!-- Thanks for participating! -->
