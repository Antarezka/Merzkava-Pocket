# Merzkava Pocket — Floating Control Design

**Status:** Approved visual baseline  
**Scope:** Floating Control screen only  
**Document type:** UI/UX design reference; not an implementation handoff  
**Approval:** The full-screen mockup was approved in conversation on 2026-11-07.

## 1. Design scope and preservation

- Preserve the approved full-screen Floating Control mockup as the current baseline.
- Do not expand this document into other app pages or flows.
- Do not change the approved layout, section order, or feature order while working on the emblem.
- This document records the conceptual design. It does not claim that Android permissions, service actions, animations, sound, or Donate interactions are implemented.

## 2. Visual direction

The visual language combines:
- **Reverse: 1999:** editorial typography, refined atmosphere, restrained ornament.
- **Harry Potter:** antique heraldic identity, mysterious institutional symbolism.
- **Arknights:** geometric insignia, clean and deliberate structure.
- **Girls' Frontline:** precise, technical faction identity.

The intended character is elegant, mysterious, arcane, modern, and recognizable rather than generic.

## 3. Color palette

| Color | Hex | Intended use |
|---|---|---|
| Electric Lime | `#EFFE59` | Dominant identity/accent color |
| Ink Black | `#17191B` | Main dark surface |
| Imperial Gold | `#F0B10A` | Premium accent and emblem details |
| Pale Silver-Blue | `#DEE4F4` | Secondary light detail |
| Antique Brown | `#976759` | Warm muted accent |
| Muted Slate | `#747788` | Secondary labels and subdued text |
| Parchment / Ivory | `#F1EBDD` | Primary light text |

For the emblem, Electric Lime is dominant, Ink Black is the base, and Imperial Gold is the restrained secondary accent.

## 4. Emblem direction — not final

The selected direction combines:
- The **abstract/arcane monogram approach from concept 02**.
- The **angular geometric frame from concept 03**.
- A custom, distinctive M-like symbol; it should not look like an ordinary font glyph.
- Potential use of negative space, diagonal cuts, geometric construction, and subtle arcane details.
- A custom CSS-built emblem, using SVG/CSS geometry where appropriate.

The M shape itself remains under exploration. No individual M concept has been approved as final. The emblem shown in the approved full-screen mockup is only a temporary placeholder.

## 5. Floating Control — approved full-screen structure

### Header
- Compact emblem/app mark at the left.
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
2. Start bubble mode
3. Open floating mini window
4. Stop service
5. Donate

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

**Approved now:** the full-screen Floating Control layout and its documented structure, ordering, tone, and interaction intent.

**Still open:** the custom abstract M emblem and final wordmark treatment.

Next design work should focus only on refining the abstract M emblem. Once that is selected, it can be integrated into the approved Floating Control baseline. Do not redesign the rest of the screen without a new request.
