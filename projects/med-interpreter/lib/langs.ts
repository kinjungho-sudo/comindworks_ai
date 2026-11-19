// 지원 언어, 언어 자동 판별, 손님 화면 문구. 서버·브라우저 양쪽에서 쓴다.

export const GUEST_LANGS = ["en", "zh", "ja", "ru", "vi"] as const;
export const ALL_LANGS = ["ko", ...GUEST_LANGS] as const;
export type Lang = (typeof ALL_LANGS)[number];
export type GuestLang = (typeof GUEST_LANGS)[number];

export const LANG_META: Record<Lang, { native: string; korean: string; english: string; html: string; flag: string }> = {
  ko: { native: "한국어", korean: "한국어", english: "Korean", html: "ko", flag: "🇰🇷" },
  en: { native: "English", korean: "영어", english: "English", html: "en", flag: "🇺🇸" },
  zh: { native: "中文", korean: "중국어", english: "Simplified Chinese", html: "zh-CN", flag: "🇨🇳" },
  ja: { native: "日本語", korean: "일본어", english: "Japanese", html: "ja", flag: "🇯🇵" },
  ru: { native: "Русский", korean: "러시아어", english: "Russian", html: "ru", flag: "🇷🇺" },
  vi: { native: "Tiếng Việt", korean: "베트남어", english: "Vietnamese", html: "vi", flag: "🇻🇳" },
};

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (ALL_LANGS as readonly string[]).includes(v);
}
export function isGuestLang(v: unknown): v is GuestLang {
  return typeof v === "string" && (GUEST_LANGS as readonly string[]).includes(v);
}

// 받아쓴 문장의 글자로 언어를 판별한다. 라틴 문자는 베트남어 성조 표시가 있으면 vi, 아니면 en.
export function detectLang(text: string): Lang | null {
  const t = text.replace(/[\s\d.,!?…·'"()\-:;]/g, "");
  if (!t) return null;
  const count = (re: RegExp) => (t.match(re) ?? []).length;
  const hangul = count(/[가-힣ㄱ-ㆎ]/g);
  const kana = count(/[぀-ヿ]/g);
  const han = count(/[一-鿿]/g);
  const cyr = count(/[Ѐ-ӿ]/g);
  const latin = count(/[a-zA-ZÀ-ɏḀ-ỿ]/g);
  const viet = count(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĂÂĐÊÔƠƯ]/g);
  const max = Math.max(hangul, kana + han, cyr, latin);
  if (max === 0) return null;
  if (hangul === max) return "ko";
  if (kana + han === max) return kana > 0 ? "ja" : "zh";
  if (cyr === max) return "ru";
  return viet >= 1 ? "vi" : "en";
}

export type GuestUI = {
  welcome: string;
  justSpeak: string;
  listening: string;
  paused: string;
  speaking: string;
  staffSpeaking: string;
  replay: string;
  original: string;
  disclaimer: string;
  saveAsk: (days: number) => string;
  saveYes: string;
  saveNo: string;
  saving: string;
  micDenied: string;
  tapToStart: string;
};

export const GUEST_UI: Record<GuestLang, GuestUI> = {
  en: {
    welcome: "Welcome",
    justSpeak: "Just speak in your language. It will be interpreted right away.",
    listening: "Listening…",
    paused: "Microphone paused",
    speaking: "Speaking…",
    staffSpeaking: "Staff is speaking…",
    replay: "Play again",
    original: "Original",
    disclaimer: "AI interpretation may contain errors. Please confirm important medical information with the staff.",
    saveAsk: (d) => `May the hospital keep this conversation for ${d} days? It is deleted automatically afterwards. Interpretation works the same either way.`,
    saveYes: "Yes, save",
    saveNo: "No",
    saving: "This conversation is being saved",
    micDenied: "Microphone is not available.",
    tapToStart: "Tap to start",
  },
  zh: {
    welcome: "欢迎光临",
    justSpeak: "请直接用您的语言说话，会马上为您翻译。",
    listening: "正在听…",
    paused: "麦克风已暂停",
    speaking: "正在说话…",
    staffSpeaking: "工作人员正在说话…",
    replay: "再听一遍",
    original: "原文",
    disclaimer: "AI 翻译可能有误。重要的医疗信息请向工作人员确认。",
    saveAsk: (d) => `医院可以将本次对话保存 ${d} 天吗？到期后会自动删除。无论是否同意，翻译功能都一样。`,
    saveYes: "同意保存",
    saveNo: "不同意",
    saving: "本次对话正在保存",
    micDenied: "无法使用麦克风。",
    tapToStart: "点击开始",
  },
  ja: {
    welcome: "ようこそ",
    justSpeak: "ご自分の言葉でそのままお話しください。すぐに通訳します。",
    listening: "聞いています…",
    paused: "マイク一時停止中",
    speaking: "話しています…",
    staffSpeaking: "スタッフが話しています…",
    replay: "もう一度聞く",
    original: "原文",
    disclaimer: "AI通訳には誤りがある場合があります。大切な医療情報はスタッフにご確認ください。",
    saveAsk: (d) => `この会話を病院で${d}日間保存してもよろしいですか？期間が過ぎると自動で削除されます。どちらを選んでも通訳は同じように使えます。`,
    saveYes: "保存してよい",
    saveNo: "いいえ",
    saving: "この会話は保存されています",
    micDenied: "マイクが使えません。",
    tapToStart: "タップして開始",
  },
  ru: {
    welcome: "Добро пожаловать",
    justSpeak: "Просто говорите на своём языке — перевод появится сразу.",
    listening: "Слушаю…",
    paused: "Микрофон на паузе",
    speaking: "Говорит…",
    staffSpeaking: "Говорит сотрудник…",
    replay: "Прослушать ещё раз",
    original: "Оригинал",
    disclaimer: "ИИ-перевод может содержать ошибки. Важную медицинскую информацию уточняйте у сотрудников.",
    saveAsk: (d) => `Можно больнице сохранить этот разговор на ${d} дн.? Затем он удаляется автоматически. Перевод работает одинаково в любом случае.`,
    saveYes: "Да, сохранить",
    saveNo: "Нет",
    saving: "Разговор сохраняется",
    micDenied: "Микрофон недоступен.",
    tapToStart: "Нажмите, чтобы начать",
  },
  vi: {
    welcome: "Xin chào",
    justSpeak: "Quý vị cứ nói bằng ngôn ngữ của mình, sẽ được phiên dịch ngay.",
    listening: "Đang nghe…",
    paused: "Đã tạm dừng micrô",
    speaking: "Đang nói…",
    staffSpeaking: "Nhân viên đang nói…",
    replay: "Nghe lại",
    original: "Bản gốc",
    disclaimer: "Phiên dịch bằng AI có thể có sai sót. Vui lòng xác nhận thông tin y tế quan trọng với nhân viên.",
    saveAsk: (d) => `Bệnh viện có thể lưu cuộc trò chuyện này trong ${d} ngày không? Sau đó sẽ tự động xóa. Dù chọn thế nào, việc phiên dịch vẫn như nhau.`,
    saveYes: "Đồng ý lưu",
    saveNo: "Không",
    saving: "Cuộc trò chuyện đang được lưu",
    micDenied: "Không dùng được micrô.",
    tapToStart: "Chạm để bắt đầu",
  },
};
