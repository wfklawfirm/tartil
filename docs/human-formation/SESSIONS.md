# Session Planning Engine (TARTIL 14.1، البند 5 و16)

طبقة بيانات إضافية تحوّل مراحل البرنامج (`programs.json`) إلى جلسات قابلة للتنفيذ. لا تعدّل `programs.json` ولا الدروس ولا الواجهة الحالية.

## الملفات
- `docs/human-formation/sessions/<PXX>.json` — مصدر الحقيقة لجلسات برنامج واحد: `{program, status:"draft-unreviewed", total_sessions, sessions:[…]}`.
- `scripts/draft_sessions.py PXX…` — يشتق مسودة من `programs.json` ومن الدروس (لا يخترع محتوى).
- `scripts/build_sessions.py` — يجمع الملفات في `packages/web/academy-sessions.json` و`packages/web-vercel/academy-sessions.json` (نسختان متطابقتان؛ الواجهة تتجاهل الملف إن غاب).
- `scripts/validate_sessions.py` — التحقق (خطأ يفشل، وWARN تنبيه).

## مخطط الجلسة
`session_number` (متسلسل من 1)، `week`، `stage`، `title`، `competency` و`competency_title`، `objective`، `min_age`، `duration_min`، `components[]`، `homework` (اختياري)، `review_status: "unreviewed"`.

المكوّن: `{type, minutes, ref:{kind,id}, text}` حيث `type` من: `intro`، `source_teaching`، `interactive_practice`، `reflection`، `assessment`. و`ref` يشير إلى درس أو سيناريو موجود (`kind` = lesson | scenario). الواجب `homework`: `{optional, out_of_session:true, text, estimated_minutes, ref}`.

## قواعد الزمن
1. مجموع `minutes` يساوي `duration_min` تمامًا، والواجب لا يدخل فيه (هو خارج الجلسة دائمًا).
2. جلسة الدرس: `duration_min` هو زمن الدرس الحقيقي، وتُقسَّم دقائقه على المكوّنات من إزاحات `guide_script`: الخطوة الأولى مقدمة، الثانية تعليم من المصدر، الأوسط ممارسة تفاعلية، الأخيرة تأمل. لا حشو ولا تمديد إلى زمن الإيقاع.
3. `assessment` تقويم تكويني وصفي أثناء الممارسة: `minutes: 0` مع `embedded_in:"interactive_practice"` ومعاييره من `formative` في الدرس. لا يُسمح بصفر دقائق لغيره.
4. جلسة السيناريو (لا زمن منشور له): مقدمة 2 د + قرارات متتابعة بمعدل 2 د للقرار (عمق أطول مسار قرار) + تأمل نهاية 2 د. لا توجد خطوة `source_teaching` فيها لأن القصة هي المصدر.
5. تقدير الواجب: 3 دقائق لكل خطوة من `life_practice`، وبحد أدنى 10 دقائق.
6. تنبيهات غير مانعة: زمن جلسة يزيد على إيقاع البرنامج، أو أسبوع يتجاوز `duration_weeks`، أو أكثر من الجلسات المعلنة في الأسبوع. هذه إشارات إلى أن `programs.json` يحتاج قرار نطاق (تقليص أو دمج أو إعادة ترتيب)، ولا يُعالَج بحشو أو بحذف.

## قواعد المحتوى
- العمر: `min_age` = الأكبر بين `min_age` الوحدة وعمر الدرس/السيناريو، ولا يتجاوز `age_min` للبرنامج.
- لا لغة تقييم: درجات، نقاط، ترتيب، لوحة شرف (نفس نمط `validate_programs.py`).
- العنوان بالعربية ولا يحتوي معرّفات تقنية (K1-L1، P06، SPR-…).
- كل ref موجود وkind صحيح ومن كفاية البرنامج نفسه؛ وتسلسل الجلسات يطابق عناصر المراحل في `programs.json`.
- كل شيء `draft-unreviewed` و`review_status: "unreviewed"` إلى أن تتم المراجعة المسمّاة.

## إضافة برنامج جديد
1. تأكد أن مراحل البرنامج في `programs.json` ومراجعها صحيحة (`python3 -I scripts/validate_programs.py`).
2. `python3 -I scripts/draft_sessions.py PXX` لإنتاج `sessions/PXX.json`، ثم حرّر العناوين/الترتيب يدويًا عند الحاجة دون اختراع محتوى.
3. `python3 -I scripts/build_sessions.py && python3 -I scripts/validate_sessions.py`.
4. اقرأ التنبيهات: إن كان البرنامج يحتاج جلسات أكثر أو أقل من إيقاعه المعلن فهذا قرار نطاق للمالك.
