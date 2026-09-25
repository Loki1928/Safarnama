# Safarnama — Project Progress & Handoff File (v1)

> Memory file for **Safarnama**. Upload it at the start of every new Claude chat about Safarnama, plus any code files you want changed.
> **Wayfare is separate and untouched.** Its file stays `Wayfare_Progress_v7.md`. The Wayfare `index.html` (live, used daily by Lokendra and his roommate) now also has a "record payments" settle-up feature that isn't in the v7 notes.

## What Safarnama is
A travel social web app where every trip shows the **full per-person cost** (stay, travel there and back, food, activities, other), so people can plan from real numbers instead of clickbait "₹3,000 trip" videos. Instagram-style feed, likes, comments, saves, profiles, and destination search with price stats.

**The core edge (don't lose it):** costs backed by a logged expense ledger. Phase 1 posts are "Self-reported". Phase 2 adds trips logged with the group expense tracker, labelled **"Backed by N logged expenses"**. The label is deliberately not "Verified": a determined liar can fake a ledger, so we claim only what's true.

## Strategy decisions (Session 1)
- Pivot from "ship Wayfare as a quiet tool" to **building the social product now**, as Safarnama.
- Wayfare stays live and unchanged. Safarnama is a new repo and a **new Firebase project**, with zero risk to Wayfare data.
- SWOT (short version):
  - **Strengths:** ledger-backed costs; content is a byproduct of expense logging; existing working trip tool; cheap to run.
  - **Weaknesses:** zero users/content (cold start); publishing is altruistic; 2-person team; ongoing moderation.
  - **Opportunities:** growth in Indian group travel; low trust in influencer content; destination pages with median real costs.
  - **Threats:** Tripoto (Delhi, founded 2013, ~$7.6M raised) already did UGC trip stories and moved toward selling group trips. Instagram/YouTube habits. AI search answers. The name "Safarnama" is crowded (IIT Ropar Play Store app, an iOS journal app from Jul 2026, a Delhi heritage app, a netlify "social media for travellers" site, a TV series).
- **Name:** "Safarnama" is the working name only. Pick an ownable name before public launch. It is centralised in `js/config.js` → `APP.name`.

## Live / accounts
- Repo (to create): `github.com/Loki1928/Safarnama` → `https://loki1928.github.io/Safarnama/`
- Firebase: new project (Spark), Firestore in asia-south1, Google sign-in.
- Cloudinary: existing account `ddtrgzata`, new unsigned preset `safarnama_unsigned`, folder `safarnama`.

## Code structure (Phase 1)
```
index.html                shell only (sidenav / topbar / view / tabbar)
css/base.css              tokens + reset
css/app.css               all components
js/config.js              Firebase + Cloudinary config + APP name
js/firebase.js            pinned Firebase 10.12.2 imports, re-exports
js/state.js               tiny store (user, profile, profileError, authReady)
js/router.js              hash router with guard + cleanup + stale-render protection
js/shell.js               nav chrome
js/icons.js · ui.js · constants.js · authGate.js
js/services/auth.js       Google popup sign-in, delete user
js/services/db.js         every Firestore read/write
js/services/upload.js     compress (1600px JPEG) + Cloudinary upload with progress
js/components/postCard.js card, like/save/share/menu/report, hydrate
js/pages/*.js             feed, explore, post, create (+edit), profile (+me, saved), settings (+about), onboarding, setup, common
firestore.rules           security rules (must be published)
SETUP.md                  step-by-step setup + test checklist
```

## Data model (Firestore)
- `usernames/{name}` → `{uid}` (unique registry, created in the same batch as the user)
- `users/{uid}` → `{uid, username, name, photoURL, bio, homeCity, createdAt}`; `users/{uid}/saved/{postId}` → `{savedAt}` (private)
- `posts/{id}` → `{uid, authorName, authorUsername, authorPhoto, title, destination, destKey, startCity, month 'YYYY-MM', days, people, tripType, travelMode, costPerHead (₹ int, per person), breakdown{stay,travel,food,activities,other}, highlights, tips, places[{name,type,cost|null,note}], photos[url], source:'manual', likeCount, createdAt, updatedAt?}`
- `posts/{id}/likes/{uid}` → `{createdAt}`; `posts/{id}/comments/{cid}` → `{uid,name,username,photo,text,createdAt}`
- `reports/{id}` → `{postId, uid, reason, note, createdAt}` (write-only; review in the console)

## Security rules highlights
Users write only their own docs; field whitelists and size caps; enum checks; author name/username must match the user's profile (no impersonation); likeCount can only move by ±1 **paired** with creating/deleting that user's like doc (likes can't be faked); comments are deletable by the commenter or the post owner; `verified`-style fields can't be written by clients.

## Known limitations (honest list)
1. Costs are self-reported in Phase 1.
2. Deleting a post or account doesn't delete photo files on Cloudinary (unsigned uploads can't delete). Orphan like/comment docs stay in Firestore but are invisible.
3. No rate limiting or spam protection beyond sign-in. Moderation is manual via `reports`.
4. Search is an exact match on the destination's first part ("Manali" ≠ "Old Manali").
5. Each card checks liked/saved state (2 reads per card, cached per session). Fine within the Spark tier (50k reads/day) for testing.
6. Name changes don't rewrite old posts/comments until they are edited.
7. Google sign-in fails inside some in-app browsers (Instagram); the user must open the link in Chrome/Safari.
8. No follow system, notifications, or offline mode yet.
9. The code was reviewed carefully but **not yet run in a browser** by Claude. The first real run may surface bugs. Bring the console error.

## Phase plan
- **Phase 1 (done, Session 1):** social core as above.
- **Phase 2:** port the Wayfare trip tool into Safarnama as private "Trips" (group ledger, settle-up with the recorded-payments logic carried over **byte-identical**, places, notes) on Firestore with sign-in-based membership; one-tap **Publish from trip** that computes per-person cost from the ledger and shows "Backed by N logged expenses" with an itemised, locked ledger view.
- **Phase 3:** follow/following feed, notifications, better destination pages (aliases, per-month medians), moderation view, Cloudinary cleanup, rate limits, final name + domain.

## Session log
**Session 1 (25 Sep 2026):** SWOT and competitive check (Tripoto, name collisions). Decided the Safarnama pivot on a separate repo and Firebase project. Built Phase 1 (≈20 files). Received the current Wayfare index.html (with payments feature) for Phase 2 reference; left it untouched.

**Next session starts at:** run SETUP.md → deploy → complete the test checklist with the roommate → bring bugs and console errors → then Phase 2.
