# Saved Estimates — Reference Guide

Everything the database phase (Save Estimate, View Estimates, sign-in) actually
does, in plain language. If something here doesn't match what you're seeing in
the app, that's a bug — flag it.

---

## What this phase added

Before this, the estimator was a calculator only — build an estimate, export
it to Word, and it's gone the moment you close the tab. Now:

- Every estimate can be **saved** to a real database and reopened later.
- A **My Estimates** list lets you search, sort, and browse everything you've
  saved.
- The whole app is **locked behind a sign-in** — nobody can see or use it,
  not even the calculator, without logging in as you.

The Word export still works exactly the same as before and is completely
independent of saving — you can export, save, both, or neither, in any order.

---

## Signing in / out

- **Sign In**: email + password, on a screen that appears before anything
  else loads. There is no "browse without logging in" mode.
- **Staying signed in**: once you log in, you stay logged in — closing the
  tab or restarting your browser won't log you out. This was a deliberate
  choice for convenience, since you're the only person using this daily.
- **Sign Out**: in the header of every screen. Use it when:
  - You're on someone else's computer and want to make sure the next person
    who opens that browser doesn't land straight into your estimates.
  - You're getting rid of a device (selling it, sending it in for repair,
    handing it down).
  - Something feels off and you want to end that session immediately.
  - **Heads up**: Sign Out ends the session on *every* device you're signed
    in on, not just the one you clicked it from. If you're signed in on your
    laptop and phone and hit Sign Out on the laptop, you'll need to sign back
    in on the phone too.
- **Change Password**: also in the header, while signed in. It asks for your
  **current** password first, then the new one twice. Requiring the current
  password matters if a device is ever left signed in and unattended — it
  stops someone from hijacking that open session to lock you out by changing
  the password without knowing it.
- **Forgot Password**: on the sign-in screen. There's no email field to fill
  in — since there's only ever one account, it just sends the reset link
  straight to your email. Click the link in that email and you'll land on a
  "set a new password" screen inside the app.
- **Who else can get in?** Nobody, unless you hand them your email and
  password directly. There's no sign-up option — account creation is turned
  off at the database level (not just hidden in the UI), so no one can create
  a second account even if they found the app's URL.

---

## Saving an estimate

Click **Save Estimate** any time after selecting at least one category. What
happens depends on whether this estimate has been saved before:

**Never saved before:**
> "Save 'Acme Corp's Estimate' to your estimates?" — **Cancel** or **Yes, Save**

Confirm, and it's written to the database. The button flashes "Saved ✓" for
about two seconds (and is unclickable during that time, so mashing the button
can't create duplicates).

**Already saved (or just opened from the list):**
The app re-checks the database fresh every time — it doesn't trust its own
memory — then asks:
> "'Acme Corp's Estimate' already has a saved version. Overwrite it, or save
> this as a new related estimate?" — **Cancel / Save As New / Overwrite**

- **Overwrite** replaces the saved version with whatever's currently on
  screen. The Open/Closed status of that estimate is untouched either way.
- **Save As New** keeps the original exactly as it was and creates a
  completely separate, independent copy with a new ID. Useful for "I want a
  Phase 2 version but need to keep Phase 1 intact," or trying a different
  scope without losing what you had.

**Blank Company/Course name** — if you save without filling either in, it's
stored as **"Unnamed"** rather than blank, so it's never a mystery entry in
the list. You can rename it later (see below).

---

## Browsing — My Estimates

Click **View Estimates** to open the list. A few things worth knowing:

- **5 estimates per page.** Once you have more than 5, Previous/Next buttons
  appear. (Kept deliberately small since this is roughly a 50-estimates-a-year
  tool, not hundreds.)
- **Search** looks at Company name and Course name at the same time,
  case-insensitive.
- **Sort** options: Most Recent (default), Most Profitable, Margin %,
  Alphabetical.
- **Categories column** — if the list of categories is cut off, double-click
  it to expand and see the full list. Double-click again to collapse. Hovering
  also shows the full list as a tooltip.
- **Renaming inline** — double-click the Company or Course name directly in
  the list to edit it right there. Press Enter or click away to save, Escape
  to cancel. This updates the database immediately, no separate save step.
  If you rename the estimate that's currently open in the estimator, the
  Company/Course fields there update live too.
- **Status (Open/Closed)** — click the pill to toggle it. Instant, no
  confirmation needed.
- **Opening an estimate** — click **Open Estimate**, confirm, and everything
  comes back exactly as it was saved: every task, hour, checkbox, ADA toggle,
  module count, additional video — nothing is approximated.
- **Deleting an estimate** — click **Delete**, confirm. This is a genuine,
  permanent delete — see the "Free tier" section below for what that means in
  practice.

---

## "You're currently working on X" — the unsaved-changes warnings

These exist specifically so you never lose real work by accident, without
being naggy about it. Two situations trigger a warning, and — importantly —
**both only fire if there's actually something to lose.** If you've saved
recently and haven't touched anything since, no warning appears at all,
because there's nothing to warn about.

**Clicking View Estimates with unsaved work:**
> "You're currently working on 'X's Estimate'. Save it before browsing, or
> continue without saving?" — **Cancel / Continue Without Saving / Save & Continue**

**Clicking Open on a different estimate while you have unsaved work:**
> "You're currently working on 'X's Estimate'. Opening 'Y's Estimate' will
> replace it — save your current work, or discard it?" — **Cancel / Discard & Open / Save & Open**

Both "Save & ___" options save immediately with no second confirmation dialog
— clicking that button *is* the confirmation. If the save itself fails (e.g.
a dropped connection), nothing is lost and nothing navigates away; you stay
right where you were.

**What this does NOT protect against:** closing the browser tab or refreshing
the page without clicking Save first. That was a deliberate choice — there is
no autosave, and no "are you sure you want to leave" browser popup. If you
close the tab mid-edit without saving, that work is genuinely gone. Save
Estimate is the one real save point in this whole system.

---

## Supabase (the database) — what it can actually handle

**Storage isn't something you need to think about.** A fully-loaded estimate
(all three categories, several modules, extras) measures out to roughly 16 KB.
The free database plan gives 500 MB of storage — enough for around 30,000
estimates, or 600+ years at the pace of ~50 a year. Storage will never be the
reason to upgrade.

**What actually matters on the free plan:**

- **No automated backups.** No "restore to yesterday" button exists. If you
  delete something by mistake and confirm the delete, it is gone for good —
  the confirmation dialog is the only safety net there is.
- **The project pauses itself after about a week of no activity.** Nothing is
  lost, but the next time the app is used, it may need a minute to "wake up"
  (or, rarely, need a manual resume from the Supabase dashboard). If this
  tool goes untouched for a stretch, don't be alarmed if the first load is
  slower than usual.

**When would upgrading to Supabase Pro ($25/month) actually make sense?**
Only if either of the two points above start to genuinely matter:
- You want real daily backups and the ability to restore a previous day's
  data — for example if the estimates in here become business-critical
  enough that "we deleted the wrong thing" would be a real problem, not just
  an annoyance.
- The auto-pause behavior becomes disruptive because the tool goes quiet for
  a week or more at a stretch regularly.

Until either of those becomes a real pain point, the free plan is genuinely
sufficient — there's no storage or performance reason to pay for Pro at this
scale.

---

## Security, in plain terms

- The database enforces its own access rules independently of the app — even
  if there were ever a bug in the website itself, the database refuses to
  hand over or accept data for anyone who isn't signed in as you. This was
  tested directly against the live database, not just assumed from reading
  the code.
- Passwords are never stored or handled by this app directly — that's all
  managed by Supabase using standard, industry-normal practices.
- Signing up for a new account is turned off at the database level. Verified
  directly — an actual signup attempt is rejected outright, it's not just a
  hidden button.
- The one real limitation: since there's only one login, sharing that
  password with someone means sharing full access with no way to tell who
  did what. If you ever need to hand off temporary access, that's the
  tradeoff to know about.
