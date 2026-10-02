# TikLiveTTS Privacy Policy

**Document version:** 2.0 · **Effective:** October 2, 2026
**Data controller:** iKhunsa (Ecuador)
**Privacy contact and data officer (DPO/encarregado):** iKhunsa — info@tiklivetts.es

> *Courtesy translation. If there is any discrepancy, the Spanish version ([politica-de-privacidad.md](politica-de-privacidad.md)) prevails.*

This policy explains what data TikLiveTTS (the "App") processes, why, who we share it with, how long we keep it and how to exercise your rights. It complements the [Terms and Conditions](terms-and-conditions.en.md). It is designed to comply with Ecuador's Organic Law on Personal Data Protection (LOPDP) and, where applicable, the GDPR (EU) and the LGPD (Brazil).

---

## 1. Summary

- The App works **on your device**: overlays, TTS, soundpad and moderation run locally.
- We send usage telemetry, analytics and errors to **our own servers**. We do not sell your data.
- If you create an account, we store your **email and name**. Payments are processed by **Polar**.
- The text that is **read aloud** is sent to **Google** to generate the audio.
- You can **delete your account** and your data with the "Delete account" button in your profile.

## 2. Data we process, why and on what basis

| Data | Purpose | Legal basis |
|---|---|---|
| **Account**: email, name, password (stored only as a hash), registration date | Create and manage your account, sign in, security | Performance of the service |
| **Subscription**: plan, interval (monthly/annual), status, renewal date, Polar customer identifier | Enable your paid features, cancel/renew | Performance of the contract |
| **Payments**: processed by Polar. We do not receive or store your card number | Billing and invoicing | Performance of the contract (Polar is responsible for payment data) |
| **Own telemetry** (`telemetria.tiklivetts.es`): pseudonymized, non-reversible fingerprint of your device (hash of Windows user and computer name), session identifier, App and system version, language, **approximate location (country and city from IP)**, connected platforms and channels, feature usage counts, enabled settings (yes/no) and trimmed technical errors | Measure usage, prioritize features, detect failures | Consent (by accepting these terms) and legitimate interest in improving and protecting the service |
| **Public identity of your channels**: username, public name, profile picture, followers (from each platform's public APIs) | Usage statistics and promotion (see §7) | Consent |
| **Product analytics with Aptabase** (`aptabase.tiklivetts.es`, self-hosted): installation, session and feature-usage events, country, App version. No usernames, messages or free text | Understand which features are used | Consent and legitimate interest |
| **Error reports with GlitchTip** (`glitchtip.tiklivetts.es`, self-hosted): errors and unexpected crashes, App state (platforms, OBS, settings), excerpt of the session log, installation and session identifier and the name of connected channels | Fix errors | Legitimate interest and consent |
| **Bug reports and suggestions** that you send: your Discord username, your channel link, your description and, for bugs, the session log | Handle your report | Consent (you send it) |
| **Text read aloud** (may include the name of the person who wrote it if you enable that option) | Generate audio with Google Translate's voice service | Performance of the service |
| **Local logs and settings** (in the App's data folder): configuration, moderation, soundpad, TikTok session | Operation of the App on your device | Performance of the service — **we do not receive them** |
| **Email for advertising** (the one you share when creating your account or paying) | Advertising, offers and news about TikLiveTTS and other iKhunsa projects | Consent (included in acceptance of the Terms), revocable |

**Clarifications:**
- The device fingerprint is **pseudonymized** data: it does not contain your name, but it is still personal data because it stably identifies your installation.
- Your IP is used only to estimate your **approximate location** (country and city), not your exact location, and we do not use it to identify you. This approximation gives us a general idea of where the App is used.
- The session logs attached to errors and reports **may contain usernames** from the connected platforms. We trim them, but we cannot guarantee that none appears.
- We **do not process** the content of your viewers' chat messages as part of telemetry, nor your TikTok, Twitch, YouTube or Kick passwords. The TikTok session is stored locally.
- We do not make **automated decisions** or build profiles that produce legal effects on you.
- We do not process special categories of data (health, biometrics, origin, etc.).

## 3. Who we share data with

We do not sell personal data or use it for third-party advertising. We share it only with providers that make the service possible:

- **Polar** — payments, invoicing and taxes (merchant of record).
- **Google** — voice synthesis (Google Translate TTS) and, if you open the What's New video or play music, YouTube.
- **Discord** — receives the bug reports and suggestions you send, and is the community channel.
- **GitHub** — download and update of the App (GitHub sees your IP when checking Releases).
- **Hostinger** — hosting of our servers (accounts, telemetry, analytics and errors) on a VPS located in **Manchester, United Kingdom** (Europe).
- **Umami** (self-hosted) — aggregated, cookie-free analytics of our website.
- Privacy policies of these providers: Polar <https://polar.sh/legal/privacy> · Google <https://policies.google.com/privacy> · Discord <https://discord.com/privacy> · GitHub <https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement> · Hostinger <https://www.hostinger.com/legal/privacy-policy>.
- Authorities, when a law or valid order requires it.

## 4. International transfers

Some providers (Google, Discord, GitHub, Polar, Hostinger) may process data outside your country. I am from Ecuador and our own servers are hosted in **Manchester, United Kingdom**. When your data leaves the European Economic Area, the United Kingdom or Brazil, we rely on each provider's safeguards (adequacy decisions, standard contractual clauses or equivalent mechanisms) and on your consent, necessary to provide the service. You can ask us for information about these safeguards at info@tiklivetts.es.

## 5. How long we keep data

- **Telemetry and analytics:** up to **365 days**; then they are deleted automatically.
- **Account and subscription:** while your account exists. When you delete it we erase your account, email and subscription history from our systems.
- **Payments:** Polar keeps transaction records for as long as accounting and tax rules require; we do not control them.
- **Errors (GlitchTip):** no fixed period; they are kept while useful to fix errors and improve stability, and you can ask for their deletion.
- **Reports on Discord:** until we remove them or you ask us to delete them.
- **Local logs:** on your device, until you delete them or uninstall the App.
- **Backups:** deleted data is also purged from backups within up to 30 days.

## 6. Your rights and how to exercise them

You have the right to **access, rectification, erasure, objection, restriction, portability** and to **withdraw your consent** at any time, without retroactive effect.

- **Delete your account and account data:** **"Delete account"** button in your profile (Account view). It is immediate and irreversible.
- **Telemetry and analytics linked to your installation:** write to info@tiklivetts.es or on Discord and we will help you identify and delete it. Today the App does not include a switch to turn telemetry off; you can stop sending it by uninstalling the App or by writing to us.
- **Email advertising:** unsubscribe link in every email or by writing to us.
- **Withdraw the image-use authorization:** by deleting your account or writing to us (see §7).

You may also **object** to processing based on our legitimate interest. To protect you, we may ask you to confirm your identity before handing over or deleting data.

We will respond **without delay and within 30 days at most** (15 days where the LGPD requires). We may extend the period where the law allows, notifying you. If we do not grant your request, we will explain why and on what rule. If you believe we have not respected your rights, you can complain to the authority of your country: in Ecuador, the Superintendency of Personal Data Protection; in the EU, the authority of your Member State; in Brazil, the ANPD.

## 7. Use of image and public data of your channels

With your acceptance, we use the **public data** of your channels (username, public name, profile picture, logo and visible metrics) to **promote TikLiveTTS** on our website, social networks, materials and inside the App. The authorization is **non-exclusive, free and revocable**, lasts while your account exists or you use the App, and is withdrawn by deleting your account or writing to us. We do not use private content or your chat messages. Details in the Terms, section 8.

## 8. Email advertising

By accepting the Terms and sharing your email, you consent to our using it to send you advertising, offers and news about TikLiveTTS and other iKhunsa projects. We do not share or sell your email to third parties for their own advertising. You can withdraw your consent at any time with the unsubscribe link in each email, by writing to info@tiklivetts.es or by deleting your account; you will still receive the transactional emails that are necessary (payments, security, changes to terms).

## 9. Security

Communications with our servers use **HTTPS**; passwords are stored only as a hash; the App's credentials are stored locally; and our services are self-hosted instances with restricted access. No system is infallible: if a breach affecting your data occurred, we will notify you without undue delay and inform the competent authority within the legal deadlines (for example, 72 hours under the GDPR).

## 10. Minors

The App is not directed at children under 13 and we do not knowingly collect their data. Minors under 18 may use it only with the permission and under the responsibility of their legal guardian, who accepts these documents on their behalf. We do not use data or images of minors' channels for promotion. If we detect data of a minor without authorization, we will delete it.

## 11. California and other US state residents

We do not **sell** personal data or **share** it for cross-context behavioral advertising. If you live in California or another state with a privacy law, you can ask to know what data we hold, correct it or delete it, and we will not discriminate against you for exercising those rights. Requests are handled through the same channels as section 6 (response within 45 days at most).

## 12. Our website

The site is static, **uses no cookies** and has no forms that collect personal data. We measure visits with a self-hosted **Umami** instance, without cookies and without building profiles. Typography is loaded from **Google Fonts**, so your browser queries Google servers.

## 13. Changes to this policy and record of acceptance

We store the version of this policy you accepted and the date. The installer shows it to you on every installation and update, and you must accept it again each time. We will publish the updated version with its effective date and notify you in the App when the change is relevant. If the change expands the use of your data, we will ask for your consent again where the law requires it.

## 14. Contact

Controller: **iKhunsa** (Ecuador) · info@tiklivetts.es · Discord: <https://discord.com/invite/mwY859tcQK> · Repository: <https://github.com/iKhunsa/tiktok-tts>
