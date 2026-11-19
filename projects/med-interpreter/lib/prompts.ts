import "server-only";
import { LANG_META, type Lang } from "./langs";

export type Turn = { speaker: "staff" | "guest"; text: string };

export function interpreterPrompt(opts: {
  hospital: string; from: Lang; to: Lang; speaker: "staff" | "guest";
  glossary: { src: string; dst: string; note: string | null }[]; history: Turn[];
}) {
  const F = LANG_META[opts.from].english, T = LANG_META[opts.to].english;
  const who = opts.speaker === "staff"
    ? `the hospital receptionist (speaking ${F}) to a foreign patient or visitor`
    : `a foreign patient or visitor (speaking ${F}, possibly mixed with other languages) to the Korean receptionist`;
  const register = opts.speaker === "staff"
    ? `Use the courteous, warm register of hospital staff addressing a patient${opts.to === "ja" ? " (です/ます調)" : opts.to === "ru" ? " (formal Вы)" : opts.to === "vi" ? " (address the listener as quý vị, polite particles)" : opts.to === "th" ? " (polite particles ค่ะ/คะ)" : opts.to === "ar" ? " (Modern Standard Arabic)" : opts.to === "mn" ? " (Mongolian Cyrillic, polite Та)" : opts.to === "uz" ? " (Uzbek Latin script, polite Siz)" : opts.to === "idn" ? " (polite Bapak/Ibu where natural)" : ""}.`
    : `Render it as natural, polite spoken Korean (존댓말, e.g. "~인데요", "~해야 하나요?"), faithfully conveying exactly what the guest said, in the first person. Avoid stiff translationese; use the words Korean patients actually use at a hospital (e.g. "see a doctor" → "진료를 받다", "stomach ache" → "배가 아프다").`;
  const lines = [
    `You are a professional medical interpreter at the reception desk of ${opts.hospital}, a hospital in South Korea.`,
    `Interpret what ${who} said into ${T}.`,
    "",
    "Rules:",
    `- Output ONLY the interpretation in ${T}. No quotes, labels, notes, romanization or explanations.`,
    "- Be faithful: never add, omit or soften information. Never give medical advice of your own.",
    "- Keep numbers, times, dates, floors, room numbers, money amounts and names exactly.",
    `- ${register}`,
    "- It will be read aloud, so write natural spoken sentences.",
    "- Speech recognition may contain small errors; infer the most plausible meaning from the hospital context.",
    "- If the utterance is a fragment or a single word, interpret it as such. Never answer or ask questions yourself.",
    `- If the input is already in ${T}, output it unchanged.`,
  ];
  if (opts.glossary.length) {
    lines.push("", "Hospital glossary — when one of these comes up, use exactly this rendering (it may add the location or official name):");
    for (const g of opts.glossary) lines.push(`- ${g.src} → ${g.dst}${g.note ? ` (${g.note})` : ""}`);
  }
  if (opts.history.length) {
    lines.push("", "Recent conversation, for context only (do not translate it):");
    for (const h of opts.history.slice(-6)) lines.push(`${h.speaker === "staff" ? "Receptionist" : "Guest"}: ${h.text}`);
  }
  return lines.join("\n");
}
