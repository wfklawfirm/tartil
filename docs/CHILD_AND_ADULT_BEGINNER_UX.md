# Child and adult beginner UX

## Principles
1. One clear task on screen. 2. Large touch targets (>=56px buttons for the learner flow). 3. No typing needed by a child. 4. Arabic-first, RTL, short sentences. 5. Dignity for adults: no childish framing, no «أمي», no public comparison. 6. Completion is not mastery: the UI says so on the "no homework" screen and in the foundations quiz.

## Screens (built, tested in a real browser at 320/390/1440, light + dark)
- **واجبي اليوم** (`#/app/<inst>/homework` for a student): one card: title, passage link to the mushaf, repeat count, minutes, due date, teacher note after a retry request; buttons: *Start*, *I finished* (or *Record* for audio homework), *I need help or time*.
- **Guardian view**: pick the child; sees the same card; may mark done-mode homework for the child; may report an obstacle or ask for time. Audio homework must be recorded by the child on a guardian-managed device (see CHILD_SAFETY_AND_ACCESS).
- **Foundations** (`#/foundations`): see FOUNDATIONAL_LEARNING_ARCHITECTURE.md.

## Accessibility evidence
axe-core (wcag2a/2aa/21aa/22aa): 0 violations on the homework pages (learner + teacher, light + dark) and on all five foundations tabs. Horizontal-overflow sweep at 320/390/1440: none. Screen-reader labels on letter cards (`role=group`, `aria-label`). Not yet done: manual screen-reader pass, switch-access and reduced-motion audit (no animation is used so far).

## Open items
Illustrations/mascots for kids mode (none, deliberately); recorded audio prompts (blocked, see above); real-device iPhone check (waiting on owner screenshots).
