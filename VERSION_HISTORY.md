# Version History

Version format: `YYYY.WW.VV`

## 2026.18.01

- Added Flip 7: With a Vengeance support, including the new number cards, Lucky 13, Unlucky 7, and Vengeance modifier cards.
- Added Brutal Mode controls for Vengeance tables, plus the +15 / -15 Flip 7 award flow and related scoring fixes.
- Added session title editing with localized weekday-based suggestions and kept the title stable across play again and tuck away.
- Fixed card-mode scoring so Flip 7 bonuses are counted once for manual, card, and AI scan workflows.

## 2026.17.02

- Added localized session title suggestions based on weekday plus rotating descriptor words.
- Added live editing for the current session title in game details.
- Kept the session title stable across play again and locked it when the game is tucked away.

## 2026.17.01

- Added OpenAI-based card recognition for scan capture and kept scoring local in the app.
- Added the `/scan` debug page with image upload, live token usage, latency, and model selection.
- Added monthly token budget tracking for OpenAI scan usage.
- Migrated app translations to i18next with English, Swedish, and Danish locale files.
- Added scan summary editing improvements, including manual score entry and manual card selection.

## 2026.16.02

- Added live player rename from game details.
- Added editing support for cards-mode rounds, including stored card selections.
- Locked manual score entry and card selection so each player uses one input method at a time.
- Cleared manual scores when switching back from a card selection and fixed the manual-edit card mute state.
- Updated card picker navigation to use compact previous/next player buttons.

## 2026.16.01

- Initial cards coding release.
- Added classic card input mode with real card art.
- Added default input mode settings for new games and table defaults.
- Added card-based score selection, Flip 7 bonus handling, and the picker UI.
