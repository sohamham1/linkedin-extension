# LinkedIn Hiring Post Detector

LinkedIn is full of posts that mention hiring without actually pointing to a real, live opportunity. This extension adds a simple in-feed label so you can quickly tell which posts look actionable and which ones are probably noise.

It runs locally in your browser and is designed for people who want to scan LinkedIn faster without giving their data to another service.

## Why use it

If you job hunt, source talent, track hiring signals, or just do not want to read every vague "we're growing" post manually, this extension helps you:

- spot likely live openings faster
- avoid wasting time on reflections, announcements, and referral posts
- notice when a role appears to be closed
- scan the home timeline with less friction
- keep a small saved list of posts worth revisiting

## What it does

On supported LinkedIn post surfaces, the extension adds one of four labels:

- `Open`: strong signal that the post is about an active opening
- `Closed/Filled`: the role appears to be filled or no longer accepting applicants
- `Maybe`: hiring is mentioned, but the post is not clear or actionable enough yet
- `No Opening`: the post is probably not a real opening

The extension also treats LinkedIn's own native in-post job cards as a strong signal. If LinkedIn attaches a real `View job` module to a post, that post is treated as an opening.

It also includes a lightweight saved-posts workspace. Posts marked `Open` or `Maybe` can be collected automatically, reviewed in one place, edited, and removed when you are done with them.

## What counts as a benefit

This extension is most useful if you want to reduce false positives from posts like:

- `Open to work` or layoff/referral posts
- personal career updates and new-role announcements
- advice threads and thought pieces
- consulting or lead-generation posts that mention hiring language

It does not replace judgment. It helps you decide what to open first.

## Where it works

The extension is intentionally narrow.

It is active on:

- the LinkedIn home feed
- single post pages

It stays out of places where it is not useful, including:

- notifications
- messaging
- jobs pages
- my network pages
- profile pages
- comments and replies inside a post thread

## Privacy

Privacy is a core part of the product:

- no backend
- no analytics
- no cloud AI
- no API keys
- no account linking
- classification happens locally in the browser
- saved posts are stored locally in your browser extension storage

This is not a SaaS tool watching your feed from somewhere else. The logic runs on your machine.

## Installation & Compatibility

### Compatibility
- **OS:** Works on **Windows, macOS, and Linux** (not restricted to Windows).
- **Browser:** Officially supported on **Google Chrome** (and Chromium-based desktop browsers like Edge or Brave). **Not** supported on Firefox, Safari, or mobile browsers (since mobile Chrome does not support extensions).

### How to Install & Run
1. Download or clone this repository to your computer.
2. Open Google Chrome and go to `chrome://extensions/`.
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (button in the top-left corner).
5. Select this project folder (the folder containing `manifest.json`).
6. Navigate to [LinkedIn](https://www.linkedin.com/feed/) to run the extension.

## How to use it

1. Open your LinkedIn home timeline or a single post page.
2. Scroll normally.
3. Look at the pill shown on supported posts.
4. Prioritize `Open` first.
5. Treat `Maybe` as worth checking manually.
6. Open the saved-posts workspace from the extension button when you want to review `Open` and `Maybe` posts together.
7. Edit or remove saved rows as you work through them.
8. Treat `No Opening` as likely non-actionable for hiring.

In some cases, the pill may also show lightweight company context to make scanning faster.

## What it is not

- not a scraper
- not an auto-apply tool
- not a LinkedIn bot
- not a resume or outreach assistant
- not a guarantee that every `Open` post is valid

## Known limitations

- currently English-first
- depends on LinkedIn's DOM and UI structure, which can change
- heuristic classification can still be wrong on edge cases
- `Maybe` posts will still require human judgment

## For developers

If you want to test or inspect the project locally, see [TESTING.md]

