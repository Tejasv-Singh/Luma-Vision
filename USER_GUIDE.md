# Luma Vision — User Guide

This guide is for people **using** Luma Vision to analyse matches. If you're setting up or extending
the app, see [README.md](./README.md) instead.

---

## Contents

- [Getting started](#getting-started)
- [Uploading a match](#uploading-a-match)
- [Reading your results](#reading-your-results)
  - [Overview](#overview)
  - [Shot Analysis](#shot-analysis)
  - [Court Coverage](#court-coverage)
  - [Shuttle Data](#shuttle-data)
  - [Player Pose](#player-pose)
- [Video review](#video-review)
- [Exporting a report](#exporting-a-report)
- [Comparing matches](#comparing-matches)
- [Match history](#match-history)
- [Player profile](#player-profile)
- [Display settings](#display-settings)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Troubleshooting](#troubleshooting)
- [How to read the numbers](#how-to-read-the-numbers)

---

## Getting started

Open the app and you'll land on the **Dashboard**. The top bar has four sections:

| Section | What it's for |
| --- | --- |
| **Dashboard** | Upload a video and read the full analysis |
| **History** | Every analysis you've saved — search, sort, reopen, delete |
| **Compare** | Put two or three matches side by side |
| **Player** | Aggregate stats across all your analysed matches |

The app ships with six example analyses already loaded, so you can explore every screen before
uploading anything of your own.

> **Look for the ⓘ icons.** Most metrics have a small circled "i" next to their label. Hover it — or
> tab to it and it opens on focus — for a plain-language explanation of what that number measures and
> which direction is good.

---

## Uploading a match

**Drag a video file onto the upload area**, or click it to browse.

| | |
| --- | --- |
| **Accepted formats** | `.mp4`, `.mov`, `.avi`, `.webm` |
| **Maximum size** | 2 GB per file |
| **Multiple files** | Yes — drop several at once and they queue up |

### What happens next

Your file moves through four stages, shown live in the **Upload queue** panel beside the drop area:

1. **Uploading** — the progress bar tracks bytes sent.
2. **Queued** — upload finished, waiting for a pipeline slot.
3. **Analyzing** — the bar now tracks analysis progress, and the label names the current stage
   (decoding video, detecting court, tracking shuttle, estimating pose, classifying shots,
   aggregating statistics).
4. **Complete** — a **View analysis** button appears. Click it to open the results.

### Controls on each queued item

- **Cancel** — stops an upload or analysis in progress. Cancelling one file doesn't affect the others.
- **Retry** — reruns a failed or cancelled job. If the file already uploaded, only the analysis
  reruns; you don't re-upload the video.
- **Dismiss** — removes a finished row from the list. This doesn't delete the analysis; it's still in
  History.
- **Clear finished** (top of the panel) — dismisses every completed, failed and cancelled row at once.

### If a file is rejected

You'll get a notification explaining exactly why — wrong format, empty file, or over the size limit
(the message tells you both the limit and your file's actual size). Rejected files never start
uploading, so nothing is wasted.

---

## Reading your results

Once an analysis is open, the match header shows the title, tournament, round, date and scoreline.
Below it are five tabs. Click them, or use **← / →** to move between them once one is focused.

### Overview

**The 30-second read on the match.**

Four headline cards across the top:

| Card | What it tells you |
| --- | --- |
| **Total shots** | Every stroke detected for the player, across all rallies |
| **Avg rally duration** | Mean time from serve to point ending — elite singles typically runs 5–9 s |
| **Court coverage** | How much of the court was genuinely defended |
| **Shot accuracy** | Share of shots that landed in play and hit their intended target |

Below that:

- **Match statistics** — twelve tiles covering points won and lost, unforced and forced errors,
  winning shots, recovery shots, net kills, faults, longest streak and distance covered. Three
  progress bars underneath show the ratios that matter most: points won vs. lost, winners vs. errors,
  and how much of the match was actually live play.
- **Performance summary** — a short written read on the match, plus bullet-point highlights.
- **Video & match metadata** — filename, duration, resolution, frame rate, codec and file size.

### Shot Analysis

**Which shots you play, and which ones work.**

Six cards along the top — Smash, Clear, Drop, Drive, Net Shot, Serve — each showing the count, what
share of your total that is, and its success rate.

> **Click any shot card to highlight it** in the distribution chart below. Click it again to clear.
> You can also click a row in the breakdown table to do the same thing.

- **Shot distribution** — a bar per shot type. All bars share one colour; the highlighted one is
  whichever you selected, *not* the largest. This is deliberate: bar height already shows you which is
  biggest, so colour is free to show you what you're focused on.
- **Shot consistency** — a 0–100 score blending success rate, error clustering and speed variance,
  with specific coaching tips underneath.
- **Most used** and **Most effective** — these are often different shots, and the gap between them is
  usually the most actionable thing on this tab. If your most-used shot isn't your most effective one,
  there's a shot selection conversation to be had.
- **Shot-by-shot breakdown** — a sortable table with count, share, success rate, average speed,
  winners and errors. Click any column header to sort by it.

### Court Coverage

**Where you actually spent the match.**

The heatmap is your half of the court, split into 16 zones, viewed from above. **The net is at the
bottom** (marked with a gold line); the backcourt is at the top.

- **Darker cells mean less time spent there; brighter gold means more.** The scale bar under the
  court shows the range, and each cell prints its own percentage.
- **Hover a zone** — or tab through them with the keyboard — and the panel below the court shows that
  zone's dwell percentage, visit count, average dwell time and shots played.
- **Trajectory** button toggles the movement trace: a thin line following your path, with a gold dot
  marking your average base position. If that dot sits well off centre, you're recovering to the
  wrong place.

Beside the court:

- **Court usage by third** — frontcourt, midcourt and backcourt time shares, with a written read
  underneath. A midcourt-heavy profile usually means efficient recovery to base; a backcourt-heavy one
  often means you're losing the length exchange.
- **Movement** — total distance, average speed, zones used, and hot zones. A high hot-zone count can
  mean you're being pulled out of position repeatedly.

The **Zone-by-zone breakdown** section at the bottom (click to expand) has the same data as a sortable
table — useful when you want exact numbers rather than a visual impression.

### Shuttle Data

**How the shuttle behaved.**

Four headline cards: peak velocity, average velocity, net clearance and landing accuracy.

- **Net clearance** is the one to watch. A low number (under ~30 cm) means you're playing tight and
  attacking; a high number is safer but gives your opponent more time.
- **Velocity over time** charts shuttle speed across the match, with a horizontal rule marking the
  match average. Hover any point for that moment's velocity and shuttle height. Sustained decline in
  the third game is a conditioning signal.
- **TrackNetV3 detection** shows how confident the shuttle tracker was, and how many frames it found
  the shuttle in.

> **Check the confidence score before trusting the rest of this tab.** Below roughly 85%, treat the
> velocity and trajectory figures as indicative rather than precise. Dropped frames cluster around
> fast smashes and moments where your body hides the shuttle from the camera.

- **Flight characteristics** covers average and longest flight time, average and max height, spin, and
  the spread between peak and average velocity. A wide spread means a varied, deceptive shot mix.

### Player Pose

**Your biomechanics.**

Four headline cards: footwork rating, stance stability, average reaction time and keypoint confidence.

> **Reaction time is the one metric here where lower is better.** Its progress bar is inverted to
> match — a fuller bar still means a better result, as everywhere else in the app.

- **Forehand vs backhand** — shot volume and accuracy per side, charted and as cards. The
  **accuracy gap** callout underneath is the headline: a gap wider than about 12 points is exploitable,
  and you should expect opponents to target the weaker side under pressure.
- **Technique quality** — follow-through consistency, stance stability and footwork, as bars.
- **Timing** — average and fastest reaction, average recovery time, and the number of strokes the
  model could analyse. Coaching notes appear underneath.

**Keypoint confidence** works like the shuttle tracker's confidence score: it tells you how reliable
everything else on the tab is. Low values usually mean the player was occluded or the footage had
motion blur.

---

## Video review

Click **Video review** in the match header to open the player.

- **Play/pause**, and step **one frame at a time** in either direction.
- **Analysis overlay** toggle draws detected events onto the frame, with the current timecode and
  frame number.
- **The scrubber** marks every event in the match: gold for shots, green for points, red for faults.
  Drag it to seek anywhere.
- **Event chips** below the scrubber list what's happening near the playhead. Click one to jump
  straight to it.

> **Video playback only works in the session you uploaded in.** If you reload the page and reopen an
> older analysis, all the statistics are still there, but the player will tell you the video source is
> no longer available. Re-upload the file if you need to review the footage again.

---

## Exporting a report

Click **Export PDF** in the match header. The report covers every tab — key metrics, the written
summary, match statistics, a shot breakdown table, coverage, shuttle tracking, pose analysis and
source video details — and saves to your downloads as `luma-vision-<match-name>.pdf`.

The PDF is real text, not a screenshot, so it's searchable, selectable and small enough to email.

---

## Comparing matches

Go to **Compare**. The two most recent analyses are selected automatically.

1. **Click match cards to select or deselect them.** You can compare up to three at once — past that,
   grouped bars stop being readable.
2. Each selected match gets a coloured dot, and that colour follows it consistently through every
   chart and table on the page.
3. **Normalised metrics** charts the measures that share a 0–100 scale, so one axis is enough to
   compare them honestly.
4. **Metric by metric** is the full table. The best value in each row is highlighted in gold and
   labelled **best**.

> Rows where a *lower* number is better — unforced errors, average reaction time — are labelled
> "(lower is better)", and the winner highlighting accounts for this. The best value in those rows is
> the smallest one.

Raw counts and times (total shots, distance, peak velocity) appear only in the table, not the chart.
Putting measures with wildly different scales on one chart would invent comparisons that aren't real.

---

## Match history

Every completed analysis is saved automatically.

- **Search** by match name or tournament.
- **Sort** by recently analysed, match date, accuracy, coverage, total shots, or title. You can also
  click any table column header to sort by it.
- **Open** loads the full analysis into the dashboard. Clicking anywhere on the row does the same.
- **Delete** takes two clicks: the button changes to **Confirm?**, and you have about four seconds to
  confirm before it resets. This is deliberate — deletion is permanent.

---

## Player profile

An aggregate view across your analysed matches (up to the twelve most recent): career averages for
accuracy, coverage and footwork, your fastest recorded shuttle, a list of every analysed match, and
career totals. Click any match in the list to open its full analysis.

---

## Display settings

Click the **gear icon** in the top-right.

Luma Vision is dark-only by design — analysis screens are usually read in dim rooms, and a light theme
would wash out the heatmap and chart colours. Instead you get controls to tune the dark theme to your
actual environment:

- **Brightness** — dim, balanced, or bright.
- **Contrast** — soft, standard, or high.
- **Reduce motion** — turns off transitions and animations.

Your choices are remembered between visits. **Reset to defaults** puts everything back.

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause the video |
| `←` `→` | Step one frame back / forward |
| `Shift` + `←` `→` | Step one second back / forward |
| `←` `→` | Move between analysis tabs (when a tab is focused) |
| `Home` / `End` | Jump to the first / last analysis tab |
| `Tab` | Move through controls, including individual heatmap zones |
| `Esc` | Close an open tooltip |

Video shortcuts are ignored while you're typing in a search box, so they never interfere with the
History search.

---

## Troubleshooting

**"Unsupported format" when I drop a file**
Luma Vision accepts `.mp4`, `.mov`, `.avi` and `.webm`. If your file is one of these and still gets
rejected, check the extension is actually on the filename — some systems hide it.

**My upload was rejected for size**
The limit is 2 GB per file. The error message tells you your file's actual size. Trim the footage to
the match itself, or ask whoever set up your installation to raise the limit.

**The analysis says "still running" when I open it**
The pipeline hasn't finished. Watch the upload queue on the dashboard — the stage label tells you what
it's working on. Results appear automatically when it completes.

**Video review says the source isn't available**
Expected after a page reload. Statistics persist, but the video itself doesn't. Re-upload the file to
review footage.

**A section shows an error instead of content**
Click **Try again**. Errors are contained to the section that hit them, so the rest of the dashboard
keeps working. If it persists, use **Refresh** in the match header to re-fetch the analysis.

**Numbers look wrong**
Check the confidence scores first — **TrackNetV3 detection** on the Shuttle tab, and **keypoint
confidence** on the Pose tab. Low values there mean poor footage quality (occlusion, motion blur, an
awkward camera angle), and everything downstream inherits that uncertainty.

**I deleted something by accident**
Deletion is permanent — there's no undo. That's why it takes two clicks.

---

## How to read the numbers

**Everything here is a model estimate.** Luma Vision infers shot types, court positions, shuttle
trajectories and body mechanics from video. It's a fast way to find patterns worth examining — it is
not ground truth. Before you make a coaching decision on any figure, watch the relevant passage in
Video review and confirm it says what the number says.

Three habits that make the analysis more useful:

1. **Check confidence scores before trusting a tab.** Detection confidence and keypoint confidence
   tell you how much weight the rest of that tab can carry.
2. **Look for gaps, not absolutes.** The forehand/backhand accuracy gap, the difference between your
   most-used and most-effective shot, the split between front and back court — these are more
   actionable than any single score, and far more robust to estimation error.
3. **Compare across matches.** One match is a data point; the Compare and Player screens are where
   trends show up. A footwork rating of 74 means little alone, but 74 down from 85 means something.
