# App.tsx decomposition — slice 18 candidate boundaries (fresh survey)

Status: A `useSaveLoad` IMPLEMENTED LOCALLY 2026-07-26 (`make check` 1166; commit/post-commit AGY pending). Owner next picks B or closes the App.tsx half.
Fresh full-file survey of `App.tsx` at **979 lines** (post slice 17, `8782d70`), 21 hooks
extracted. Vocabulary: `$codebase-design` (depth = small interface hiding real behavior).

Honest headline: the file is now well-factored. What remains is **moderate**-depth — nothing
left matches the slice 15/16 tier. Candidates below are ranked by depth; after A+B (and
optionally C/D) the file floors around ~850 lines of mostly wiring + JSX, and the track is a
reasonable candidate for **declaring done** rather than forcing further slices.

## Candidate A — `useSaveLoad` (recommended — deepest remaining)

- Scope: modal state `saveLoadModal`/`saveLabelInput` (`App.tsx:104,107`), slot list
  `saveSlots` (`103`), the pre-connect slot prefetch effect with cancellation
  (`277-290`), and the `onLoadSlot` restore-then-resume orchestration (`935-952`) —
  the subtle sequencing where a manual slot must POST `apiLoadSlot` server-side FIRST
  so the subsequent resume serves the restored moment (bookmark slots no-op).
- Interface: `useSaveLoad({ inviteGate, connected, startScreenPlayerId, onResume:
  handleResumeGame }) → { saveLoadModal, openSave, openLoad, closeModal, saveSlots,
  setSaveSlots, saveLabelInput, setSaveLabelInput, loadSlot }`. `setSaveSlots` stays
  exposed (written by `useDataLoaders`), same pattern as `useTypewriter`'s setters.
- Depth: hides the prefetch lifecycle (gate + cancellation + silent-fail policy), the
  restore-first ordering, and modal/label state. The ordering comment (`937-939`) is
  exactly the kind of trap that wants one owner.
- Risk: low-medium. Behavior-preserving; save/load is covered by objective QA
  (save/load assertions passed in three AGY runs) and Playwright E2E.
- Est. −55 lines (state + effect + handler bodies; `<SaveLoadModal>` JSX stays).

## Candidate B — `useEpiphanyBanner` (lowest risk; correctly unblocks the slice-16 reject)

- Scope: `dismissedEpiphany` state + localStorage init (`112-118`), the `epiphanyNotice`
  memo (`564-567`), `dismissEpiphany` (`569-576`).
- The slice-16 doc rejected `<EpiphanyBanner>` as a **component** because `tabNotices`
  (`603`) also reads the notice, so the computation had to stay in App. A **hook** dissolves
  that objection: it owns dismissal persistence + derivation and returns `{ notice, dismiss }`
  for both the banner JSX and `tabNotices`.
- Depth: modest but real — dismissal identity (per-loop), storage failure policy, derivation
  from `runsHistory`/`scenarios`. Banner JSX (`686-710`) can stay or move; the behavior is
  the hook.
- Risk: lowest. Pre-connect UI + one memo.
- Est. −25 lines.

## Candidate C — `useTabs` (moderate; interface width is the risk)

- Scope: `activeTab` (`97`), `tabNotices` memo (`595-607`), `handleTabClick` + lazy
  `loadCodex` routing (`609-614`), `swipeTabs`/`useTabSwipe` wiring (`620-627`).
- Interface in: snapshot/runsHistory/codexLists/showInGameNotice/epiphanyNotice/
  skillNotice/isAdmin/loadCodex (~8) → out: activeTab/setActiveTab/handleTabClick/
  tabNotices/tabSwipe/swipeTabs (~6). Hides notice policy + swipe routing + lazy loading,
  but the in/out width brushes the slice-14 props-bundle smell. Only take it if A/B land
  clean and the owner wants one more.
- Est. −35 lines. Risk: medium (touch swipe surface is live-QA-visible).

## Candidate D — `useItemNotice` (small, genuine)

- Scope: `itemNotice` state + timer ref (`99-100`), `onItemsGained` callback body
  (`330-337`), banner JSX (`760-769`). Real timer lifecycle (clear-then-rearm, 6s
  auto-dismiss). Carried from the slice-16 doc's mention-only list.
- Interface: `useItemNotice() → { itemNotice, showItems, clear }`.
- Est. −15 lines. Risk: low. Good "small slice" if a light iteration is wanted.

## Explicitly rejected (unchanged reasons)

- Body-class/SFX-warm effects (`486-514`) and BGM autostart (`200-212`): side-effect-only,
  return nothing — shallow. The intro-accept BGM cascade (`747-755`) belongs to `useAudio`
  if touched at all, and is feel-sensitive (owner-audible) — leave.
- Any props-bundle re-attempt (`useViewModels` class): deliberate human revert.
- `logToConsole`/misc single-line wiring: moving it is churn, not depth.

## Recommendation

**A (`useSaveLoad`)** for the last real depth win, then **B (`useEpiphanyBanner`)** as the
clean small follow-up. After those, propose closing the App.tsx half of the track and moving
the decomposition focus to `CombatCinema` (the other named god-component) or declaring M-done.

## Done criteria (per track rules)

One slice per iteration, behavior-preserving; `make check` green (frontend-lint/build) +
post-commit AGY live-QA not FAIL/NEEDS. Candidate A's load path additionally wants one manual
slot-load smoke (load a manual slot → restored scene serves, not the live head).
