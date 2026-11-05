# جرد المحتوى القائم — TARTIL_EXISTING_CONTENT_INVENTORY

> تاريخ الجرد: 2026-11-05. مصدر الأرقام: سكربتات `python3 -I` صغيرة (وقراءة نصية للملفات) على نسخة المستودع الحالية، لا تقديرات. أي رقم لم يُحسب فعلاً مكتوب فيه «غير معروف». مرجع الطلب: TARTIL MASTER PROMPT V3 §3.2. الجرد للقراءة فقط: لم يُعدَّل أي ملف آخر ولم تُلمس قاعدة البيانات (الأرقام من لقطة `db_inventory_2026-11-05.json` المأخوذة بقراءة فقط).

**ملاحظة منهجية.** لا يوجد محتوى أكاديمي (P01–P25) في قاعدة البيانات؛ هو ملفات JSON ثابتة تُبنى في `packages/web*/academy-*.json`. كل المحتوى الأكاديمي حالته `draft-unreviewed` (لا اعتماد علمي ولا تربوي ولا حماية طفل). لم يُفحص أي مخزن خارج المستودع (لا صلاحية)، ولم يُفحص الموقع المنشور.

## 0. ملخص الأرقام (محسوبة)

| البند | العدد | طريقة الحساب |
|---|---|---|
| برامج (programs.json) | 25 | len(programs) |
| فئات عمرية (bands) | 8 | len(bands) |
| مراحل (stages) داخل البرامج | 81 | مجموع stages |
| عناصر مرتبطة بالبرامج (دروس+سيناريوهات) | 532 | مجموع items؛ كلها مرجعات فريدة |
| منها optional_link | 54 | items بحقل role |
| ملفات الدروس lessons_*.json | 52 | glob |
| وحدات (units) | 96 | مجموع units |
| دروس (lessons) | 347 | مجموع lessons في الوحدات |
| سيناريوهات (scenarios) | 185 | مجموع scenarios |
| عقد سيناريو (nodes) / خيارات | 1367 / 1537 | حساب من nodes[*].choices |
| أنشطة داخل الدروس (activities) | 1023 | مجموع activities |
| جلسات (sessions/P*.json) | 532 | مجموع sessions |
| أدلة (guides/P*.json) | 25 | ملف لكل برنامج: for_guide + for_parent + faq |
| كفايات (competencies.json) | 52 | عدد العناصر؛ 10 مجالات |
| مراسي مصدرية للكفايات (anchors) | 168 | مجموع anchors |
| ملفات مبادئ مستخرجة (extracted/*.json) | 52 | glob |
| مبادئ مستخرجة (principles) | 531 | مجموع principles |
| فجوات مصدرية مسجلة (gaps داخل extracted) | 321 | مجموع gaps |
| كتب مختلفة في books_read (حسب حقل book) | 135 | قيم book الفريدة |
| جداول قاعدة البيانات (لقطة 2026-11-05) | 41 | مفاتيح row_counts |
| جداول معرَّفة في الهجرات 0001–0020 | 53 | عدّ create table |
| مسارات API (app.get/post/…) في packages/api/src | 141 | انظر القسم 3 |
| آيات القرآن في DB / ترجمة | 6236 / 6236 | row_counts |

## 1. المحتوى الأكاديمي الثابت (Human Formation Academy)

الموقع: `docs/human-formation/` (المصدر) ← `scripts/build_academy.py` ← `packages/web/academy*.json` و`packages/web-vercel/academy*.json` (نسخ متطابقة للدروس؛ `cmp` أكّد تطابق academy-lessons.json). الحالة العامة للملفات: `draft-unreviewed`. يراه: مستخدم مسجّل الدخول فقط (المسار `#/academy` يحوّل إلى `#/auth` بلا حساب)؛ التقدّم يُحفظ في localStorage على الجهاز؛ لوحة المراجعة لـ scholarly reviewer فقط.

### 1.1 الفئات العمرية (bands)

| id | العنوان | العمر | البرامج | الواجهة المصرَّح بها |
|---|---|---|---|---|
| b1 | الطفولة المبكرة | 5–8 | P01 P02 P03 P04 P05 P17 P18 P19 | درسي، قصتي، تدريبي، واجبي (رموز كبيرة بلا مصطلحات كبار) |
| b2 | الطفولة الوسطى | 9–12 | P06 P07 P08 P20 P21 P22 P25 | رحلتي، مهاراتي (لغة بسيطة وتأمل خاص) |
| b3 | الناشئة | 13–17 | P10 P11 P23 | رحلتي، مهاراتي، مشاريعي |
| b4 | الشباب | 18–30 | P14 P24 | رحلتي، مهاراتي، مشاريعي (واجهة محترمة غير طفولية) |
| b5 | الأسرة والوالدية | 18–99 | P15 P16 | برامج الأسرة (للبالغين، مع إحالة للمختص) |
| b6 | الحياة المهنية | 16–99 | P12 | مشاريعي |
| b7 | المعلم والمرشد والقائد | 16–99 | P13 | طلابي، برامجي، التقييم |
| b8 | الباحث | 14–99 | P09 | المصادر، البحث |

تحقق: مجموع البرامج في الفئات = 25.

### 1.2 البرامج P01–P25

الحالة (status) كما في الملف: planned=16, pilot=7, adults_gated=2. لا يوجد برنامج بحالة `published`؛ ملف البرامج نفسه `draft-unreviewed`. «يراه» = من يظهر له في الواجهة بحسب `acGated` (برامج `adults_only` تُحجب عن حسابات الطلاب).

| id | الاسم | النوع | الموقع | الحالة | العمر | يراه | الحجم (محسوب) | يعتمد على |
|---|---|---|---|---|---|---|---|---|
| P01 | خطواتي الأولى | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 5–7 (b1) | مسجّلون (ضمن عمر الفئة) | 7 أسبوع؛ 2 مراحل؛ 15 درس + 9 سيناريو؛ 24 جلسة | كفايات: K4 C3 C6 / سابق: — |
| P02 | أضبط نفسي وأسأل وأحفظ | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 7–8 (b1) | مسجّلون (ضمن عمر الفئة) | 7 أسبوع؛ 3 مراحل؛ 16 درس + 9 سيناريو؛ 25 جلسة | كفايات: S5 S4 T1 K4 / سابق: P01 أو ما يعادله; P18 أو ما يعادله (للعادة الصغيرة والروتين الهادئ) |
| P03 | صدقي وأمانتي وبرّي | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 8–8 (b1) | مسجّلون (ضمن عمر الفئة) | 7 أسبوع؛ 3 مراحل؛ 12 درس + 8 سيناريو؛ 20 جلسة | كفايات: C1 C2 R4 / سابق: P01 أو ما يعادله |
| P04 | أرحم وأعدل وأتواضع وأشكر | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 8–8 (b1) | مسجّلون (ضمن عمر الفئة) | 7 أسبوع؛ 4 مراحل؛ 13 درس + 7 سيناريو؛ 20 جلسة | كفايات: C3 C4 C5 C6 / سابق: P01 أو ما يعادله |
| P05 | أسمع وأتكلم وأصاحب | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 8–8 (b1) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 4 مراحل؛ 22 درس + 14 سيناريو؛ 36 جلسة | كفايات: R1 R2 R5 S6 T1 / سابق: P02 أو ما يعادله |
| P06 | أتثبّت قبل أن أصدّق | برنامج | docs/human-formation/programs.json | pilot / draft-unreviewed | 11–12 (b2) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 4 مراحل؛ 12 درس + 8 سيناريو؛ 20 جلسة | كفايات: K1 K2 T2 T5 / سابق: — |
| P07 | أتعلّم كيف أتعامل مع غضبي | برنامج | docs/human-formation/programs.json | pilot / draft-unreviewed | 10–12 (b2) | مسجّلون (ضمن عمر الفئة) | 6 أسبوع؛ 6 مراحل؛ 11 درس + 7 سيناريو؛ 18 جلسة | كفايات: S5 S6 / سابق: P02 أو ما يعادله; P05 أو ما يعادله; P25 أو ما يعادله |
| P08 | أصدقائي وخلافاتي | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 11–12 (b2) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 4 مراحل؛ 14 درس + 9 سيناريو؛ 23 جلسة | كفايات: T1 R2 R3 R4 R5 L4 C4 C5 C1 / سابق: P05 أو ما يعادله |
| P09 | أميّز وأستدل وأبحث | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 14–17 (b8) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 3 مراحل؛ 14 درس + 6 سيناريو؛ 20 جلسة | كفايات: K3 T2 T3 T6 / سابق: P06 أو ما يعادله |
| P10 | أقرر بالشورى | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 14–17 (b3) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 3 مراحل؛ 18 درس + 8 سيناريو؛ 26 جلسة | كفايات: T4 T5 L1 S1 S2 / سابق: P09 أو ما يعادله |
| P11 | مالي ومبادرتي | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 15–17 (b3) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 3 مراحل؛ 10 درس + 5 سيناريو؛ 15 جلسة | كفايات: W2 W4 L4 R3 / سابق: P08 أو ما يعادله |
| P12 | أمانة العمل والعهد | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 16–99 (b6) | مسجّلون (ضمن عمر الفئة) | 6 أسبوع؛ 2 مراحل؛ 9 درس + 4 سيناريو؛ 13 جلسة | كفايات: W1 W3 C2 / سابق: P08 أو P11 أو ما يعادلهما |
| P13 | قائد ومرشد ناشئ | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 16–99 (b7) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 3 مراحل؛ 22 درس + 8 سيناريو؛ 30 جلسة | كفايات: M1 M2 L1 L2 T3 T4 T6 / سابق: P09 أو P10 أو ما يعادلهما |
| P14 | المسؤولية العامة والتقييم العادل | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 18–99 (b4) | بالغون/مرشدون فقط | 8 أسبوع؛ 3 مراحل؛ 10 درس + 6 سيناريو؛ 16 جلسة | كفايات: L3 M1 M2 M3 / سابق: P13 أو ما يعادله |
| P15 | نحو بيت مستقر | برنامج | docs/human-formation/programs.json | adults_gated / draft-unreviewed | 18–99 (b5) | بالغون/مرشدون فقط | 4 أسبوع؛ 2 مراحل؛ 3 درس + 2 سيناريو؛ 5 جلسة | كفايات: R6 R2 R3 C4 / سابق: P08 أو ما يعادله (التواصل وإدارة الخلاف) |
| P16 | تربية أبنائي | برنامج | docs/human-formation/programs.json | adults_gated / draft-unreviewed | 20–99 (b5) | بالغون/مرشدون فقط | 4 أسبوع؛ 2 مراحل؛ 3 درس + 2 سيناريو؛ 5 جلسة | كفايات: R7 R1 C3 / سابق: — |
| P17 | أرحم وأشكر وأسمع قصص السيرة | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 6–8 (b1) | مسجّلون (ضمن عمر الفئة) | 5 أسبوع؛ 3 مراحل؛ 10 درس + 5 سيناريو؛ 15 جلسة | كفايات: H5 C3 C6 / سابق: — |
| P18 | أسمع بهدوء وأرتّب يومي | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 7–8 (b1) | مسجّلون (ضمن عمر الفئة) | 6 أسبوع؛ 4 مراحل؛ 21 درس + 11 سيناريو؛ 32 جلسة | كفايات: S3 K4 R1 / سابق: P17 أو ما يعادله |
| P19 | أمانتي ومثابرتي وأسئلتي وكلامي اللطيف | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 8–8 (b1) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 4 مراحل؛ 23 درس + 10 سيناريو؛ 33 جلسة | كفايات: C2 S4 T1 R2 / سابق: P01 أو ما يعادله |
| P20 | نواة القرآن للصغار: إصغاء وأدب وتعلّم | برنامج | docs/human-formation/programs.json | planned / draft-unreviewed | 9–12 (b2) | مسجّلون (ضمن عمر الفئة) | 6 أسبوع؛ 3 مراحل؛ 11 درس + 6 سيناريو؛ 17 جلسة | كفايات: Q1 Q2 K4 / سابق: P18 أو ما يعادله |
| P21 | الحفظ المنهجي والتدبّر وأثري الخاص | برنامج | docs/human-formation/programs.json | pilot / draft-unreviewed | 12–17 (b2) | مسجّلون (ضمن عمر الفئة) | 6 أسبوع؛ 3 مراحل؛ 12 درس + 7 سيناريو؛ 19 جلسة | كفايات: Q3 Q4 K4 / سابق: P20 أو ما يعادله; P06 أو ما يعادله (لفهم النص في سياقه قبل التدبّر) |
| P22 | السيرة والشمائل والآداب والمسؤولية | برنامج | docs/human-formation/programs.json | pilot / draft-unreviewed | 12–17 (b2) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 5 مراحل؛ 24 درس + 13 سيناريو؛ 37 جلسة | كفايات: H1 H2 H3 S2 X5 / سابق: P20 أو ما يعادله; P25 أو ما يعادله (لتنظيم الوقت والتخطيط) |
| P23 | علوم القرآن والقراءات وتوثيق الأخبار | برنامج | docs/human-formation/programs.json | pilot / draft-unreviewed | 15–17 (b3) | مسجّلون (ضمن عمر الفئة) | 6 أسبوع؛ 3 مراحل؛ 13 درس + 6 سيناريو؛ 19 جلسة | كفايات: H4 Q5 Q6 / سابق: P21 أو ما يعادله |
| P24 | العمل والمعرفة والمهارات اليومية | برنامج | docs/human-formation/programs.json | pilot / draft-unreviewed | 18–99 (b4) | مسجّلون (ضمن عمر الفئة) | 8 أسبوع؛ 3 مراحل؛ 25 درس + 13 سيناريو؛ 38 جلسة | كفايات: W2 W3 T6 K3 S1 T5 T4 / سابق: P06 أو ما يعادله (التثبّت وفهم النص); P09 أو ما يعادله (التمييز والبحث); P10 أو ما يعادله (القرار); P25 أو ما يعادله (مراجعة النفس وتنظيم الوقت) |
| P25 | أرتّب يومي وأراجع نفسي | برنامج | docs/human-formation/programs.json | pilot / draft-unreviewed | 10–12 (b2) | مسجّلون (ضمن عمر الفئة) | 4 أسبوع؛ 2 مراحل؛ 4 درس + 2 سيناريو؛ 6 جلسة | كفايات: S1 S2 / سابق: — |

البرامج المؤجَّلة بقرار سياسة (حقل `deferred_reason` غير فارغ): P11, P15, P16. البرامج التي تحتاج مراجعين مسمّين (`needs_named_reviewers`): كلها (25 من 25)؛ لا يوجد مراجع مسمّى مسجَّل في أي مكان (غير معروف إن كان خارج المستودع).

### 1.3 ملفات الدروس (`lessons/lessons_*.json`) — وحدات ودروس وسيناريوهات

الوحدة (unit) = كفاية واحدة غالبًا (E/AG/X/Y/Z/G = مجموعات إضافية متعددة الوحدات). review_status على مستوى الوحدة؛ على مستوى الدرس: حقل `review_status` موجود في 20 درسًا فقط (القيمة unreviewed) وغائب في 327؛ السيناريوهات بلا حقل review_status إطلاقًا (تُورَّث من الوحدة).

| الملف | وحدات (الكفاية) | وحدات | دروس | سيناريوهات | review_status | min_age |
|---|---|---|---|---|---|---|
| lessons_AG1.json | AG-A(S5) | 1 | 3 | 2 | unreviewed=1 | 10 |
| lessons_AG2.json | AG-B(S5) | 1 | 3 | 2 | unreviewed=1 | 10 |
| lessons_AG3.json | AG-C(S5) | 1 | 3 | 1 | unreviewed=1 | 10 |
| lessons_E1.json | E1-A(K4) | 1 | 3 | 2 | unreviewed=1 | 5 |
| lessons_E10.json | E10-A(K4) | 1 | 4 | 2 | unreviewed=1 | 7 |
| lessons_E11.json | E11-A(C2) | 1 | 3 | 2 | unreviewed=1 | 8 |
| lessons_E12.json | E12-A(C6) | 1 | 4 | 2 | unreviewed=1 | 5 |
| lessons_E13.json | E13-A(R2) | 1 | 4 | 2 | unreviewed=1 | 8 |
| lessons_E14.json | E14-A(S2) | 1 | 4 | 2 | unreviewed=1 | 14 |
| lessons_E15.json | E15-A(M1) | 1 | 4 | 2 | unreviewed=1 | 16 |
| lessons_E16.json | E16-A(S4) | 1 | 4 | 2 | unreviewed=1 | 7 |
| lessons_E17.json | E17-A(K4) | 1 | 4 | 2 | unreviewed=1 | 7 |
| lessons_E18.json | E18-A(S4) | 1 | 4 | 2 | unreviewed=1 | 8 |
| lessons_E19.json | E19-A(R2) | 1 | 4 | 2 | unreviewed=1 | 8 |
| lessons_E2.json | E2-A(C1) | 1 | 3 | 2 | unreviewed=1 | 8 |
| lessons_E20.json | E20-A(S3) | 1 | 4 | 2 | unreviewed=1 | 7 |
| lessons_E21.json | E21-A(H2) | 1 | 4 | 2 | unreviewed=1 | 12 |
| lessons_E22.json | E22-A(T4) | 1 | 4 | 2 | unreviewed=1 | 18 |
| lessons_E3.json | E3-A(C3) | 1 | 3 | 2 | unreviewed=1 | 8 |
| lessons_E4.json | E4-A(R1) | 1 | 4 | 2 | unreviewed=1 | 8 |
| lessons_E5.json | E5-A(C3) | 1 | 4 | 2 | unreviewed=1 | 5 |
| lessons_E6.json | E6-A(S5) | 1 | 3 | 2 | unreviewed=1 | 7 |
| lessons_E7.json | E7-A(R5) | 1 | 4 | 2 | unreviewed=1 | 8 |
| lessons_E8.json | E8-A(T5) | 1 | 4 | 2 | unreviewed=1 | 14 |
| lessons_E9.json | E9-A(M2) | 1 | 4 | 2 | unreviewed=1 | 16 |
| lessons_G1.json | K1(K1), K2(K2), K3(K3), K4(K4), T1(T1) | 5 | 17 | 10 | unreviewed=5 | 5/7/10/12 |
| lessons_G2.json | C1(C1), C2(C2), C3(C3), C4(C4), C5(C5), C6(C6) | 6 | 21 | 12 | unreviewed=6 | 5/6/7/8 |
| lessons_G3.json | S1(S1), S2(S2), S3(S3), S4(S4), S5(S5), S6(S6) | 6 | 18 | 10 | unreviewed=6 | 6/7/8/10 |
| lessons_G4.json | T2(T2), T3(T3), T4(T4), T5(T5), T6(T6) | 5 | 23 | 10 | unreviewed=5 | 10/12 |
| lessons_G5.json | R1(R1), R2(R2), R3(R3), R4(R4) | 4 | 15 | 12 | unreviewed=4 | 6/8/10 |
| lessons_G6.json | R5(R5), R6(R6), R7(R7), W1(W1) | 4 | 15 | 9 | unreviewed=4 | 8/16/18/20 |
| lessons_G7.json | W2(W2), W3(W3), W4(W4), L1(L1), L2(L2) | 5 | 20 | 10 | unreviewed=5 | 12/14/16 |
| lessons_G8.json | L3(L3), L4(L4), M1(M1), M2(M2), M3(M3) | 5 | 19 | 10 | unreviewed=5 | 10/16/18 |
| lessons_H1.json | H1(H1) | 1 | 5 | 2 | unreviewed=1 | 9 |
| lessons_H2.json | H2(H2) | 1 | 4 | 2 | unreviewed=1 | 9 |
| lessons_H3.json | H3(H3) | 1 | 4 | 2 | unreviewed=1 | 11 |
| lessons_H4.json | H4(H4) | 1 | 4 | 2 | unreviewed=1 | 14 |
| lessons_H5.json | H5(H5) | 1 | 4 | 2 | unreviewed=1 | 5 |
| lessons_Q1.json | Q1(Q1) | 1 | 4 | 2 | unreviewed=1 | 7 |
| lessons_Q2.json | Q2(Q2) | 1 | 4 | 2 | unreviewed=1 | 8 |
| lessons_Q3.json | Q3(Q3) | 1 | 4 | 2 | unreviewed=1 | 7 |
| lessons_Q4.json | Q4(Q4) | 1 | 4 | 2 | unreviewed=1 | 10 |
| lessons_Q5.json | Q5(Q5) | 1 | 5 | 2 | unreviewed=1 | 12 |
| lessons_Q6.json | Q6(Q6) | 1 | 4 | 2 | unreviewed=1 | 13 |
| lessons_X1.json | X1-A(W2), X1-B(W3) | 2 | 6 | 4 | unreviewed=2 | 18 |
| lessons_X2.json | X2-A(T6), X2-B(K3) | 2 | 6 | 4 | unreviewed=2 | 16 |
| lessons_X3.json | X3-A(K4), X3-B(K4) | 2 | 6 | 4 | unreviewed=2 | 8/11 |
| lessons_X4.json | X4-A(S3), X4-B(S2) | 2 | 6 | 4 | unreviewed=2 | 6/10 |
| lessons_X5.json | X5-A(X5) | 1 | 4 | 3 | unreviewed=1 | 11 |
| lessons_Y1.json | Y1-A(C3), Y1-B(C6), Y1-C(K4), Y1-D(R1) | 4 | 12 | 5 | unreviewed=4 | 5/6 |
| lessons_Y2.json | Y2-A(C2), Y2-B(S4), Y2-C(T1), Y2-D(R2) | 4 | 12 | 4 | unreviewed=4 | 7/8 |
| lessons_Z1.json | Z1-A(S1), Z1-B(T5), Z1-C(T4) | 3 | 9 | 3 | unreviewed=3 | 15 |

الإجمالي: 52 ملفًا، 96 وحدة، 347 درسًا، 185 سيناريو. كل الوحدات `unreviewed` (Counter({'unreviewed': 96})). وحدات فيها `verse_refs` غير فارغة: 43؛ دروس فيها verse_refs غير فارغة: 0 (حقل verse_refs؛ الوحدات التي لا تحمل الحقل أصلًا: 1، والدروس: 312).

تفصيل كل وحدة (96 وحدة): id، كفاية، عنوان، أقل عمر، عدد دروس/سيناريوهات، البرامج التي تستعملها.

| unit_id | كفاية | العنوان | min_age | دروس | سيناريوهات | الحالة | البرامج |
|---|---|---|---|---|---|---|---|
| AG-A | S5 | أفهم غضبي وأختار تصرفي | 10 | 3 | 2 | unreviewed | P07 |
| AG-B | S5 | أعترض وأتفاهم وأقبل الاعتذار | 10 | 3 | 2 | unreviewed | P07 |
| AG-C | S5 | لستُ وحدي: أطلب العون وأكتب خطتي | 10 | 3 | 1 | unreviewed | P07 |
| E1-A | K4 | أتلو مع معلمي بهدوء: أسمع القديم وأعود برفق | 5 | 3 | 2 | unreviewed | P01 P02 |
| E10-A | K4 | أسمع بهدوء وأنتظر نوبتي: دروس لعمر ٧–٨ بديلة لدروس الصغار | 7 | 4 | 2 | unreviewed | P18 |
| E11-A | C2 | أفي بما قلته: الموعد والإذن | 8 | 3 | 2 | unreviewed | P19 |
| E12-A | C6 | أشكر بلطف: أرى من أحسن إليّ وأذكره وأردّ بما أحب | 5 | 4 | 2 | unreviewed | P01 |
| E13-A | R2 | حين أخالف وحين يجرحني الكلام وحين أجرح: أقول بلطف وأسأل في وقتي | 8 | 4 | 2 | unreviewed | P05 |
| E14-A | S2 | وقتي لي: ثلاث أدوات لأسبوع بقدر طاقتي | 14 | 4 | 2 | unreviewed | P10 |
| E15-A | M1 | أسأل ثم أنتظر وأبني: ما بعد السؤال في جلسة مع زميل أصغر | 16 | 4 | 2 | unreviewed | P13 |
| E16-A | S4 | أصبر خطوة خطوة: صوتان وتعب وعون وكلمة طيبة | 7 | 4 | 2 | unreviewed | P02 |
| E17-A | K4 | أعود حين يشرد ذهني وأجعل للطف عادة: دروس إضافية لعمر ٧–٨ | 7 | 4 | 2 | unreviewed | P18 |
| E18-A | S4 | أكمل بقدري ولا أُخفي تعبي: دروس لعمر ٨ سنوات في الصبر والعودة بعد التعب | 8 | 4 | 2 | unreviewed | P19 |
| E19-A | R2 | كلامي في وقته: أستأذن وأعتذر وأشكر وأتلقى الكلمة الصعبة | 8 | 4 | 2 | unreviewed | P19 |
| E2-A | C1 | أفي بما قلت: الوعد صدق في الغد | 8 | 3 | 2 | unreviewed | P03 |
| E20-A | S3 | عادتي تكبر بهدوء: دروس لعمر ٧–٨ سنوات في تذكيري وراحتي وغايتي وركن مسائي | 7 | 4 | 2 | unreviewed | P18 |
| E21-A | H2 | أتأسّى بالعمل في بيتي وبين أصحابي: أربعة دروس لعمر الثانية عشرة فما فوق | 12 | 4 | 2 | unreviewed | P22 |
| E22-A | T4 | قرارات الراشد: دوافعي، ومشكلتي، وظنّي الراجح، ومشورتي | 18 | 4 | 2 | unreviewed | P24 |
| E3-A | C3 | الرحمة: أسأل قبل أن أساعد | 8 | 3 | 2 | unreviewed | P04 |
| E4-A | R1 | حين يتعثر الكلام بين صاحبين: أنتظر وأسأل وأقول ما جرى | 8 | 4 | 2 | unreviewed | P05 |
| E5-A | C3 | ألطف بما يناسب: أنظر وأسأل ثم أفعل | 5 | 4 | 2 | unreviewed | P01 |
| E6-A | S5 | أُبكّر في هدوئي: شرارتي وأدواتي وما بيدي | 7 | 3 | 2 | unreviewed | P02 |
| E7-A | R5 | أبدأ بتحية، وأقول بلطف، وأفرح لصديقي، وأضع حاجزًا لخطئي | 8 | 4 | 2 | unreviewed | P05 |
| E8-A | T5 | من السبب إلى الخطة: أحلّ مشكلة فريقي بروية | 14 | 4 | 2 | unreviewed | P10 |
| E9-A | M2 | مرشد ناشئ بكرامة: أسأل قبل أن أقول، وأتدرّج، وأصغي لما يُقال لي، وأعرف حدودي | 16 | 4 | 2 | unreviewed | P13 |
| K1 | K1 | فهم الكلام في سياقه | 10 | 3 | 2 | unreviewed | P06 |
| K2 | K2 | أتثبّت قبل أن أصدّق وأنشر | 10 | 3 | 2 | unreviewed | P06 |
| K3 | K3 | نص أم شرح أم رأي؟ | 12 | 5 | 2 | unreviewed | P09 |
| K4 | K4 | أتلو وأحفظ وأراجع برفق | 5 | 3 | 2 | unreviewed | P01 P02 P21 |
| T1 | T1 | أسأل لأفهم | 7 | 3 | 2 | unreviewed | P02 P05 P08 |
| C1 | C1 | الصدق: أقول ما أعرفه وأفي بما قلت | 6 | 4 | 2 | unreviewed | P03 P08 |
| C2 | C2 | الأمانة: أحفظ وأؤدّي | 7 | 3 | 2 | unreviewed | P03 |
| C3 | C3 | الرحمة: أنتبه وألطف | 5 | 3 | 2 | unreviewed | P01 P04 |
| C4 | C4 | العدل والإنصاف: لكل حقه | 8 | 4 | 2 | unreviewed | P04 P08 |
| C5 | C5 | التواضع: أعرف قدري وأقبل الحق | 7 | 4 | 2 | unreviewed | P04 P08 |
| C6 | C6 | الشكر والامتنان: أعرف وأفرح وأعمل | 5 | 3 | 2 | unreviewed | P01 P04 |
| S1 | S1 | أراجع يومي بهدوء | 10 | 3 | 1 | unreviewed | P10 P25 |
| S2 | S2 | أرتب وقتي بقدر طاقتي | 10 | 3 | 1 | unreviewed | P10 P25 |
| S3 | S3 | عادة صغيرة تنمو | 6 | 3 | 2 | unreviewed | P18 |
| S4 | S4 | أستمر خطوة خطوة | 7 | 3 | 2 | unreviewed | P02 |
| S5 | S5 | وقفة قبل الرد | 6 | 3 | 2 | unreviewed | P02 P07 |
| S6 | S6 | أصلح وأكمل | 8 | 3 | 2 | unreviewed | P05 P07 |
| T2 | T2 | التفكير النقدي وكشف المغالطات | 10 | 4 | 2 | unreviewed | P06 P09 |
| T3 | T3 | الاستدلال المنهجي | 12 | 5 | 2 | unreviewed | P09 P13 |
| T4 | T4 | اتخاذ القرار | 12 | 5 | 2 | unreviewed | P10 P13 |
| T5 | T5 | حل المشكلات | 10 | 4 | 2 | unreviewed | P06 P10 |
| T6 | T6 | التعلّم الذاتي والبحث | 12 | 5 | 2 | unreviewed | P09 P13 |
| R1 | R1 | حسن الاستماع: أسكت وأنتبه لأفهم | 6 | 3 | 3 | unreviewed | P05 |
| R2 | R2 | التواصل الواضح اللطيف | 8 | 4 | 3 | unreviewed | P05 P08 |
| R3 | R3 | إدارة الخلاف وحل النزاع | 10 | 4 | 3 | unreviewed | P08 P11 |
| R4 | R4 | بر الوالدين وصلة الرحم | 6 | 4 | 3 | unreviewed | P03 P08 |
| R5 | R5 | الصداقة والجوار: أصحاب بحقوق ووفاء | 8 | 4 | 3 | unreviewed | P05 P08 |
| R6 | R6 | الشراكة الزوجية: تعليم عام بتحفظ | 18 | 3 | 2 | unreviewed | P15 |
| R7 | R7 | التربية الوالدية: قدوة وحزم رحيم | 20 | 3 | 2 | unreviewed | P16 |
| W1 | W1 | الأمانة المهنية: إتقان وصدق وحفظ للحقوق | 16 | 5 | 2 | unreviewed | P12 |
| W2 | W2 | المال أمانة في اليد: الحاجة والميزانية والادخار | 12 | 4 | 2 | unreviewed | P11 |
| W3 | W3 | الاتفاق عهد: الوفاء وقراءة الشروط | 16 | 4 | 2 | unreviewed | P12 |
| W4 | W4 | مبادرة صغيرة ونفع كبير: الإنتاج والمبادرة | 14 | 4 | 2 | unreviewed | P11 |
| L1 | L1 | أستشير ثم أعزم: الشورى والقرار الجماعي | 14 | 4 | 2 | unreviewed | P10 P13 |
| L2 | L2 | قيادة تخدم: المسؤولية العامة في الفريق الصغير | 16 | 4 | 2 | unreviewed | P13 |
| L3 | L3 | الحوكمة والمساءلة: كيف نحلل المؤسسات بحياد | 18 | 4 | 2 | unreviewed | P14 |
| L4 | L4 | نتعاون على الخير: خدمة المجتمع باحترام التنوع | 10 | 3 | 2 | unreviewed | P08 P11 |
| M1 | M1 | نعلّم بالسؤال لا بالتلقين | 16 | 4 | 2 | unreviewed | P13 P14 |
| M2 | M2 | ملاحظة نافعة لا تعيير | 16 | 4 | 2 | unreviewed | P13 P14 |
| M3 | M3 | التقييم العادل بمعيار معلن | 18 | 4 | 2 | unreviewed | P14 |
| H1 | H1 | السيرة النبوية المتدرجة | 9 | 5 | 2 | unreviewed | P22 |
| H2 | H2 | الشمائل المحمدية والقدوة: أخلاق نتأسى بها بالعمل | 9 | 4 | 2 | unreviewed | P22 |
| H3 | H3 | آداب يومية من الأربعين: النية والكلام والغضب والاستئذان والحياء | 11 | 4 | 2 | unreviewed | P22 |
| H4 | H4 | توثيق الأخبار والتمييز بين المصدر والشرح | 14 | 4 | 2 | unreviewed | P23 |
| H5 | H5 | قصص السيرة للأطفال | 5 | 4 | 2 | unreviewed | P17 |
| Q1 | Q1 | الإصغاء والتلاوة بأدب | 7 | 4 | 2 | unreviewed | P20 |
| Q2 | Q2 | أساسيات التجويد كأهداف تعلّم: لماذا نتعلمه وكيف | 8 | 4 | 2 | unreviewed | P20 |
| Q3 | Q3 | الحفظ المنهجي والمراجعة | 7 | 4 | 2 | unreviewed | P21 |
| Q4 | Q4 | التدبّر وربط الآية بالسلوك | 10 | 4 | 2 | unreviewed | P21 |
| Q5 | Q5 | علوم القرآن التمهيدية: خريطة وبطاقات وحدود | 12 | 5 | 2 | unreviewed | P23 |
| Q6 | Q6 | تقدير اختلاف الروايات والقراءات | 13 | 4 | 2 | unreviewed | P23 |
| X1-A | W2 | مالي بين يديّ: ميزانية بسيطة ووفاء بما التزمت به | 18 | 3 | 2 | unreviewed | P24 |
| X1-B | W3 | اتفاقي واضح وعملي شريف: وعي عام بالاتفاقات وحقوق العمل | 18 | 3 | 2 | unreviewed | P24 |
| X2-A | T6 | الباحث الناشئ: سؤال جيد ومصدر موثوق وتوثيق أمين | 16 | 3 | 2 | unreviewed | P24 |
| X2-B | K3 | الاختلاف العلمي وحدود الباحث: عرض أمين وإحالة لأهل الاختصاص | 16 | 3 | 2 | unreviewed | P24 |
| X3-A | K4 | هدوء قبل التلاوة والإصغاء الحاضر وسؤال «ماذا يلفتني؟» | 8 | 3 | 2 | unreviewed | P20 |
| X3-B | K4 | تدوين الأثر الخاص واحترام اختلاف الروايات والمدارس | 11 | 3 | 2 | unreviewed | P21 |
| X4-A | S3 | عاداتي اليومية: مكاني وأدواتي ونومي | 6 | 3 | 2 | unreviewed | P18 |
| X4-B | S2 | ترتيب مساءاتي ومكاني المشترك | 10 | 3 | 2 | unreviewed | P22 |
| X5-A | X5 | المسؤولية الرقمية: أحمي غيري وأحمي نفسي وأطلب العون | 11 | 4 | 3 | unreviewed | P22 |
| Y1-A | C3 | الرحمة: أرى وأحسّ وأفعل | 5 | 3 | 2 | unreviewed | P17 |
| Y1-B | C6 | الشكر: أعدّ نعمي وأقول شكرًا | 5 | 3 | 1 | unreviewed | P17 |
| Y1-C | K4 | أسمع وأردّد: لحظات قصيرة مع القرآن | 5 | 3 | 1 | unreviewed | P01 |
| Y1-D | R1 | أسمع بأذني وعيني: لكل متكلم نوبة | 6 | 3 | 1 | unreviewed | P18 |
| Y2-A | C2 | الأمانة: عندي وليست لي | 7 | 3 | 1 | unreviewed | P19 |
| Y2-B | S4 | المثابرة: خطوة صغيرة وأكمل | 7 | 3 | 1 | unreviewed | P19 |
| Y2-C | T1 | أسئلتي تعينني على الفهم | 7 | 3 | 1 | unreviewed | P19 |
| Y2-D | R2 | كلام واضح ولطيف | 8 | 3 | 1 | unreviewed | P19 |
| Z1-A | S1 | يومياتي الهادئة: مراجعة اليوم بلا جلد | 15 | 3 | 1 | unreviewed | P24 |
| Z1-B | T5 | يومياتي لحل مشكلة | 15 | 3 | 1 | unreviewed | P24 |
| Z1-C | T4 | يومياتي قبل أن أقرر | 15 | 3 | 1 | unreviewed | P24 |

### 1.4 توزيع أعمار الدروس (age_range كما كُتب)

10-12: 31، 8-9: 29، 7-8: 28، 18+: 24، 8-10: 21، 14-17: 19، 15-17: 17، 12-14: 14، 16-17: 14، 5-7: 13، 16-18: 13، 7-9: 12، 5-6: 10، 11-14: 7، 6-8: 7، 10-13: 7، 9-12: 6، 11-13: 6، 12-17: 5، 12-13: 5، 16+: 5، 12-15: 4، 13-14: 4، 10-14: 4، 8-11: 4، 7-10: 4، 12-16: 3، 6-9: 3، 14-16: 3، 9-11: 3، 20+: 3، 6: 3، 8: 3، 6-7: 2، 13-15: 2، 13-17: 2، 6-12: 1، 7-12: 1، 10-11: 1، 5-8: 1، 8-12: 1، 9-13: 1، 11-15: 1. المجموع 347. مدة الدروس (duration_min) مجموعها 11773 دقيقة.

### 1.5 الجلسات (`sessions/P*.json`)

| البرنامج | ملف | جلسات (total_sessions=len) | review_status للجلسات | status الملف |
|---|---|---|---|---|
| P01 | sessions/P01.json | 24=24 | {'unreviewed': 24} | draft-unreviewed |
| P02 | sessions/P02.json | 25=25 | {'unreviewed': 25} | draft-unreviewed |
| P03 | sessions/P03.json | 20=20 | {'unreviewed': 20} | draft-unreviewed |
| P04 | sessions/P04.json | 20=20 | {'unreviewed': 20} | draft-unreviewed |
| P05 | sessions/P05.json | 36=36 | {'unreviewed': 36} | draft-unreviewed |
| P06 | sessions/P06.json | 20=20 | {'unreviewed': 20} | draft-unreviewed |
| P07 | sessions/P07.json | 18=18 | {'unreviewed': 18} | draft-unreviewed |
| P08 | sessions/P08.json | 23=23 | {'unreviewed': 23} | draft-unreviewed |
| P09 | sessions/P09.json | 20=20 | {'unreviewed': 20} | draft-unreviewed |
| P10 | sessions/P10.json | 26=26 | {'unreviewed': 26} | draft-unreviewed |
| P11 | sessions/P11.json | 15=15 | {'unreviewed': 15} | draft-unreviewed |
| P12 | sessions/P12.json | 13=13 | {'unreviewed': 13} | draft-unreviewed |
| P13 | sessions/P13.json | 30=30 | {'unreviewed': 30} | draft-unreviewed |
| P14 | sessions/P14.json | 16=16 | {'unreviewed': 16} | draft-unreviewed |
| P15 | sessions/P15.json | 5=5 | {'unreviewed': 5} | draft-unreviewed |
| P16 | sessions/P16.json | 5=5 | {'unreviewed': 5} | draft-unreviewed |
| P17 | sessions/P17.json | 15=15 | {'unreviewed': 15} | draft-unreviewed |
| P18 | sessions/P18.json | 32=32 | {'unreviewed': 32} | draft-unreviewed |
| P19 | sessions/P19.json | 33=33 | {'unreviewed': 33} | draft-unreviewed |
| P20 | sessions/P20.json | 17=17 | {'unreviewed': 17} | draft-unreviewed |
| P21 | sessions/P21.json | 19=19 | {'unreviewed': 19} | draft-unreviewed |
| P22 | sessions/P22.json | 37=37 | {'unreviewed': 37} | draft-unreviewed |
| P23 | sessions/P23.json | 19=19 | {'unreviewed': 19} | draft-unreviewed |
| P24 | sessions/P24.json | 38=38 | {'unreviewed': 38} | draft-unreviewed |
| P25 | sessions/P25.json | 6=6 | {'unreviewed': 6} | draft-unreviewed |

المجموع: 532 جلسة (= 532 درسًا وسيناريو: كل عنصر في جلسة واحدة). الواجب (homework) داخل كل جلسة كائن؛ لا جدول DB له.

### 1.6 الأدلة (`guides/P*.json`)

| البرنامج | review_status | فقرات دليل المرشد (for_guide) | دليل الوالد (for_parent) | أسئلة شائعة |
|---|---|---|---|---|
| P01 | unreviewed | 6 | 5 | 6 |
| P02 | unreviewed | 6 | 5 | 7 |
| P03 | unreviewed | 6 | 5 | 5 |
| P04 | unreviewed | 6 | 5 | 6 |
| P05 | unreviewed | 6 | 5 | 6 |
| P06 | unreviewed | 6 | 5 | 6 |
| P07 | unreviewed | 13 | 7 | 11 |
| P08 | unreviewed | 6 | 5 | 6 |
| P09 | unreviewed | 6 | 5 | 6 |
| P10 | unreviewed | 6 | 5 | 6 |
| P11 | unreviewed | 6 | 5 | 6 |
| P12 | unreviewed | 6 | 5 | 6 |
| P13 | unreviewed | 6 | 5 | 6 |
| P14 | unreviewed | 6 | 1 | 6 |
| P15 | unreviewed | 6 | 1 | 6 |
| P16 | unreviewed | 6 | 1 | 6 |
| P17 | unreviewed | 6 | 5 | 6 |
| P18 | unreviewed | 6 | 5 | 8 |
| P19 | unreviewed | 6 | 5 | 6 |
| P20 | unreviewed | 6 | 5 | 6 |
| P21 | unreviewed | 6 | 5 | 6 |
| P22 | unreviewed | 6 | 5 | 6 |
| P23 | unreviewed | 6 | 5 | 6 |
| P24 | unreviewed | 6 | 5 | 6 |
| P25 | unreviewed | 13 | 7 | 7 |

الأدلة موجَّهة للكبار: الواجهة تشترط إقرارًا ذاتيًا بالبلوغ (وضع المرشد) أو دورًا بالغًا (qari, tenant_admin, guardian, scholarly_reviewer, safeguarding_officer). الإقرار على مستوى الواجهة فقط (غير مفروض من الخادم).

### 1.7 الكفايات (`competencies.json`)

| id | الاسم | المجال | min_age | مستويات | مراسي | تحقق المراسي | الحالة | وحدات | يعتمد على |
|---|---|---|---|---|---|---|---|---|---|
| K1 | فهم النص في سياقه | المعرفة والفهم | 10 | 5 | 2 | heading-only | unreviewed | 1 | — |
| K2 | التثبّت من الخبر والمصدر | المعرفة والفهم | 10 | 5 | 2 | heading-only | unreviewed | 1 | K1 |
| K3 | التمييز بين النص والشرح والاجتهاد | المعرفة والفهم | 12 | 5 | 3 | heading-only | unreviewed | 2 | K1 |
| K4 | التلاوة والحفظ والمراجعة | المعرفة والفهم | 5 | 5 | 2 | heading-only | unreviewed | 7 | — |
| C1 | الصدق | الخلق والقيم | 6 | 5 | 3 | heading-only/passage-read | unreviewed | 2 | — |
| C2 | الأمانة | الخلق والقيم | 7 | 5 | 3 | heading-only | unreviewed | 3 | — |
| C3 | الرحمة | الخلق والقيم | 5 | 5 | 3 | heading-only | unreviewed | 4 | — |
| C4 | العدل والإنصاف | الخلق والقيم | 8 | 5 | 4 | heading-only | unreviewed | 1 | C1 |
| C5 | التواضع | الخلق والقيم | 7 | 5 | 4 | heading-only/passage-read | unreviewed | 1 | — |
| C6 | الشكر والامتنان | الخلق والقيم | 5 | 5 | 3 | heading-only | unreviewed | 3 | — |
| S1 | المراقبة والمحاسبة الذاتية | إدارة الذات | 10 | 5 | 4 | heading-only | unreviewed | 2 | — |
| S2 | تنظيم الوقت والتخطيط | إدارة الذات | 10 | 5 | 2 | heading-only | unreviewed | 3 | — |
| S3 | بناء العادات والانضباط | إدارة الذات | 6 | 5 | 3 | heading-only | unreviewed | 3 | — |
| S4 | المثابرة والصبر على الصعوبة | إدارة الذات | 7 | 5 | 3 | heading-only | unreviewed | 4 | — |
| S5 | ضبط الانفعال والغضب | إدارة الذات | 6 | 5 | 4 | heading-only/passage-read | unreviewed | 5 | — |
| S6 | التعلّم من الخطأ والتوبة | إدارة الذات | 8 | 5 | 3 | heading-only | unreviewed | 1 | S1 |
| T1 | طرح الأسئلة الجيدة | التفكير والتعلّم | 7 | 5 | 3 | heading-only | unreviewed | 2 | — |
| T2 | التفكير النقدي وكشف المغالطات | التفكير والتعلّم | 10 | 5 | 3 | heading-only | unreviewed | 1 | — |
| T3 | الاستدلال المنهجي | التفكير والتعلّم | 12 | 5 | 3 | heading-only | unreviewed | 1 | T2 |
| T4 | اتخاذ القرار | التفكير والتعلّم | 12 | 5 | 3 | heading-only | unreviewed | 3 | T3 |
| T5 | حل المشكلات | التفكير والتعلّم | 10 | 5 | 2 | heading-only | unreviewed | 3 | — |
| T6 | التعلّم الذاتي والبحث | التفكير والتعلّم | 12 | 5 | 3 | heading-only | unreviewed | 2 | K2 |
| R1 | حسن الاستماع | العلاقات والأسرة | 6 | 5 | 3 | heading-only | unreviewed | 3 | — |
| R2 | التواصل الواضح اللطيف | العلاقات والأسرة | 8 | 5 | 4 | heading-only | unreviewed | 4 | R1 |
| R3 | إدارة الخلاف وحل النزاع | العلاقات والأسرة | 10 | 5 | 4 | heading-only | unreviewed | 1 | R1 C4 |
| R4 | بر الوالدين وصلة الرحم | العلاقات والأسرة | 6 | 5 | 3 | heading-only | unreviewed | 1 | — |
| R5 | الصداقة والجوار | العلاقات والأسرة | 8 | 5 | 5 | heading-only | unreviewed | 2 | — |
| R6 | الشراكة الزوجية | العلاقات والأسرة | 18 | 5 | 3 | heading-only | unreviewed | 1 | R2 R3 |
| R7 | التربية الوالدية | العلاقات والأسرة | 20 | 5 | 3 | heading-only | unreviewed | 1 | R6 |
| W1 | الأمانة المهنية | العمل والحياة الاقتصادية | 16 | 5 | 3 | heading-only | unreviewed | 1 | C2 |
| W2 | إدارة المال والادخار | العمل والحياة الاقتصادية | 12 | 5 | 3 | heading-only | unreviewed | 2 | — |
| W3 | المعاملات العادلة والعقود | العمل والحياة الاقتصادية | 16 | 5 | 3 | heading-only | unreviewed | 2 | C2 |
| W4 | الإنتاج والمبادرة | العمل والحياة الاقتصادية | 14 | 5 | 3 | heading-only | unreviewed | 1 | S4 |
| L1 | الشورى والقرار الجماعي | القيادة والمجتمع | 14 | 5 | 3 | heading-only | unreviewed | 1 | R1 |
| L2 | المسؤولية العامة والقيادة الخادمة | القيادة والمجتمع | 16 | 5 | 3 | heading-only | unreviewed | 1 | L1 |
| L3 | الحوكمة والمساءلة (تحليلًا) | القيادة والمجتمع | 18 | 5 | 3 | heading-only | unreviewed | 1 | L2 |
| L4 | خدمة المجتمع والتعاون | القيادة والمجتمع | 10 | 5 | 3 | heading-only | unreviewed | 1 | — |
| M1 | نقل المعرفة بالسؤال | التعليم والإرشاد | 16 | 5 | 3 | heading-only | unreviewed | 2 | T1 |
| M2 | الإرشاد والتغذية الراجعة | التعليم والإرشاد | 16 | 5 | 2 | heading-only | unreviewed | 2 | R2 M1 |
| M3 | التقييم العادل | التعليم والإرشاد | 18 | 5 | 2 | heading-only | unreviewed | 1 | M2 C4 |
| X5 | المسؤولية الرقمية | الخلق والقيم | 11 | 5 | 1 | none | unreviewed | 1 | C3 |
| Q1 | الإصغاء والتلاوة بأدب | نواة القرآن | 7 | 5 | 3 | heading-only | unreviewed | 1 | — |
| Q2 | أساسيات التجويد كأهداف تعلّم | نواة القرآن | 8 | 5 | 4 | heading-only | unreviewed | 1 | Q1 |
| Q3 | الحفظ المنهجي والمراجعة | نواة القرآن | 7 | 5 | 3 | heading-only | unreviewed | 1 | Q1 |
| Q4 | التدبّر وربط الآية بالسلوك | نواة القرآن | 10 | 5 | 4 | heading-only | unreviewed | 1 | K1 Q1 |
| Q5 | علوم القرآن التمهيدية | نواة القرآن | 12 | 5 | 5 | heading-only | unreviewed | 1 | Q1 |
| Q6 | تقدير اختلاف الروايات والقراءات | نواة القرآن | 13 | 5 | 5 | heading-only | unreviewed | 1 | Q5 |
| H1 | السيرة النبوية المتدرجة | المعرفة النبوية | 9 | 5 | 4 | heading-only | unreviewed | 1 | — |
| H2 | الشمائل المحمدية والقدوة | المعرفة النبوية | 9 | 5 | 5 | heading-only | unreviewed | 2 | — |
| H3 | الأربعون النووية وآداب الحياة اليومية | المعرفة النبوية | 11 | 5 | 6 | heading-only | unreviewed | 1 | — |
| H4 | توثيق الأخبار والتمييز بين المصدر والشرح | المعرفة النبوية | 14 | 5 | 4 | heading-only | unreviewed | 1 | — |
| H5 | قصص السيرة للأطفال | المعرفة النبوية | 5 | 5 | 3 | heading-only | unreviewed | 1 | — |

تحقق المراسي (إجمالي): {'heading-only': 163, 'passage-read (see PILOT_SOURCE_RECORDS.md)': 4, 'none': 1}. أي أن 163 مرسى من 168 «عنوان فقط» (لم يُقرأ نصه) — المصدر الشرعي غير موثَّق فعليًا بعد.

كفايات بلا وحدة دروس مطابقة (حسب حقل competency في الوحدات): لا شيء. وحدات تشير لكفاية غير موجودة في competencies.json: لا شيء.

### 1.8 المبادئ المستخرجة (`extracted/*.json`)

| الملف/الكفاية | status | مبادئ | فجوات | كتب مقروءة | في competencies.json؟ |
|---|---|---|---|---|---|
| ANG.json | draft-unreviewed | 21 | 9 | 10 | لا |
| C1.json | draft-unreviewed | 10 | 7 | 12 | نعم |
| C2.json | draft-unreviewed | 10 | 6 | 11 | نعم |
| C3.json | draft-unreviewed | 10 | 6 | 8 | نعم |
| C4.json | draft-unreviewed | 10 | 5 | 16 | نعم |
| C5.json | draft-unreviewed | 10 | 4 | 11 | نعم |
| C6.json | draft-unreviewed | 10 | 5 | 10 | نعم |
| H1.json | draft-unreviewed | 10 | 7 | 3 | نعم |
| H2.json | draft-unreviewed | 10 | 7 | 6 | نعم |
| H3.json | draft-unreviewed | 10 | 6 | 5 | نعم |
| H4.json | draft-unreviewed | 10 | 6 | 6 | نعم |
| H5.json | draft-unreviewed | 10 | 6 | 3 | نعم |
| K1.json | draft-unreviewed | 10 | 6 | 7 | نعم |
| K2.json | draft-unreviewed | 10 | 5 | 10 | نعم |
| K3.json | draft-unreviewed | 10 | 8 | 4 | نعم |
| K4.json | draft-unreviewed | 10 | 8 | 7 | نعم |
| L1.json | draft-unreviewed | 10 | 6 | 8 | نعم |
| L2.json | draft-unreviewed | 10 | 7 | 8 | نعم |
| L3.json | draft-unreviewed | 10 | 6 | 6 | نعم |
| L4.json | draft-unreviewed | 10 | 5 | 10 | نعم |
| M1.json | draft-unreviewed | 10 | 5 | 7 | نعم |
| M2.json | draft-unreviewed | 10 | 6 | 6 | نعم |
| M3.json | draft-unreviewed | 10 | 5 | 9 | نعم |
| Q1.json | draft-unreviewed | 10 | 4 | 11 | نعم |
| Q2.json | draft-unreviewed | 10 | 7 | 7 | نعم |
| Q3.json | draft-unreviewed | 10 | 6 | 6 | نعم |
| Q4.json | draft-unreviewed | 10 | 5 | 10 | نعم |
| Q5.json | draft-unreviewed | 10 | 6 | 8 | نعم |
| Q6.json | draft-unreviewed | 10 | 6 | 7 | نعم |
| R1.json | draft-unreviewed | 10 | 7 | 12 | نعم |
| R2.json | draft-unreviewed | 10 | 7 | 6 | نعم |
| R3.json | draft-unreviewed | 10 | 6 | 5 | نعم |
| R4.json | draft-unreviewed | 10 | 7 | 9 | نعم |
| R5.json | draft-unreviewed | 10 | 7 | 7 | نعم |
| R6.json | draft-unreviewed | 10 | 7 | 6 | نعم |
| R7.json | draft-unreviewed | 10 | 8 | 7 | نعم |
| S1.json | draft-unreviewed | 10 | 5 | 7 | نعم |
| S2.json | draft-unreviewed | 10 | 6 | 7 | نعم |
| S3.json | draft-unreviewed | 10 | 4 | 8 | نعم |
| S4.json | draft-unreviewed | 10 | 6 | 6 | نعم |
| S5.json | draft-unreviewed | 10 | 8 | 8 | نعم |
| S6.json | draft-unreviewed | 10 | 7 | 8 | نعم |
| T1.json | draft-unreviewed | 10 | 5 | 7 | نعم |
| T2.json | draft-unreviewed | 10 | 5 | 5 | نعم |
| T3.json | draft-unreviewed | 10 | 6 | 6 | نعم |
| T4.json | draft-unreviewed | 10 | 5 | 8 | نعم |
| T5.json | draft-unreviewed | 10 | 6 | 9 | نعم |
| T6.json | draft-unreviewed | 10 | 6 | 3 | نعم |
| W1.json | draft-unreviewed | 10 | 6 | 6 | نعم |
| W2.json | draft-unreviewed | 10 | 8 | 5 | نعم |
| W3.json | draft-unreviewed | 10 | 7 | 7 | نعم |
| W4.json | draft-unreviewed | 10 | 7 | 8 | نعم |

أنواع المبادئ: {'practice': 142, 'principle': 251, 'caution': 69, 'story-lesson': 69}. الملف ANG ليس في competencies.json (مبادئ الغضب لبرنامج P07/وحدات AG*). كل نص هنا صياغتنا مع locator، والكتب مصادر طرف ثالث غير مرخّصة (CLAUDE.md): لا يُنشر نصها.
كفايات بلا ملف extracted: X5.

### 1.9 عناصر التغطية والتدقيق

- `qa/coherence_audit.json` (status: audit-draft-unreviewed): تدقيق اتساق للبرامج؛ مفاتيح: P07 في item_audit؛ program_reports=24؛ proposed_programs=1. اقتراحات فقط، لا تغيير في programs.json.
- `qa/editorial_changes.json`: 1158 تعديلًا لغويًا مسجَّلًا (قبل/بعد/سبب).
- `reference/P07_competency_map.json`: خريطة كفايات P07 (مسودة، توصية بتغيير العنوان إلى «أتعلّم كيف أتعامل مع غضبي» — مطبَّقة في programs.json).
- عناصر البرامج التي لها حقل `serves` (ربط بكفاية/نتيجة): 131 من 532.
- `docs/human-formation/gaps/`: مجلد فارغ (0 ملفات).
- `qa/QA_G1..G8.md` (8) و`QA_GUIDES_P01/P05/P09/P13.md` (4): تقارير فحص يدوية/آلية؛ لم تُعاد قراءتها في هذا الجرد (غير معروف ما فيها من أرقام).
- `records/*.md` (7 ملفات) + `PILOT_SOURCE_RECORDS.md`: سجلات مصادر بصياغة المنصة، حالتها حسب الملفات (لم تُحسب بنودها).
- `docs/human-formation/*.md`: BLUEPRINT(340 سطر), COMPETENCIES(432), PEDAGOGY(269), PILOT_SOURCE_RECORDS(131), PROGRAMS(655), SESSIONS(35), SOURCE_MAP(153) — توثيق مولَّد/مكتوب.

### 1.10 تضارب داخلي يجب الانتباه إليه

- `academy_status_seed.json` يذكر counts: {'program': 24, 'lesson': 255, 'scenario': 136, 'guide': 24} (439 صفًا)، بينما الجرد الحالي: 25 برنامجًا و347 درسًا و185 سيناريو و25 دليلًا (= 582 عنصرًا). الملف **قديم** (لم يُعد توليده بعد آخر توسعة)؛ يلزم إعادة تشغيل `scripts/seed_academy_status.py` قبل أي استيراد (قرار المالك). (لم أعد توليده: ممنوع تعديل ملفات أخرى.)
- عنوان صفحة الكفايات في الواجهة: «الكفايات الأربعون» بينما العدد الفعلي 52.
- وصف الصفحة الرئيسية للأكاديمية يحسب الدروس والسيناريوهات ديناميكيًا من الملفات (جيد)؛ لا نص ثابت بأرقام قديمة وُجد في `acHome` (لم يُفحص كل النص).

## 2. واجهة SPA (`packages/web/index.html`، 2408 سطرًا؛ نسخة `packages/web-vercel/index.html` بنفس عدد الأسطر، الفرق الوحيد meta api-base: فارغ مقابل `/api`)

التوجيه: hash routing عبر `route()` (السطر ~763) على الجزء الأول من `location.hash`. لا ملفات صفحات منفصلة. القرآن (6236 آية) يُقرأ من API وليس من ملف في الواجهة.

| المسار | ما يعرضه | يقرأ من | يراه | الحالة |
|---|---|---|---|---|
| #/  (فارغ) | الصفحة الرئيسية: بطاقات (14 حسب PROJECT_STATE) وروابط | ثابت | الجميع | منشور (لكن النشر خلف Vercel Authentication حسب docs/01) |
| #/quran و #/quran/:n[/:ayah] | فهرس السور (114) وقارئ السورة: نص حفص، ترجمة، تلاوة (115 قارئًا)، تفسير عند الطلب، مدرّب حفظ | API: GET /quran/editions, /quran/reference, /quran/:edition/:surah, /translations/*؛ خارجي: mp3quran.net (صوت)، tafsir عبر jsDelivr/GitHub | الجميع | يعمل؛ شروط الصوت والتفسير غير مذكورة (LICENSE_REGISTER) |
| #/search[/:q[/:lang]] | بحث في نص القرآن (عربي بلا تشكيل / إنجليزي) | API: GET /search | الجميع | يعمل |
| #/tajweed[/makharij/sifat/ahkam/mudood/explore] | 5 تبويبات تجويد | ثابت داخل index.html: MAKHARIJ(5 مجموعات: 1+3+10+2+1=17 مخرجًا)، SIFA_DEF(12)، AHKAM(3 أقسام: 5+3+3 بندًا)، MUDOOD(6) | الجميع | مسودة قيد المراجعة العلمية (QUIZ_NOTE) |
| #/qiraat | قائمة القراءات العشر وراوياها (10 قراء، 20 راويًا) + تنبيه: النص المتاح حفص فقط | ثابت QIRAAT | الجميع | معلومات فقط؛ لا نص أو صوت لغير حفص |
| #/learn و #/practise | مراكز تنقّل (HUBS) | ثابت | الجميع (بعض الروابط تتطلب حسابًا) | يعمل |
| #/foundations | الأسس: 28 حرفًا، أشكال الحرف، 8 حركات/علامات، مقاطع، اختبار؛ وضع صغار/كبار | ثابت (FD_LET, FD_HAR) + localStorage | الجميع | مسودة؛ بلا صوت (لا يُشغَّل صوت حتى تُراجَع تسجيلات) |
| #/kids | أكاديمية الصغار: 3 فئات (4–6، 7–10، 11–14) وأنشطة: تعرّف الحروف، تطابق، متشابهة، حركات، تحديد مستوى، قراءة | ثابت + localStorage (kst)؛ اختياري: API /i/:inst/kids/* | الجميع محليًا؛ التزامن بالمؤسسة يحتاج عضوية student/guardian | يعمل محليًا |
| #/plan | مخطط الحفظ/المراجعة اليومي | API /me/plan (+ localStorage) | يتطلب حسابًا للحفظ | يعمل |
| #/me[/today/tasmi/hifz/quiz/map/sanad] | رحلتي: اليوم، تسميع (تسجيل وتحليل)، حفظي، اختبر نفسك (4 اختبارات: 8+8+10+7=33 سؤالًا)، خريطة الإتقان، سندي | API /me/hifz*, /me/recitations*, /me/mastery, /me/quiz-attempts, /me/sanad | مسجّل | تحليل التلاوة بمفتاح OpenAI على الخادم فقط (غير معروف إن كان مفعَّلًا) |
| #/app[/:inst/:sec] | لوحة المؤسسة: overview, tracks, halaqat, homework, recitation, certs, assistant, people, admin (9 أقسام) | API /i/:inst/* | مسجّل بعضوية | يعمل؛ التشغيل الفعلي: 3 مؤسسات و5 عضويات و0 حلقات (DB) |
| #/academy[/p/:slug[/guide/parent]//l/:id//s/:id//c[/:id]//review[/:id]] | أكاديمية التكوين: الرئيسية، برنامج، درس، سيناريو، كفايات، أدلة، لوحة مراجعة | ملفات ثابتة /academy.json, /academy-lessons.json, /academy-programs.json, /academy-guides.json؛ (لا يحمّل academy-sessions.json من acLoad: غير معروف إن استُعمل في مكان آخر) | مسجّل؛ الأدلة للكبار؛ review للمراجع العلمي | مسودة؛ التقدّم في localStorage فقط (واجهة API التقدّم موجودة لكن هجرة 0019 غير مطبّقة) |
| #/review[/items/sanad] | المراجعة العلمية للمحتوى المستخرج وتوثيق الإسناد | API /scholarly/* | scholarly_reviewer | عملي؛ 39 عنصرًا DRAFT، 0 مراجعات |
| #/verify/:code | التحقق من شهادة | API GET /verify/:code | الجميع | 0 شهادات |
| #/auth | دخول/تسجيل | API /auth/* | الجميع | يعمل |
| #/demo | عرض توضيحي للواجبات (بيانات وهمية معلنة) | ثابت | الجميع | عرض فقط |
| #/gallery | معرض التصميم | ثابت | الجميع | داخلي |
| * أخرى | صفحة «غير موجودة» | — | — | — |

### 2.1 قوالب المسارات المدمجة (TEMPLATES) وبنوك الأسئلة

- `TEMPLATES` في index.html: 11 قالبًا مبدئيًا (وحدات: التجويد الأساسي 10، تلاوة وحفظ جزء عمّ 38، قصار السور 11، التأسيس في القراءة 15، متن تحفة الأطفال 15، المقدمة الجزرية 14، حفظ الجزء 29: 12، حفظ الجزء 28: 10، سور مختارة 6، مراجعة أسبوعية 8، ختمة 30 يومًا 136). **ملاحظة تضارب:** نص الواجهة يقول «المسارات الجاهزة الثمانية» بينما الموجود 11 (لم أتحقق إن كانت `TEMPLATES` تُرشَّح قبل التثبيت).
- اختبارات التجويد المدمجة: 4 مجموعات / 33 سؤالًا، «أعدّتها المنصة بمساعدة الذكاء الاصطناعي، قيد المراجعة العلمية».

## 3. API والحافة (Edge)

Fastify 5 + Zod في `packages/api/src` (141 مسارًا: app.ts 129، academy-progress.ts 8، academy-content.ts 4). Edge: `packages/edge/dist` (128 مسارًا، يُولَّد بـ `node build.mjs`). **الحافة المولَّدة قديمة:** تنقصها 13 مسارًا (ملفا academy-* غير مُضمَّنين ومسار واحد آخر في app.ts؛ لم يُحدَّد أيهما). النشر: Vercel يعيد توجيه `/api/*` إلى دالة Supabase `api`.

| العائلة | المسارات (طريقة المسار) | يراه/صلاحية | الحالة |
|---|---|---|---|
| auth | POST /auth/register, /auth/login, /auth/logout-all, /auth/change-password | عام/مسجّل | يعمل |
| مؤسسات وأعضاء | POST /institutions; /i/:inst/members, students(GET/POST), roster, people, members/:mid/status, overview-stats, audit-trail | tenant_admin/qari | يعمل (RLS) |
| وليّ الأمر والموافقات | /i/:inst/guardian-links(+verify), consents(+revoke), qari-assignments | guardian/admin | يعمل؛ 0 صفوف |
| التسميع والتقديمات | /i/:inst/submissions(+upload-url, audio-url, state); /me/recitations(+capabilities, analyze, :id) | طالب/مقرئ | يعمل؛ 0 تقديمات |
| حفظ وامتحانات شخصية | /me/hifz(+due, :id/review), /me/quiz-attempts, /me/mastery, /me/plan, /i/:inst/plans* | مسجّل | 1 hifz_item |
| علمي | /scholarly/items(+transition), /scholarly/sanad(+decide), /me/sanad | scholarly_reviewer | 39 DRAFT |
| مسارات وشهادات | /i/:inst/tracks(+status, progress), passport, certificates, /verify/:code | حسب الدور | مساران (مكرران) |
| AI | /i/:inst/ai/status, ai-suggestions(+generate, review) | مقرئ/مدير | 1 اقتراح؛ لا يصدر حكمًا |
| حلقات وحضور وتقييم | /i/:inst/halaqat(+members, sessions), sessions/:sid/join, attendance, assessments | مدير/مقرئ | 0 صفوف |
| واجبات | /i/:inst/homework (19 مسارًا: assign, mine, review-queue, summary, :rid/view/start/submit/review/complete/request, requests, extend, approve-pending, progress, templates) | مدير/مقرئ/طالب | 0 صفوف |
| أكاديمية صغار | PUT /i/:inst/kids/profile; POST kids/attempts, kids/level; GET kids/progress, kids/overview | student/guardian | 0 صفوف |
| محركات التكوين (هجرة 0017 غير مطبّقة) | /formation/source-records(+reviews, status), /i/:inst/reflections, missions, scenarios, observations, /me/reflections/missions/scenarios, /me/formation/export/data | متنوع | **جداولها غير موجودة في DB؛ المسارات ستفشل** |
| تقدّم الأكاديمية (0019 غير مطبّقة) | GET/PUT/DELETE /me/academy/progress; POST/DELETE …/share; GET /i/:inst/academy/students/:id/progress; POST …/feedback | مسجّل/معلم | **معطّلة فعليًا** |
| حالة محتوى الأكاديمية (0020 غير مطبّقة) | GET /academy/content/status(+/all); POST /academy/content/:kind/:ref/transition/review | محرر/مراجع | **معطّلة فعليًا** |
| قرآن وترجمة وبحث | GET /quran/reference, /quran/editions, /quran/:edition/:surah, /translations/editions, /translations/:edition/:surah, /search | عام | يعمل |
| نظام | GET /health, GET / | عام | يعمل |

الذكاء الاصطناعي والنسخ الصوتي: مفتاح OPENAI_API_KEY على الخادم (غير معروف إن كان مضبوطًا). قدرات التلاوة المُعلنة: transcribe + wordTimestamps + memorisationAccuracy؛ لا تجويد ولا نطق.

## 4. قاعدة البيانات

المشروع Supabase `okbtrogotrtciymmuokr`؛ اللقطة بتاريخ 2026-11-05 (read-only SELECT via Supabase MCP). هجرات غير مطبّقة: 0017, 0018, 0019, 0020. ملاحظة اللقطة: «No academy (P01-P25) content exists in DB; it lives only in static JSON built from docs/human-formation. The two tracks are exact duplicates by title/description/unit list (one published, one draft) — no deletion without backup and owner decision.»

| الجدول | الهجرة | عدد الصفوف (2026-11-05) | الحالة |
|---|---|---|---|
| academy_content_reviews | 0020 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| academy_content_status | 0020 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| academy_progress | 0019 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| academy_progress_share | 0019 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| academy_teacher_feedback | 0019 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| ai_suggestions | 0008 | 1 | مطبّقة |
| assessments | 0006 | 0 | مطبّقة |
| attendance | 0006 | 0 | مطبّقة |
| audit_logs | 0001 | 14 | مطبّقة |
| certificates | 0008 | 0 | مطبّقة |
| consents | 0001 | 0 | مطبّقة |
| formative_observations | 0017 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| guardian_links | 0001 | 0 | مطبّقة |
| halaqah_members | 0006 | 0 | مطبّقة |
| halaqah_sessions | 0006 | 0 | مطبّقة |
| halaqat | 0006 | 0 | مطبّقة |
| hifz_items | 0009 | 1 | مطبّقة |
| hifz_reviews | 0009 | 1 | مطبّقة |
| homework_assignments | 0014 | 0 | مطبّقة |
| homework_recipients | 0014 | 0 | مطبّقة |
| homework_requests | 0014 | 0 | مطبّقة |
| homework_reviews | 0014 | 0 | مطبّقة |
| homework_submissions | 0014 | 0 | مطبّقة |
| homework_templates | 0014 | 0 | مطبّقة |
| institutions | 0001 | 3 | مطبّقة |
| kid_attempts | 0016 | 0 | مطبّقة |
| kid_profiles | 0016 | 0 | مطبّقة |
| learning_tracks | 0008 | 2 | مطبّقة |
| life_mission_runs | 0017 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| life_mission_status | 0017 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| memberships | 0001 | 5 | مطبّقة |
| qari_assignments | 0001 | 0 | مطبّقة |
| quiz_attempts | 0009 | 0 | مطبّقة |
| quran_ayahs | 0002 | 6236 | مطبّقة |
| quran_editions | 0002 | 1 | مطبّقة |
| quran_reference_counts | 0002 | 114 | مطبّقة |
| rate_limits | 0007 | 46 | مطبّقة |
| recitation_attempts | 0013 | 0 | مطبّقة |
| recitation_submissions | 0001 | 0 | مطبّقة |
| reflection_entries | 0017 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| sanad_entries | 0010 | 0 | مطبّقة |
| scenario_runs | 0017 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| scholarly_items | 0002 | 39 | مطبّقة |
| scholarly_reviews | 0010 | 0 | مطبّقة |
| source_record_reviews | 0017 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| source_records | 0017 | غير موجود في اللقطة | غير مطبّقة (0017–0020) |
| student_profiles | 0001 | 0 | مطبّقة |
| study_plans | 0015 | 0 | مطبّقة |
| track_units | 0008 | 20 | مطبّقة |
| translation_ayahs | 0011 | 6236 | مطبّقة |
| translation_editions | 0011 | 1 | مطبّقة |
| unit_progress | 0008 | 0 | مطبّقة |
| users | 0001 | 7 | مطبّقة |

جداول معرَّفة في هجرات 0001–0020: 53؛ جداول في لقطة DB: 41؛ جداول في اللقطة وليست في أي هجرة (create table مباشر): لا شيء. جداول في هجرات غير مطبّقة: academy_content_reviews, academy_content_status, academy_progress, academy_progress_share, academy_teacher_feedback, formative_observations, life_mission_runs, life_mission_status, reflection_entries, scenario_runs, source_record_reviews, source_records.

هجرات 0003, 0004, 0005, 0012, 0018 تعدّل/تشدّد ولا تنشئ جداول. 

### 4.1 محتوى DB ذو الدلالة

- `quran_ayahs` 6236 = tanzil Uthmani txt-2 (طبعة واحدة `quran_editions`=1، حفص؛ بصمة SHA-256 في scholarly-assets/quran/raw). `translation_ayahs` 6236 (طبعة واحدة: Clear Quran, Talal Itani، CC BY-ND 4.0).
- `quran_reference_counts` 114 (عدد آيات كل سورة).
- `scholarly_items` 39 كلها `concept/DRAFT`؛ `scholarly_reviews` 0: لا شيء معتمد للنشر.
- `learning_tracks` 2 (كلاهما «أساسيات التجويد»، واحد published وآخر draft: **تكرار**)، `track_units` 20 (10 لكل مسار، عناوين متطابقة).
- `users` 7، `memberships` 5، `institutions` 3، `audit_logs` 14، `rate_limits` 46 (تشغيلي). كل جداول التعلم/الواجبات/الحلقات/الأطفال/الشهادات = 0.
- لا محتوى أكاديمي P01–P25 في DB (مؤكد في اللقطة).

## 5. أصول القرآن — الموجود مقابل الغائب

| الأصل | موجود؟ | الموقع | الحالة/الترخيص | ملاحظة |
|---|---|---|---|---|
| نص الآيات (6236) برواية حفص | نعم | DB: quran_ayahs؛ مصدر: scholarly-assets/quran/raw/tanzil-quran-uthmani-txt2.txt | مقبول الشروط 2026-11-01 (Tanzil 1.1، نقل حرفي مع إسناد) | يُقرأ من DB بالـ API؛ ممنوع تعديل النص (CLAUDE.md) |
| ترجمة المعاني (إنجليزي) | نعم، لغة واحدة | DB: translation_* | Clear Quran (Itani) CC BY-ND 4.0 | لا ترجمات أخرى (لا فرنسية/تركية/…): غائب |
| تلاوة صوتية | بث فقط | mp3quran.net (115 قارئًا حفص)، لا ملفات مخزّنة | شروط غير مذكورة (LICENSE_REGISTER) | الأصوات المراجَعة داخل المنصة: غائبة؛ الأسس بلا صوت |
| تفسير | بث عند الطلب | جلب من tafsir_api (jsDelivr/GitHub): الجلالين، ابن كثير، القرطبي، البغوي، الطبري | شروط غير مذكورة | لا نص تفسير مخزّن عندنا |
| مخارج الحروف | نعم (محتوى بشري مبدئي) | index.html: MAKHARIJ (17 مخرجًا) | مسودة قيد المراجعة | لا صور/رسوم تفاعلية للمخارج؛ docs/MAKHARIJ_VISUAL_SYSTEM.md تصميم فقط |
| الصفات/الأحكام/المدود | نعم (نصي) | SIFA_DEF 12، AHKAM 11 بندًا، MUDOOD 6 | مسودة | لا تلوين تجويدي على النص (طبقة tajweed colours: غائبة) |
| تلوين التجويد/علامات الوقف | لا | — | — | غائب |
| القراءات العشر | معلومات فقط | #/qiraat: 10 قراء/20 راويًا | لا نصوص | نص غير حفص غائب (CLAUDE.md: لا دمج روايات) |
| الإسناد (sanad) | أداة تدوين ذاتي + مراجعة | sanad_entries=0 | المنصة لا تصدر إجازة | 0 مدخلات |
| الحفظ (hifz) ومدرّب الإخفاء | نعم | API + index.html memoTrainer | يعمل؛ 1 عنصر | لا خوارزمية جودة معتمدة للتلاوة |
| التسميع (tasmi) | نعم تقنيًا | recitation_attempts=0 | تحليل نصّي للكلمات؛ لا حكم تجويد | تحتاج مفتاح STT |
| أكاديمية الصغار | نعم (أنشطة حروف) | index.html #/kids؛ 3 فئات؛ kid_profiles=0 | مسودة | لا محتوى قرآني للصغار (سور/آيات) خارج الأنشطة الحرفية؛ P20 «نواة القرآن للصغار» برنامج نصي |
| التأسيس (الحروف والحركات) | نعم | #/foundations | مسودة بلا صوت | 28 حرفًا، 8 علامات |
| برامج القرآن ضمن الأكاديمية | جزئيًا (نصوص تربوية) | Q1–Q6, P20, P21, P23 | draft-unreviewed | مراسي مصدرية «عنوان فقط» |
| قوالب مسارات حفظ (جزء عمّ، تبارك، قد سمع، ختمة 30 يومًا، تحفة، جزرية) | نعم (مبدئية) | TEMPLATES في index.html (11)؛ DB فيه مساران فقط | مسودة | لم تُنشر منها نسخ في DB سوى «أساسيات التجويد» ×2 |
| حديث | لا | — | — | لا أحاديث مخزّنة؛ الأحاديث في المحتوى الأكاديمي «غير مخرَّجة» حسب الواجهة |

## 6. وثائق ومواد أخرى

- `docs/*.md`: 74 ملفًا (إجمالي ملفات docs 111 md + 161 json + 92 jpg). فئات: تدقيق (01–11)، تصميم (TARTIL_DESIGN_SYSTEM, ART_DIRECTION, ORNAMENT_LIBRARY, MAKHARIJ_VISUAL_SYSTEM…)، أكاديمية صغار (KIDS_*)، واجبات (QURAN_HOMEWORK_SYSTEM, ASSIGNMENT_BACKEND_SCHEMA)، سلسلة TARTIL_13_* (16 ملفًا) وTARTIL_14_1_* (13 ملفًا).
- `docs/governance/` (9): LICENSE_REGISTER, KNOWN_LIMITATIONS, ARCHITECTURE_DECISIONS, SCHOLARLY_*، SOURCE_SELECTION_2026-11-02, CONTENT_DEDUPLICATION_LOG, TEST_RESULTS, AIJUR_SKILLS_INSPIRATION_AUDIT.
- `docs/audit/TARTIL_CURRENT_STATE.md`، `docs/extraction/CONCEPTS_V1.md`، `docs/design-screens/` (92 صورة jpg: before/after/v3).
- `scholarly-assets/` (مُتجاهَل git، لا يُنشر): `_inputs` 218 ملفًا (كتب)، `extraction` 106، `extraction-concepts` 8، `extraction-formation` 52، `quran` 2 (Tanzil + SHA256)، `review` 4، `source-registry` 3. **غير مفحوصة دلاليًا في هذا الجرد.**
- `scripts/`: 20 سكربتًا في المستوى الأعلى (py/mjs) + مجلدات live, qa, supabase (بناء الأكاديمية، تحقق اتساق/اكتمال/دروس/جلسات/اقتباسات، استخراج، seed). `packages/database/test`: 11 ملف اختبار.
- منشورات: `packages/web-vercel` (Vercel `tartil-web`، خلف Vercel Authentication حسب docs/01 — غير معروف إن تغيّر)، `packages/edge` (Supabase Edge Function `api`).

## 7. فجوات وتحذيرات يجب ألا تُقرأ كنقص مُغطّى

- لا شيء من المحتوى الأكاديمي منشور فعلًا: كله draft-unreviewed؛ لا مراجع مسمّى (علمي/تربوي/حماية طفل/صحة نفسية/مالي/قانوني) مسجّل.
- DB لا تحوي محتوى تعليميًا عدا مساري «أساسيات التجويد» (مكرران) و39 مفهومًا مسودة. الأكاديمية «ملفات فقط».
- الهجرات 0017–0020 مكتوبة ولها ملفات اختبار في packages/database/test (لم تُشغَّل في هذا الجرد) لكنها غير مطبّقة على DB: مسارات formation/academy-progress/academy-content في API ستفشل على الإنتاج حتى تُطبَّق (قرار المالك).
- `packages/edge/dist` متأخرة عن `packages/api/src` بـ13 مسارًا (تحتاج `node build.mjs` + نشر).
- `academy_status_seed.json` متأخر عن المحتوى الحالي (انظر 1.10).
- مراسي الكفايات: 163 من 168 «عنوان فقط»؛ لا اعتماد مصدري.
- غائب كليًا: تلوين التجويد، تسجيلات مراجَعة، صوت للأسس، تفسير مخزّن، حديث، قراءات غير حفص، ترجمات غير الإنجليزية، حسابات معلّمين/طلاب حقيقية (0 طلاب، 0 حلقات).
- عدد الأنشطة/الأسئلة: الأنشطة في الدروس 1023؛ الأسئلة المنفصلة الوحيدة هي اختبارات التجويد المدمجة (33) و347 عنصر formative داخل الدروس (حسب بنية الحقل؛ يحتاج مراجعة للتفصيل).
- ما لم يُفحص: المواقع المنشورة، مخازن خارج المستودع، محتوى `scholarly-assets/_inputs`، قاعدة البيانات الحية بعد 2026-11-05، قيم الأسرار/المفاتيح.

## 8. إعادة توليد الأرقام

كل جدول أعلاه من `python3 -I` على: programs.json, lessons/*.json, sessions/*.json, guides/*.json, competencies.json, extracted/*.json, qa/db_inventory_2026-11-05.json، وعدّ `app.get/post/put/patch/delete(` في packages/api/src وpackages/edge/dist، و`create table` في packages/database/migrations، وتقييم ثوابت index.html (MAKHARIJ, TEMPLATES, QUIZZES, QIRAAT, KB) بـ node. مسارات SPA وعائلات API من قراءة الشيفرة (غير محسوبة آليًا بالكامل: عدد مسارات الواجبات (19) عُدّ بـ grep).
