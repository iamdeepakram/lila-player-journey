# Insights from the player-journey tool

All three were found by using the app (filters + heat + playback) and then counting the same slice in `public/data`. Dates are UTC from match `t0`. February 14 is partial; none of these claims depend on treating it as a full day.

---

## 1. This slice is a PvE extraction game, not a BR

**What caught the eye.** Almost every match dropdown row is `1H / 0B` or `1H / nB`. You almost never see two humans.

**Evidence.** 796 matches: **779 with exactly one human**, **16 with zero humans** (bot-only files), **1 with two humans**. That is not a battle-royale lobby. Kills still happen (605 matches have at least one kill) because humans fight **bots** (`BotKill` on the human file). Many of those matches have no bot trajectory files, so the heatmap of “bot paths” understates how much PvE combat exists.

**Why a level designer should care.** Layout that assumes third-parties, rotating circles, or mid-map PvP arenas will not match how people actually play. Combat teaching is bot placement, loot routes, and timing — not player density.

**Actionable.** Treat bot encounter chains as the FTUE and mid-game. Instrument **human–human encounters per match** and **time-to-first-bot-fight**. If PvP is a design goal, the playlist or matchmaker is failing, not the cover layout. Metrics: PvP encounter rate, bot-kill rate, session length, return rate after first death.

**Where in the tool.** AmbroseValley · 2026-02-10 · scan the Match list; open the default `1H / 6B · 382s` match and Play.

---

## 2. The east of Ambrose Valley is unused

**What caught the eye.** Traffic heat on Ambrose Valley stops before the right edge of the minimap. Roads and compounds on the east are empty.

**Evidence.** Across all days, Ambrose Valley human traffic occupies **1,556 / 4,096** grid cells (38%). Cell `ix` runs **3–47** on a 0–63 grid — **no traffic with `ix ≥ 48`**, i.e. the eastern ~25% of the image has **0%** of recorded human mass. Left third of the grid holds 42% of traffic, middle 58%, right 0%. Grand Rift and Lockdown do use a wider `ix` range (up to 59 and 52).

**Why a level designer should care.** That is art, collision, and landmark budget nobody walks. Either the storm / extract / loot table never pulls players east, or the west spawn-to-loot path is too rewarding to leave.

**Actionable.** Move a loot cluster or extract toward the east, or cut the unused side. A/B: **share of sessions with any position `ix ≥ 48`**, path length, extract success (not in this dataset — would need an extract event), session duration. If east traffic stays at ~0, stop spending on that wing.

**Where in the tool.** Map = AmbroseValley, any date, leave **Traffic heat** on. Compare Lockdown on the same date — heat reaches farther across the image.

---

## 3. The storm is not the thing that kills players

**What caught the eye.** Storm-death heat is a few isolated cells, not a sweeping front. Playback of typical matches ends in a bot death or simply stops, not a storm wall.

**Evidence.** **39 storm deaths** vs **739** recorded deaths (**5.3%**). Only **39 / 796 matches (4.9%)** have any storm death. On Ambrose Valley that is **3.0%** of matches; on Lockdown **9.9%**; Grand Rift **8.5%**. Storm cells on the all-time AV heat: 17. The storm is not teaching the map at the scale of the main playlist.

**Why a level designer should care.** If the one-way storm is supposed to force rotate-and-extract, players are dying to bots (or leaving) first. A weak storm makes the east of Ambrose Valley even easier to ignore (insight 2). A late storm on Lockdown shows up more because the map is small.

**Actionable.** Tighten storm timing on Ambrose Valley, or telegraph the front more clearly (audio/VFX/minimap). Watch **storm-death %**, **time-to-storm-death**, and **extract rate**. Target: storm deaths should form a **band** on the heat layer, not 17 scattered pixels. Do not use Feb 14 for a before/after without noting it is partial.

**Where in the tool.** Same AV match with **Storm death zones** on (almost empty), then Lockdown · 2026-02-10 with the same layer. Playback on a long AV match (duration ~700s+, `storm_deaths` in the header is rare).

---

## What the data cannot say

There is **no extract event**, so “loot on the way to extract” is still an inference. Bot files are missing in most matches, so bot-path heat is incomplete. Dates are UTC from Unix `t0`, not folder names.
