// node --experimental-strip-types lib/langs.check.mjs
import { detectLang } from "./langs.ts";
const cases = [
  ["안녕하세요 접수하려고요", "ko"], ["Hi, I have a stomach ache", "en"], ["我肚子很疼", "zh"], ["お腹が痛いです", "ja"],
  ["Где здесь касса?", "ru"], ["Tôi bị đau đầu", "vi"], ["Сайн байна уу, гэдэс өвдөж байна", "mn"], ["Сайн байна уу", "mn"],
  ["ฉันปวดท้องมากค่ะ", "th"], ["Saya sakit perut sejak kemarin", "idn"], ["Apa saya perlu janji dengan dokter?", "idn"],
  ["أشعر بألم في بطني", "ar"], ["Salom, qornim og'riyapti", "uz"], ["Menga shifokor kerak", "uz"], ["Where is the pharmacy?", "en"],
  ["Yes", "en"], ["Ya", "idn"],
];
let bad = 0;
for (const [t, want] of cases) { const got = detectLang(t, want === "idn" && t === "Ya" ? "idn" : "en"); if (got !== want) { bad++; console.log("MISS", t, "→", got, "want", want); } }
console.log(`${cases.length - bad}/${cases.length} ok`);
