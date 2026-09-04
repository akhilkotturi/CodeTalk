---
name: CodeTalk
description: A warm editorial incident room built for clear thinking under pressure.
colors:
  charcoal-ink: "#22221f"
  muted-ink: "#6d6a61"
  warm-paper: "#f3f1ea"
  deep-paper: "#e9e6dc"
  lifted-paper: "#faf8f2"
  quiet-rule: "#cbc7bb"
  strong-rule: "#99958a"
  signal-ember: "#c6492d"
  deep-ember: "#96341f"
  ember-wash: "#f4ded6"
  resolved-moss: "#4f735b"
typography:
  display:
    fontFamily: "Manrope Variable, Helvetica Neue, sans-serif"
    fontSize: "clamp(3.6rem, 7.6vw, 7rem)"
    fontWeight: 710
    lineHeight: 0.88
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope Variable, Helvetica Neue, sans-serif"
    fontSize: "clamp(1.8rem, 3.2vw, 3.8rem)"
    fontWeight: 710
    lineHeight: 1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope Variable, Helvetica Neue, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 720
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope Variable, Helvetica Neue, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Manrope Variable, Helvetica Neue, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    letterSpacing: "0.075em"
  mono:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.68rem"
    fontWeight: 500
    letterSpacing: "0.08em"
rounded:
  square: "0"
  round: "50%"
spacing:
  compact: "0.65rem"
  standard: "1rem"
  section: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.charcoal-ink}"
    textColor: "{colors.lifted-paper}"
    rounded: "{rounded.square}"
    padding: "0.68rem 1.05rem"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.square}"
    padding: "0.68rem 1.05rem"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.signal-ember}"
    textColor: "#fff8f3"
    rounded: "{rounded.square}"
    padding: "0.68rem 1.05rem"
    height: "44px"
  text-field:
    backgroundColor: "{colors.lifted-paper}"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.square}"
    padding: "0.8rem 0.95rem"
    height: "52px"
  block-card:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.square}"
    padding: "1rem"
---

# Design System: CodeTalk

## Overview

**Creative North Star: "The Incident Ledger"**

CodeTalk feels like a warm paper operations ledger made live: calm charcoal type, crisp rules, and dense evidence arranged for scanning under pressure. The editorial scale creates urgency through hierarchy rather than visual noise, while the workspace stays utilitarian and legible.

The system is flat, square, and deliberately restrained. Ember appears only where attention is operationally urgent; moss closes the loop when an incident is resolved. Motion is brief and state-bearing, with a reduced-motion path built into the global layer.

**Key Characteristics:**

- Warm paper and charcoal foundations separated by hairline rules.
- Oversized, tightly tracked Manrope headlines paired with compact operational labels.
- IBM Plex Mono reserved for codes, counts, states, and timestamps.
- Square controls and border-defined regions rather than floating cards.
- A persistent five-column evidence workspace that becomes a horizontal snap track on small screens.

## Colors

The palette is a warm neutral field with two tightly governed semantic accents.

### Primary

- **Signal Ember:** The active-incident signal, destructive action, focus outline, live cursor, selection, and short-lived loading cue.
- **Deep Ember:** A quieter urgent voice for live-state copy, destructive text actions, and ember hover states.

### Secondary

- **Resolved Moss:** Reserved for resolved incident state and postmortem timeline progress.

### Neutral

- **Charcoal Ink:** Primary text, strong dividers, dark buttons, avatars, and the strongest structural marks.
- **Muted Ink:** Supporting copy, labels, metadata, and low-emphasis operational information.
- **Warm Paper:** The application canvas.
- **Deep Paper:** Hover and scrollbar layering against the canvas.
- **Lifted Paper:** Form, composer, toast, and inverted-text surface color.
- **Quiet Rule:** Default one-pixel separators, field strokes, and container boundaries.
- **Strong Rule:** Emphasized outlines and scrollbar thumbs.
- **Ember Wash:** Error and reconnect backgrounds that carry urgency without becoming solid alarm fields.

### Named Rules

**The Two-State Accent Rule.** Ember means active urgency; moss means resolved state. Never use either as general decoration.

**The Ruled Paper Rule.** Separate information with neutral paper shifts and one-pixel rules before introducing a new color.

## Typography

**Display Font:** Manrope Variable (with Helvetica Neue and sans-serif fallbacks)  
**Body Font:** Manrope Variable (with Helvetica Neue and sans-serif fallbacks)  
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** Manrope carries both the editorial authority of the largest statements and the compact efficiency of interface copy. IBM Plex Mono contributes an operational register only where fixed-width scanning or machine-like identifiers improve comprehension.

### Hierarchy

- **Display:** Heavy variable weight, fluid and tightly set; reserved for the landing and incident-creation statements.
- **Headline:** Heavy, compact, and single-line where possible; used for incident titles and centered state messages.
- **Title:** Compact bold text with slight negative tracking; used for panel headings.
- **Body:** Dense but open enough for evidence and descriptions; supporting ledes loosen to a 1.65 line height.
- **Label:** Small, bold, tracked, and usually uppercase; used for field names, utilities, column headings, and status framing.
- **Mono:** Small and medium-weight with deliberate tracking; used for codes, event counts, timestamps, indices, and room states.

### Named Rules

**The Operational Mono Rule.** Use IBM Plex Mono only for codes, timestamps, counters, indices, and terse machine-like states; prose and ordinary labels remain Manrope.

**The Scale, Then Restrain Rule.** Create emphasis with Manrope size and tight tracking; do not add a decorative display face.

## Layout

Public and form surfaces sit in a centered shell capped at 1440px with 28px desktop gutters, narrowing to 16px below 900px and 12px below 560px. Landing and creation screens use an asymmetric two-column editorial split; at 900px they stack into one ruled flow.

The incident room is a full-width control surface. Its header uses a narrow mark rail, a flexible title region, and an action region. The composer is a three-part grid with a 210px control rail and 190px action rail. Evidence is always grouped into five equal semantic columns, each at least 230px wide; overflow scrolls horizontally. Below 560px each column becomes 82vw wide and snaps into place, preserving the five-part information model instead of collapsing it into a generic feed.

Spacing repeats a compact 0.65rem gap, a 1rem content unit, and a 2rem structural inset. Large landing and form whitespace scales with the viewport; operational surfaces stay denser.

**The Five Lanes Rule.** Logs, hypotheses, fix attempts, root cause, and custom evidence remain distinct columns at every viewport; responsiveness changes navigation, not information architecture.

## Elevation & Depth

The system is flat by default and uses no conventional drop shadows. Depth comes from warm tonal layering, strong-versus-quiet rules, and inset two-pixel category marks at column headers. The only expanding shadow is the animated ember pulse, where it communicates a live signal rather than physical elevation.

### Shadow Vocabulary

- **Live Signal Pulse** (`0 0 0 0 rgba(198,73,45,.28)` to `0 0 0 6px rgba(198,73,45,0)`): A two-second repeating ring for active and reconnecting state only.
- **Column Type Inset** (`inset 0 2px [semantic type color]`): A thin top key that differentiates the five evidence categories without tinting the whole column.

### Named Rules

**The Flat Ledger Rule.** Surfaces stay flush and ruled; do not use ambient drop shadows to manufacture hierarchy.

## Shapes

Rectangles are square and border-led. Buttons, fields, text areas, selects, cards, alerts, and code badges use zero radius. Circles are reserved for signal dots, presence avatars, and cursor geometry, making rounded forms a sign of live actors or live state rather than a general softness treatment.

**The Circles Are Alive Rule.** Circular geometry belongs to people, presence, and status signals; content containers and controls remain square.

## Components

### Buttons

- **Shape:** Square, compact, and firm, with a 44px minimum height.
- **Primary:** Charcoal fill with lifted-paper text and compact horizontal padding.
- **Secondary:** Transparent fill with a strong neutral rule; hover adds deep paper.
- **Danger:** Ember fill with warm white text; reserved for resolving an active incident or similarly consequential actions.
- **Hover / Focus:** Color and border states transition in 160ms; active presses scale to 0.98 over 140ms. All variants share a 2px ember focus-visible outline offset by 3px.

### Cards / Containers

- **Corner Style:** Square throughout.
- **Background:** Block cards are transparent within their ruled column; input and composer surfaces use lifted paper.
- **Shadow Strategy:** No card shadows; one-pixel bottom rules establish rhythm.
- **Border:** Quiet rules are the default, with charcoal reserved for major sectional boundaries.
- **Internal Padding:** Block cards use the standard 1rem content unit.

### Inputs / Fields

- **Style:** Lifted-paper fields with quiet one-pixel strokes, square corners, compact labels, and a 52px standard input height.
- **Focus:** The local stroke shifts to charcoal and the background becomes a slightly cleaner warm white; keyboard focus also retains the global ember outline where not explicitly suppressed.
- **Code Entry:** Room codes switch to tracked uppercase IBM Plex Mono.

### Navigation

- **Style:** Navigation is intentionally sparse: a bold Manrope wordmark, ember or moss state dot, and ruled header boundaries. Room layouts abbreviate the mark to “CT” in the narrow left rail.
- **Responsive:** Below 900px, room actions move to a full-width second row; below 560px they wrap and the room code expands to available width.

### Room Code Badge

A square, strong-rule badge pairs a tiny Manrope “Room” label with a tracked IBM Plex Mono code. It is a compact operational identifier, not a decorative chip.

### Block Workspace

The signature canvas is a fixed five-lane ruled grid. Category identity is carried by a two-pixel inset key at each column head, while body content remains on neutral paper. Cards expose uppercase subjects, readable evidence text, and a mono author/time footer.

### Status Messages

Info toasts use lifted paper and a quiet rule. Errors and reconnect states use ember wash, a muted ember border, and deep ember text. Toasts remain square and provide a plain underlined dismissal action.

## Do's and Don'ts

### Do:

- **Do** preserve the paper-and-rule structure before adding any new surface treatment.
- **Do** use ember for active urgency and moss for resolved state.
- **Do** keep the five evidence types visually and spatially distinct on every viewport.
- **Do** respect reduced-motion preferences and keep feedback transitions between 140ms and 180ms.
- **Do** reserve IBM Plex Mono for operational data that benefits from fixed-width scanning.

### Don't:

- **Don't** use ember or moss as decorative brand color across large areas.
- **Don't** round cards, buttons, fields, alerts, or badges; circles belong to live actors and signals.
- **Don't** add ambient drop shadows, gradients, glass effects, or floating card stacks.
- **Don't** collapse the incident workspace into one undifferentiated vertical feed on mobile.
- **Don't** introduce glyph-only controls or a decorative display typeface; neither belongs to the shipped visual language.
