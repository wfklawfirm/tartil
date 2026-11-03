/** Recitation (tasmi') analysis: Layer 1 only (memorisation accuracy at word level), computed deterministically from a speech-to-text transcript.
 *  What this can and cannot say is stated in `RECITATION_CAPABILITIES`; anything not listed there is reported as "not assessed", never guessed.
 *  The stored Qur'an text is only READ here (to build the expected word list); it is never altered. */

export interface HeardWord { word: string; start: number; end: number }
export interface Transcription { text: string; words: HeardWord[]; durationSec: number }
export interface RecitationAIProvider {
  name: string;
  capabilities: { transcribe: boolean; wordTimestamps: boolean; verseIdentification: boolean; memorisationAccuracy: boolean; pronunciation: false; tajweed: false; calibratedConfidence: false };
  transcribe(audio: Uint8Array, mime: string): Promise<Transcription>;
}
export const RECITATION_CAPABILITIES = {
  memorisationAccuracy: 'word-level omissions, substitutions and extra words, as hypotheses derived from a general speech-to-text transcript',
  pronunciation: 'not assessed (no validated phonetic model)',
  tajweed: 'not assessed (no validated tajweed model)',
  confidence: 'no calibrated confidence; every finding is "possible issue, needs review"',
} as const;

const MARKS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u08d3-\u08ff\u0640]/g;
/** Letters-only comparison form: strips diacritics and Qur'anic marks, folds alef/ya/ta-marbuta/hamza seats. */
export function normalizeAr(s: string): string {
  return s.normalize('NFKD').replace(MARKS, '').replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627').replace(/\u0649/g, '\u064a').replace(/\u0629/g, '\u0647')
    .replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064a').replace(/[\u0621]/g, '').replace(/[^\u0621-\u063a\u0641-\u064a]/g, '');
}
/** Long-vowel-insensitive skeleton: recognisers disagree on madd letters, which are not evidence of a memorisation error. */
const skel = (n: string) => n.replace(/[\u0627\u0648\u064a]/g, '');
export function lev(a: string, b: string): number {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n]!;
}
/** 0 = same word, 1 = clearly different; in-between = near spelling variants. */
export function wordCost(expected: string, heard: string): number {
  const a = normalizeAr(expected), b = normalizeAr(heard);
  if (!a || !b) return 1;
  if (a === b) return 0;
  const sa = skel(a), sb = skel(b);
  if (sa === sb && sa.length >= 2) return 0;
  const d = lev(sa.length >= 2 && sb.length >= 2 ? sa : a, sa.length >= 2 && sb.length >= 2 ? sb : b), L = Math.max(sa.length, sb.length, 1);
  return d / L <= 0.25 && L >= 4 ? 0.35 : 1;
}

export type Op = 'match' | 'near' | 'substituted' | 'omitted';
export interface ExpectedWord { ayah: number; index: number; text: string }
export interface AlignedWord { ayah: number; index: number; op: Op; heard?: string; start?: number; end?: number }
export interface ExtraWord { heard: string; start: number; end: number; afterAyah: number; afterIndex: number }

/** Global alignment (Needleman-Wunsch) of the expected words against the heard words. */
export function alignWords(expected: ExpectedWord[], heard: HeardWord[]): { words: AlignedWord[]; extras: ExtraWord[] } {
  const n = expected.length, m = heard.length;
  const D: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) D[i]![0] = i;
  for (let j = 1; j <= m; j++) D[0]![j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const c = wordCost(expected[i - 1]!.text, heard[j - 1]!.word);
    D[i]![j] = Math.min(D[i - 1]![j - 1]! + (c >= 1 ? 1.2 : c), D[i - 1]![j]! + 1, D[i]![j - 1]! + 1);
  }
  const words: AlignedWord[] = [], extras: ExtraWord[] = []; let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const c = wordCost(expected[i - 1]!.text, heard[j - 1]!.word), step = D[i - 1]![j - 1]! + (c >= 1 ? 1.2 : c);
      if (Math.abs(D[i]![j]! - step) < 1e-9) {
        const e = expected[i - 1]!, h = heard[j - 1]!;
        words.push({ ayah: e.ayah, index: e.index, op: c === 0 ? 'match' : c < 1 ? 'near' : 'substituted', heard: h.word, start: h.start, end: h.end });
        i--; j--; continue;
      }
    }
    if (i > 0 && Math.abs(D[i]![j]! - (D[i - 1]![j]! + 1)) < 1e-9) { const e = expected[i - 1]!; words.push({ ayah: e.ayah, index: e.index, op: 'omitted' }); i--; continue; }
    const h = heard[j - 1]!, prev = expected[i - 1];
    extras.push({ heard: h.word, start: h.start, end: h.end, afterAyah: prev?.ayah ?? expected[0]?.ayah ?? 1, afterIndex: prev?.index ?? 0 }); j--;
  }
  return { words: words.reverse(), extras: extras.reverse() };
}

export interface RecitationResult {
  status: 'analyzed' | 'insufficient_evidence';
  provider: string; durationSec: number;
  summary: { expectedWords: number; heardWords: number; matched: number; near: number; substituted: number; omitted: number; extra: number; coverage: number };
  words: AlignedWord[]; extras: ExtraWord[]; transcript: string;
  notAssessed: { pronunciation: string; tajweed: string; confidence: string };
  note: string;
}
/** Below this share of expected words being matched or near-matched, the recording is treated as insufficient evidence (wrong passage, noise, silence). */
export const MIN_COVERAGE = 0.3;
export function analyzeRecitation(expected: ExpectedWord[], t: Transcription, provider: string): RecitationResult {
  const { words, extras } = alignWords(expected, t.words);
  const c = (op: Op) => words.filter(w => w.op === op).length;
  const matched = c('match'), near = c('near'), substituted = c('substituted'), omitted = c('omitted');
  const coverage = expected.length ? (matched + near) / expected.length : 0;
  const status = t.words.length === 0 || coverage < MIN_COVERAGE ? 'insufficient_evidence' : 'analyzed';
  return {
    status, provider, durationSec: t.durationSec,
    summary: { expectedWords: expected.length, heardWords: t.words.length, matched, near, substituted, omitted, extra: extras.length, coverage: Math.round(coverage * 100) / 100 },
    words: status === 'analyzed' ? words : words.map(w => ({ ayah: w.ayah, index: w.index, op: w.op })).slice(0, 0),
    extras: status === 'analyzed' ? extras : [], transcript: t.text,
    notAssessed: { pronunciation: RECITATION_CAPABILITIES.pronunciation, tajweed: RECITATION_CAPABILITIES.tajweed, confidence: RECITATION_CAPABILITIES.confidence },
    note: status === 'analyzed'
      ? 'These are possible issues derived from a speech-to-text transcript, not a ruling. Listen again and review with a qualified teacher.'
      : 'There is not enough evidence to analyse this recording (wrong passage, noise or silence). Please record again closer to the microphone.',
  };
}
