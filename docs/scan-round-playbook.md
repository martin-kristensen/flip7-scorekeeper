# Scan Round Playbook

## Goal

Build a scan-round flow that lets the table move in entered order, keep the camera open for the full session, and finish with an editable summary before the round is saved.

This should fit the current app instead of creating a separate scoring system.

## Current Implementation Status

The scan flow is no longer just a concept. The following pieces are already implemented and available in the app:

- `Score with AI` entry point from the live table.
- Scan summary view with per-player capture, rescan, retake photo, and manual card entry.
- OpenAI-based card recognition endpoint at `POST /api/scan/recognize`.
- Local score calculation in the app after card tokens come back from OpenAI.
- Standalone debug page at `/scan` for uploading images, testing camera capture, inspecting raw responses, and comparing models.
- Image compression before upload so the API call is smaller and faster.
- Monthly token budget tracking and enforcement.
- Manual score entry directly from the scan summary score box.
- The main game flow stays intact and the existing round editor still works.

## Environment Setup

Use `.env` for real local secrets and `.env.example` as the checked-in template.

Relevant OpenAI settings:

- `OPENAI_API_KEY` - required for recognition
- `OPENAI_MODEL` - the model used for scan recognition
- `OPENAI_MONTHLY_TOKEN_LIMIT` - optional monthly cap for scan usage

The debug page and scan flow both use the same upload/compression path, so testing on `/scan` should closely match the real scan round.

## What Already Exists

The current codebase already has the right core data shape for this feature.

- The backend stores rounds with `scoreInputMode`, `cardSelections`, and `scores`.
- The client already supports card-based round editing in `public/app.js`.
- The app uses a simple Express API plus Postgres JSON session storage, so round drafts do not need a new database model.

That means scan round is mostly a new workflow on top of the existing round model, not a rewrite.

## Backend Choices

There are three realistic ways to handle card recognition.

There is not a realistic truly free hosted vision backend for this. If we want zero per-scan cost, the recognition work has to happen in the browser or on the device.

| Option | Cost | Accuracy | Ops burden | Recommendation |
| --- | --- | --- | --- | --- |
| Client-only recognition | Lowest running cost | Medium | Low | Good if you want a no-API-cost version first |
| OpenAI vision backend | Paid per use | High | Low to medium | Best if you want the fastest reliable recognition |
| Hybrid: client first, OpenAI fallback | Mixed | High | Medium | Best overall if we want low cost plus a safety net |

### My Recommendation

For the fastest and best UX, capture immediately and upload each player's image as soon as it is taken.

That means:

- The user captures a card hand.
- The client uploads that image right away.
- The app advances to the next player immediately.
- The OpenAI analysis runs in the background.
- The summary screen shows any unfinished scans with a spinner or `Processing...` state.

This keeps the flow moving while still letting OpenAI do the hard work.

Keep the scan UX independent from the recognition engine, then pick one recognizer behind a small interface.

Before any backend work, start with a UI-first prototype that uses fake recognition results.

That prototype should still let us:

- open the scan flow
- capture or stub a photo per player
- advance through players in order
- show a summary at the end
- edit rows before confirming

The fake recognizer can return canned `processing`, `ready`, and `failed` states so we can lock the interaction model before wiring OpenAI in.

If the priority is reliability, use OpenAI for recognition.

If the priority is zero per-scan cost, start with client-side recognition and manual fallback.

If we want the most practical long-term setup, use hybrid: try client-side recognition first, and fall back to OpenAI only when confidence is low or the user asks for help.

If you want a `rescan` button that reuses the same photo, keep the image until the user leaves the summary or confirms. After that, delete it.

## Proposed User Flow

1. The user taps `Scan round`.
2. The app enters a dedicated full-screen scan mode.
3. Players are processed in entered order only.
4. For each player, the UI shows the player name, camera preview, and three actions:
   - `Capture`
   - `Skip player`
   - `Enter manually`
5. When `Capture` is tapped, the app grabs a frame, runs recognition, calculates the score, stores the result in the round draft, and advances to the next player.
6. If recognition fails or confidence is low, the user can retry, skip, or enter a score manually.
7. After the last player, the app shows a summary screen with all rows editable.
8. The user can tap a row to edit the score manually or rescan that player.
9. The user taps `Confirm round` and the round is saved through the existing round API.

## Data Flow

The scan mode should build a draft in the client first, upload each capture immediately, and then submit one final round payload at the end.

Suggested draft shape:

```ts
{
  playerOrder: string[];
  currentPlayerIndex: number;
  mode: "scan";
  players: {
    [playerId: string]: {
      status: "pending" | "captured" | "skipped" | "manual";
      tokens: string[];
      score: number | null;
      confidence: number | null;
      imageId: string | null;
      note: string | null;
    };
  };
}
```

Final submit can reuse the existing `/api/rounds` shape:

```ts
{
  note,
  scoreInputMode: "cards" | "manual",
  cardSelections,
  scores
}
```

For a scan round, `scoreInputMode` should usually be `cards`, with `scores` still filled so the backend and summary view stay consistent.

Suggested live scan status model:

- `idle`
- `uploading`
- `processing`
- `ready`
- `failed`

The summary should keep a row in `processing` until the analysis response comes back. If the user reaches the end before the last scan finishes, show a spinner and keep `Confirm round` disabled until all rows are either `ready`, `failed`, or manually entered.

## Implementation Plan

### Phase 1: UI Scaffold

Build the scan-round screen and state machine before touching AI.

Deliverables:

- Dedicated scan mode entry from the current game screen.
- Player queue in entered order.
- Full-screen capture layout or capture placeholder.
- Actions for capture, skip, and manual entry.
- Local draft state for each player.
- A per-player status label so the UI can show `uploading` and `processing` states.
- Fake recognition responses so the summary and loading states can be tested without OpenAI.

Success criteria:

- The flow can run end to end with fake scan results.
- No backend changes are required yet.

### Phase 2: Camera Capture

Wire up the browser camera in a single continuous session.

Deliverables:

- `getUserMedia` based camera preview.
- One active stream for the whole scan session.
- Frame capture into canvas or image bitmap.
- Basic permission and error handling.
- Mobile-friendly fullscreen behavior.

Success criteria:

- Camera opens once and stays active until the round is done or canceled.
- Capture works reliably on mobile.

### Phase 3: Recognition Adapter

Add a narrow recognition layer so the UI does not care whether the engine is local or remote.

Deliverables:

- A recognizer interface that returns detected card tokens, a computed score, and a confidence value.
- One implementation for local/browser recognition or template matching.
- Optional OpenAI-backed implementation behind an env flag or server route.
- Clear fallback behavior when confidence is too low.
- Background upload handling with a request id or job id per captured image.

Success criteria:

- The UI can request recognition without knowing which engine is used.
- Low-confidence scans do not block the flow.

### Phase 4: Summary and Editing

Build the end-of-round review state.

Deliverables:

- Summary view with one row per player.
- Tap-to-edit rows.
- Manual override for any row.
- Re-scan action for a row.
- Final `Confirm round` action.
- Inline spinner or progress state for rows that are still being analyzed.

Success criteria:

- Every player can be corrected without restarting the round.
- The summary uses the same score logic as the current round editor.

### Phase 5: Persist and Harden

Connect the final submit to the existing backend and tighten edge cases.

Deliverables:

- Round submission through `/api/rounds`.
- Draft cleanup after save or cancel.
- Retry handling for recognition failures.
- Accessibility pass for keyboard, focus, and screen reader behavior.
- Lightweight error states for camera and recognition problems.

Success criteria:

- Saved scan rounds show up exactly like normal rounds.
- Existing game flow still works unchanged.

## Backend Impact

### If We Use OpenAI

We will need one narrow server endpoint that accepts an image, queues or performs analysis, and returns normalized card data.

Recommended shape:

- `POST /api/scan/recognize`
- Input: image payload plus game context
- Output: detected card tokens, score, confidence, and warnings

If we want the smoothest UX, the endpoint should respond quickly with a scan job id, then the client can poll or subscribe for the final result while already moving to the next player.

This keeps the API key server-side and avoids exposing vendor credentials in the browser.

### If We Stay Free/Local

We can avoid any new backend endpoint for recognition.

The server only needs to keep doing what it already does:

- Store the final round.
- Recompute totals.
- Handle edits and history as it already does.

## Risks

- Card recognition may be less reliable than the UI expectations if we go fully local.
- OpenAI adds recurring cost and network dependency.
- Camera permissions and mobile browser behavior can break the flow if we do not test on actual devices.
- The current round editor is already complex, so the scan flow should reuse as much of that logic as possible.

## Acceptance Criteria

- Players are scanned strictly in entered order.
- The camera session stays open for the whole scan round.
- Capture auto-advances to the next player.
- Skip and manual entry never block the round.
- The summary is editable before saving.
- The final saved round uses the existing round model.
- No existing manual round entry flow regresses.

## Review Decision Points

Before implementation, I would like approval on these choices:

- Do we want OpenAI as the primary recognizer, or only as a fallback?
- Do we want a free/local first version even if recognition is weaker?
- Should scan round be available only in classic card mode, or across all game modes?
- Do we want scan drafts to persist across refreshes, or is in-memory enough for v1?

## Suggested Build Order

1. Approve the backend choice.
2. Build the scan UI and draft state with manual entry only.
3. Add camera capture.
4. Add the recognition adapter.
5. Add summary editing and final submit.
6. Test on a phone before shipping.
