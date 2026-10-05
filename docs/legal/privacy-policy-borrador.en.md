# DRAFT — Privacy Policy update: blocked words

> **STATUS: DRAFT PENDING OWNER APPROVAL. DO NOT PUBLISH.** It does not replace `privacy-policy.en.md` (in force). It must be published before releasing a version with this sending enabled. See `NOTAS-DE-REVISION.md` §6.

Proposed changes to the current policy. Each block states the section and whether it **adds** or **replaces** text.

## §1 Summary — add a bullet

- We send the words from your blocked words list, pseudonymized (linked to a technical identifier of your installation, never to your name), to improve the moderation filter.

## §2 Data we process — add a row to the table

| Data | Why | Basis |
|---|---|---|
| **Words from your blocked words list**: the text of each word as you wrote it in your list, normalized (lowercase, accents removed except ñ), the configured voice language and the send date. **No name of yours or of your viewers, no chat messages.** Before sending, the App discards entries containing `@`, links, emails, long numbers (6 or more digits), more than 3 words or more than 40 characters | Improve the App's moderation filter | Acceptance of the **Terms** and **legitimate interest** in improving the filter |

Explanatory text (add below the table):

> Words are linked to a pseudonymized identifier of your installation only to count **how many distinct users** block the same word. We never display or export which user blocked which word. To improve the filter we only use words blocked by **several users** (at least 3); the rest are stored but not viewed or used. Sending is cumulative: if you later remove a word from your list, the word sent earlier is not removed from the count; you can request its deletion (see §6).

## §3 Who we share data with — no change

Words are sent only to our own telemetry server (Hostinger, Manchester). They are not shared with third parties.

## §5 How long we keep data — add a bullet

- **Shared blocked words:** up to **365 days** linked to your installation, like the rest of the telemetry; they are then deleted automatically.

## §6 Your rights — add / adjust

- **Deletion:** write to info@tiklivetts.es or contact us on Discord and we will delete the words linked to your installation.

## Open questions for the owner

1. Does the minimum threshold stay at 3 distinct users? (the server makes it configurable).
2. Do we keep the "add only" logic (a removed word still counts)? If not, remove that sentence from the explanatory text.
3. Effective date and how existing users are notified (§13).
