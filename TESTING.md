# Testing the LinkedIn Hiring Post Detector

## 1. Classifier smoke test

Run this in the project folder:

```powershell
node .\scripts\run-classifier-smoke-test.js
```

This checks a few high-signal examples for:

- `Open`
- `Closed/Filled`
- `Maybe`
- `No opening`

## 2. Load in Chrome

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click `Load unpacked`
4. Select `D:\Soham\Coding Projects\linkedin-extension`

## 3. LinkedIn live checks

Open `https://www.linkedin.com/feed/` and verify:

- visible posts get badges quickly
- new posts get badges as you scroll
- obvious hiring posts become `Open`
- closed update posts become `Closed/Filled`
- career-story posts become `No opening`
- truncated uncertain posts may start as `Maybe` and later improve

## 4. If badges do not show

Check the page console on LinkedIn and look for errors from these files:

- `src/content.js`
- `src/feed-observer.js`
- `src/text-resolver.js`
- `src/injected-page-hook.js`

The most likely issue is that LinkedIn changed feed selectors or text containers.

## 5. If labels show but seem wrong

Collect 5 to 10 examples for each mistake type:

- should be `Open` but showed `Maybe` or `No opening`
- should be `Closed/Filled` but showed `Open`
- should be `No opening` but showed `Maybe` or `Open`

That gives us the fastest path to tune the heuristics in `src/classifier.js`.
