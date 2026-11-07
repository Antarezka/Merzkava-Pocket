# Merzkava Pocket — Floating Control Design

**Status:** Approved visual baseline with approved emblem replacement  
**Scope:** Floating Control screen only  
**Document type:** UI/UX design reference; not an implementation handoff  
**Approval:** Full-screen Floating Control baseline approved 2026-11-07; antique CRT television emblem approved 2026-11-07.

## 1. Design scope and preservation

- Preserve the approved full-screen Floating Control mockup as the current baseline.
- Do not expand this document into other app pages or flows.
- Do not change the approved layout, section order, or feature order while working on later mockups.
- The emblem replacement affects the header app mark only; it does not authorize redesigning the rest of the screen.
- This document records the conceptual design. It does not claim that Android permissions, service actions, animations, sound, or Donate interactions are implemented.

## 2. Visual direction

The visual language combines:
- **Reverse: 1999:** editorial typography, refined atmosphere, antique warmth, and restrained ornament.
- **Harry Potter:** antique heraldic identity and mysterious institutional symbolism.
- **Arknights:** clean, deliberate structure.
- **Girls' Frontline:** precise, technical identity.

The intended character is elegant, mysterious, arcane, modern, and recognizable rather than generic.

## 3. Floating Control screen palette

The approved screen palette remains:

| Color | Hex | Intended use |
|---|---|---|
| Electric Lime | `#EFFE59` | Existing screen identity/accent |
| Ink Black | `#17191B` | Main dark surface |
| Imperial Gold | `#F0B10A` | Existing premium accent |
| Pale Silver-Blue | `#DEE4F4` | Secondary light detail |
| Antique Brown | `#976759` | Warm muted accent |
| Muted Slate | `#747788` | Secondary labels and subdued text |
| Parchment / Ivory | `#F1EBDD` | Primary light text |

The emblem has its own antique-wood color treatment described below. Its colors do not replace or silently recolor the approved screen palette.

## 4. Header emblem — approved replacement

The previous abstract M monogram direction is discontinued. It is replaced by a **custom antique CRT television mark**.

### Approved visual characteristics

- A classic rounded CRT television silhouette, with a large curved-glass screen.
- Antique wooden casing, evoking aged mahogany rather than modern plastic.
- Restrained aged-bronze / brass trim and physical control knobs.
- Two visible antenna rods extending from the top.
- A slight three-quarter perspective, with the right side subtly visible; it should not face perfectly forward.
- Flat, clean illustration treatment with enough characteristic detail to read unmistakably as a vintage television.
- No enclosing background, badge, tile, card, or square container. The TV illustration itself is the mark.
- Display size in the Floating Control header: **38 × 38 px** (half the previously previewed 76 × 76 px size).
- Keep the emblem visually secondary to the MERZKAVA wordmark.

### Emblem color direction

Use warm antique materials inspired by the atmosphere of Reverse: 1999:
- Mahogany / aged wood brown as the dominant casing color.
- Deep dark brown for shadow and recesses.
- Aged bronze / brass for restrained trim, antenna details, and knobs.
- Warm ivory only for small highlights and screen reflections.

Do not make Electric Lime the dominant emblem color. Do not add a colored background behind the TV.

### Identity and approval boundary

The antique CRT television is the approved replacement for the former M mark in the Floating Control header. The 38 × 38 px, no-background treatment is the selected direction. This approval applies to the emblem only; it does not imply that its vector artwork or runtime asset has already been implemented in the app.

## 5. Floating Control — approved full-screen structure

### Header
- Compact antique CRT television emblem at the left, 38 × 38 px, with no background container.
- MERZKAVA wordmark.
- POCKET as the secondary product label.
- Short tagline: “A little world, always within reach.”
- Small active-state indicator at the right.

### Device Status
A slightly elevated/floating panel with four status rows, in this order:
1. Display over other apps — READY
2. Notifications — NOT READY
3. Background activity — NOT READY
   - Helper text: “Double-tap to open settings.”
4. Floating service — STOPPED

**Future motion behavior:** the panel should respond to touch with a subtle elastic wobble centered around the touch point. It should not shake uniformly as one rigid block. This is a design requirement only; it is not implemented by this mockup.

### Initial Setup
Keep the setup rows compact. Each row places its label/helper text on the left and a small square icon-only action on the right. Do not use oversized full-width buttons.

Rows:
1. Display over other apps — completed state shown with a check icon.
2. Notifications — small bell icon action.
3. Background activity — small settings icon action; helper text says “Double-tap to open settings.”

### Quick Actions
Preserve this exact order:
1. Open game / Continue
2. Open floating mini window
3. Stop service
4. Donate

The Floating Bubble toggle is not part of this screen. It is a separate antique CRT icon in the Home header; the Home control starts/stops the native overlay and reflects the real Android bubble-attachment state. Tapping the floating TV returns Pocket to the foreground.

Each action is a compact row with a small icon, title, short helper line, and trailing chevron.

### Footer
- A quiet kindness/support message.
- MERZKAVA POCKET identity and “MADE WITH CARE” footer labels.

## 6. Donate panel — interaction and tone reference

Donate opens a separate, gentle panel with a comforting hospital-room atmosphere:
- A bed and a calm view through a window.
- Trees outside moving gently.
- Warm, peaceful, humane mood; not cold, bleak, or clinically depressing.
- This is not a payment-first flow and must not pressure the user to donate.

Primary message:
> If you'd like to support this little project, all we ask for is your kindest wishes. May the developer be given a longer, gentler stretch of rest — with every breath coming easy, and no pain to carry.

Secondary message:
> No pressure. No payment needed. Your kind thoughts are already a gift.

After pressing **SEND A LITTLE KINDNESS**, show a small translucent panel with subdued text:
> Simpan saja, ada yang lebih membutuhkan di sekitarmu.

The Donate copy should eventually be localized into the exact language set already used by Merzkava Pocket. Verify the actual locale list from the app source before preparing translations; do not guess the language count or names.

## 7. Sound and feedback — future behavior

- Optional gentle tap sound for buttons.
- More subtle feedback sound for Device Status interactions.
- Respect the app's sound/mute settings.
- Sound behavior is a design note, not an implemented feature.

## 8. Approval boundary and next work

**Approved now:** the full-screen Floating Control layout, its documented structure and interaction intent, and the antique CRT television header emblem. The later Home-header Floating Bubble control is a separate app-shell control and does not add a bubble action to this screen.

**Still open:** the next app-screen mockup and any implementation-specific vector asset decisions.

Do not redesign the approved Floating Control screen while creating the next mockup. Treat this document as its visual baseline and reference.
