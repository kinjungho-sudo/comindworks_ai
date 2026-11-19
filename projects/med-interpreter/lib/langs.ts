// 지원 언어와 손님 화면 문구. 서버·브라우저 양쪽에서 쓴다.

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

export type GuestUI = {
  welcome: string;
  choose: string;
  tapToSpeak: string;
  listening: string;
  tapToFinish: string;
  translating: string;
  staffSpeaking: string;
  sayAgain: string;
  typeHere: string;
  send: string;
  replay: string;
  disclaimer: string;
  consentTitle: string;
  consentBody: (days: number) => string;
  agree: string;
  decline: string;
  thanks: string;
  stillThere: string;
  continue: string;
  quick: string[]; // 손님용 빠른 답변
  micDenied: string;
  original: string;
};

// quick 순서는 QUICK_KO 와 같아야 한다.
export const QUICK_KO = ["네", "아니요", "다시 한 번 말씀해 주세요", "천천히 말씀해 주세요", "잘 모르겠어요", "감사합니다"];

export const GUEST_UI: Record<GuestLang, GuestUI> = {
  en: {
    welcome: "Welcome",
    choose: "Please choose your language",
    tapToSpeak: "Tap and speak",
    listening: "Listening… tap again when you finish",
    tapToFinish: "Tap to finish",
    translating: "Interpreting…",
    staffSpeaking: "Staff is speaking…",
    sayAgain: "Sorry, I couldn't hear that. Please say it again.",
    typeHere: "Type your message",
    send: "Send",
    replay: "Play again",
    disclaimer: "AI interpretation may contain errors. Please confirm important medical information with the staff.",
    consentTitle: "Saving this conversation",
    consentBody: (d) =>
      `To help with your visit, this conversation will be saved by the hospital and automatically deleted after ${d} days. It may include health information. If you choose not to save it, interpretation works exactly the same.`,
    agree: "Agree and start",
    decline: "Start without saving",
    thanks: "Thank you. Take care.",
    stillThere: "Are you still there?",
    continue: "Continue",
    quick: ["Yes", "No", "Please say that again", "Please speak slowly", "I don't understand", "Thank you"],
    micDenied: "Microphone is not available. Please type instead.",
    original: "Original",
  },
  zh: {
    welcome: "欢迎光临",
    choose: "请选择您的语言",
    tapToSpeak: "点击后说话",
    listening: "正在听… 说完请再点一下",
    tapToFinish: "点击结束",
    translating: "正在翻译…",
    staffSpeaking: "工作人员正在说话…",
    sayAgain: "抱歉，没有听清楚。请再说一遍。",
    typeHere: "请输入内容",
    send: "发送",
    replay: "再听一遍",
    disclaimer: "AI 翻译可能有误。重要的医疗信息请向工作人员确认。",
    consentTitle: "保存对话记录",
    consentBody: (d) =>
      `为了更好地为您服务，医院将保存本次对话，并在 ${d} 天后自动删除。记录中可能包含健康信息。如果您选择不保存，翻译功能完全不受影响。`,
    agree: "同意并开始",
    decline: "不保存，直接开始",
    thanks: "谢谢，请多保重。",
    stillThere: "您还在吗？",
    continue: "继续",
    quick: ["是", "不是", "请再说一遍", "请说慢一点", "我不太明白", "谢谢"],
    micDenied: "无法使用麦克风，请用文字输入。",
    original: "原文",
  },
  ja: {
    welcome: "ようこそ",
    choose: "言語を選んでください",
    tapToSpeak: "タップして話してください",
    listening: "聞いています… 話し終えたらもう一度タップ",
    tapToFinish: "タップして終了",
    translating: "通訳しています…",
    staffSpeaking: "スタッフが話しています…",
    sayAgain: "すみません、聞き取れませんでした。もう一度お話しください。",
    typeHere: "メッセージを入力",
    send: "送信",
    replay: "もう一度聞く",
    disclaimer: "AI通訳には誤りがある場合があります。大切な医療情報はスタッフにご確認ください。",
    consentTitle: "会話の記録について",
    consentBody: (d) =>
      `ご案内のため、この会話は病院に保存され、${d}日後に自動的に削除されます。健康に関する情報が含まれる場合があります。保存しない場合でも、通訳は同じようにご利用いただけます。`,
    agree: "同意して始める",
    decline: "保存せずに始める",
    thanks: "ありがとうございました。お大事に。",
    stillThere: "まだいらっしゃいますか？",
    continue: "続ける",
    quick: ["はい", "いいえ", "もう一度お願いします", "ゆっくり話してください", "よくわかりません", "ありがとうございます"],
    micDenied: "マイクが使えません。文字で入力してください。",
    original: "原文",
  },
  ru: {
    welcome: "Добро пожаловать",
    choose: "Выберите язык",
    tapToSpeak: "Нажмите и говорите",
    listening: "Слушаю… нажмите ещё раз, когда закончите",
    tapToFinish: "Нажмите, чтобы закончить",
    translating: "Перевожу…",
    staffSpeaking: "Говорит сотрудник…",
    sayAgain: "Извините, не расслышал. Повторите, пожалуйста.",
    typeHere: "Введите сообщение",
    send: "Отправить",
    replay: "Прослушать ещё раз",
    disclaimer: "ИИ-перевод может содержать ошибки. Важную медицинскую информацию уточняйте у сотрудников.",
    consentTitle: "Сохранение разговора",
    consentBody: (d) =>
      `Чтобы помочь Вам, больница сохранит этот разговор и автоматически удалит его через ${d} дн. Он может содержать сведения о здоровье. Если Вы не согласны на сохранение, перевод будет работать точно так же.`,
    agree: "Согласен, начать",
    decline: "Начать без сохранения",
    thanks: "Спасибо. Будьте здоровы.",
    stillThere: "Вы ещё здесь?",
    continue: "Продолжить",
    quick: ["Да", "Нет", "Повторите, пожалуйста", "Говорите медленнее, пожалуйста", "Я не понимаю", "Спасибо"],
    micDenied: "Микрофон недоступен. Пожалуйста, введите текст.",
    original: "Оригинал",
  },
  vi: {
    welcome: "Xin chào",
    choose: "Vui lòng chọn ngôn ngữ",
    tapToSpeak: "Chạm rồi nói",
    listening: "Đang nghe… nói xong hãy chạm lại",
    tapToFinish: "Chạm để kết thúc",
    translating: "Đang phiên dịch…",
    staffSpeaking: "Nhân viên đang nói…",
    sayAgain: "Xin lỗi, tôi chưa nghe rõ. Vui lòng nói lại.",
    typeHere: "Nhập tin nhắn",
    send: "Gửi",
    replay: "Nghe lại",
    disclaimer: "Phiên dịch bằng AI có thể có sai sót. Vui lòng xác nhận thông tin y tế quan trọng với nhân viên.",
    consentTitle: "Lưu cuộc trò chuyện",
    consentBody: (d) =>
      `Để hỗ trợ quý vị, bệnh viện sẽ lưu cuộc trò chuyện này và tự động xóa sau ${d} ngày. Nội dung có thể bao gồm thông tin sức khỏe. Nếu quý vị không đồng ý lưu, việc phiên dịch vẫn hoạt động như bình thường.`,
    agree: "Đồng ý và bắt đầu",
    decline: "Bắt đầu không lưu",
    thanks: "Cảm ơn quý vị. Chúc quý vị mau khỏe.",
    stillThere: "Quý vị vẫn còn ở đây chứ?",
    continue: "Tiếp tục",
    quick: ["Vâng", "Không", "Xin nói lại một lần nữa", "Xin nói chậm hơn", "Tôi không hiểu", "Cảm ơn"],
    micDenied: "Không dùng được micrô. Vui lòng nhập chữ.",
    original: "Bản gốc",
  },
};
