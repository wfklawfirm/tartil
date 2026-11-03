# Home learning x AI / tasmi' integration

- Homework **never** waits on AI. Submission works with no AI, no storage and no network beyond the API.
- A student may attach their own tasmi' attempt (`attemptId`, from `/me/recitations`): the server copies only `result.summary` into `homework_submissions.ai_hypothesis` as `{kind:'machine_hypothesis', notAGrade:true, ...}`. The teacher sees it labelled «فرضية آلية غير معتمدة (ليست تقديرًا)». It never changes status.
- The engine itself (OpenAI whisper-1 word timestamps -> normalisation -> Needleman-Wunsch alignment) is documented in KNOWN_LIMITATIONS §37: pronunciation, tajweed and calibrated confidence are NOT assessed; audio is not stored by that path.
- **Live blocker:** the OpenAI call currently returns HTTP 429 (quota/billing/rate limit on the owner's key). Not resolvable from here; the owner must check the OpenAI account. The UI for audio homework uses the *private-storage* path (not OpenAI), which is independent of this blocker.
- UI does not yet offer "attach my tasmi' result" inside the homework card (API supports it); listed as next step.
