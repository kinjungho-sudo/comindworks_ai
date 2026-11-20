// 지원 언어, 언어 자동 판별, 손님 화면 문구. 서버·브라우저 양쪽에서 쓴다.
// 인도네시아어 코드는 DB 의 id 열과 겹치지 않게 "idn" 을 쓴다.

export const GUEST_LANGS = ["en", "zh", "ja", "ru", "vi", "mn", "th", "idn", "ar", "uz"] as const;
export const ALL_LANGS = ["ko", ...GUEST_LANGS] as const;
export type Lang = (typeof ALL_LANGS)[number];
export type GuestLang = (typeof GUEST_LANGS)[number];

export const LANG_META: Record<Lang, { native: string; korean: string; english: string; html: string; flag: string; rtl?: boolean }> = {
  ko: { native: "한국어", korean: "한국어", english: "Korean", html: "ko", flag: "🇰🇷" },
  en: { native: "English", korean: "영어", english: "English", html: "en", flag: "🇺🇸" },
  zh: { native: "中文", korean: "중국어", english: "Simplified Chinese", html: "zh-CN", flag: "🇨🇳" },
  ja: { native: "日本語", korean: "일본어", english: "Japanese", html: "ja", flag: "🇯🇵" },
  ru: { native: "Русский", korean: "러시아어", english: "Russian", html: "ru", flag: "🇷🇺" },
  vi: { native: "Tiếng Việt", korean: "베트남어", english: "Vietnamese", html: "vi", flag: "🇻🇳" },
  mn: { native: "Монгол", korean: "몽골어", english: "Mongolian (Cyrillic)", html: "mn", flag: "🇲🇳" },
  th: { native: "ไทย", korean: "태국어", english: "Thai", html: "th", flag: "🇹🇭" },
  idn: { native: "Bahasa Indonesia", korean: "인도네시아어", english: "Indonesian", html: "id", flag: "🇮🇩" },
  ar: { native: "العربية", korean: "아랍어", english: "Arabic", html: "ar", flag: "🇸🇦", rtl: true },
  uz: { native: "Oʻzbekcha", korean: "우즈베크어", english: "Uzbek (Latin script)", html: "uz", flag: "🇺🇿" },
};

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (ALL_LANGS as readonly string[]).includes(v);
}
export function isGuestLang(v: unknown): v is GuestLang {
  return typeof v === "string" && (GUEST_LANGS as readonly string[]).includes(v);
}

const WORDS: Record<"en" | "idn" | "uz", string[]> = {
  en: ["the", "is", "are", "i", "you", "my", "to", "a", "and", "do", "have", "what", "where", "please", "can", "need", "it", "hello", "hi", "thank", "yes", "no", "doctor", "pain"],
  idn: ["yang", "dan", "saya", "tidak", "ini", "itu", "ada", "apa", "bisa", "sakit", "mau", "di", "ke", "dokter", "terima", "kasih", "ya", "berapa", "mana", "sudah", "belum", "perut", "kepala", "selamat"],
  uz: ["va", "men", "bu", "qayerda", "kerak", "bor", "yoʻq", "yo'q", "salom", "rahmat", "ha", "qancha", "shifokor", "og'riyapti", "ogʻriyapti", "qorin", "bosh", "iltimos", "nima", "siz", "menga", "uchun"],
};

// 받아쓴 문장의 글자·자주 쓰는 단어로 언어를 판별한다. 애매하면 hint(현재 손님 언어)를 따른다.
export function detectLang(text: string, hint?: Lang): Lang | null {
  const t = text.replace(/[\s\d.,!?…·'"()\-:;؟،。、，？！]/g, "");
  if (!t) return null;
  const count = (re: RegExp) => (t.match(re) ?? []).length;
  const hangul = count(/[가-힣ㄱ-ㆎ]/g);
  const kana = count(/[぀-ヿ]/g);
  const han = count(/[一-鿿]/g);
  const cyr = count(/[Ѐ-ӿ]/g);
  const thai = count(/[฀-๿]/g);
  const arab = count(/[؀-ۿݐ-ݿ]/g);
  const latin = count(/[a-zA-ZÀ-ɏḀ-ỿʻʼ]/g);
  const max = Math.max(hangul, kana + han, cyr, thai, arab, latin);
  if (max === 0) return null;
  if (hangul === max) return "ko";
  if (kana + han === max) return kana > 0 ? "ja" : "zh";
  if (thai === max) return "th";
  if (arab === max) return "ar";
  if (cyr === max) {
    if (/[өүӨҮ]/.test(text)) return "mn";
    const w = text.toLowerCase();
    const mnScore = ["байна", " уу", "сайн", "энэ", "хаана", " вэ", " юу", "баярлалаа", "эмч", "өвд"].filter((x) => w.includes(x)).length;
    if (mnScore > 0) return "mn";
    return hint === "mn" ? "mn" : "ru";
  }
  if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text)) return "vi";
  const words = text.toLowerCase().replace(/[.,!?;:()"]/g, " ").split(/\s+/).filter(Boolean);
  const score = (k: "en" | "idn" | "uz") => words.filter((x) => WORDS[k].includes(x)).length + (k === "uz" ? count(/[ʻʼ]|o'|g'/g) : 0);
  const s = { en: score("en"), idn: score("idn"), uz: score("uz") };
  const best = (Object.entries(s) as ["en" | "idn" | "uz", number][]).sort((a, b) => b[1] - a[1]);
  if (best[0][1] === 0 || best[0][1] === best[1][1]) return hint === "idn" || hint === "uz" || hint === "en" ? hint : best[0][1] === 0 ? "en" : best[0][0];
  return best[0][0];
}

// 사람 통역을 권할 만한 의료 내용 (한국어 기준)
export const RISK_WORDS = ["수술", "마취", "동의서", "부작용", "처방", "복용", "용량", "진단", "암", "임신", "알레르기", "출혈", "응급", "가슴", "호흡", "의식", "주사", "검사 결과", "입원", "시술", "약을", "약은", "피가", "기절", "경련", "금식", "조영제", "내시경", "수면", "마약", "혈압", "당뇨", "투약"];
export function isRisky(koText: string) {
  return RISK_WORDS.some((w) => koText.includes(w));
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
  humanTitle: string;
  humanBody: string;
  amountLabel: string;
  close: string;
  failed: string;
  guest: string;
  staff: string;
  humanBtn: string;
  humanAsked: string;
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
    humanTitle: "Connecting a human interpreter",
    humanBody: "The staff is calling a professional interpreter for you. Please wait a moment.",
    amountLabel: "Amount to pay",
    close: "Close",
    failed: "Interpretation failed. Please say it again.",
    guest: "Guest",
    staff: "Staff",
    humanBtn: "Request a human interpreter",
    humanAsked: "Request sent to the staff",
  },
  zh: {
    welcome: "欢迎",
    justSpeak: "请直接用您的语言说话，系统会立即翻译。",
    listening: "正在聆听…",
    paused: "麦克风已暂停",
    speaking: "正在播放…",
    staffSpeaking: "工作人员正在说话…",
    replay: "再播放一次",
    original: "原文",
    disclaimer: "AI 翻译可能存在错误。重要的医疗信息请与工作人员确认。",
    saveAsk: (d) => `医院可以保存本次对话 ${d} 天吗？之后会自动删除。无论是否保存，翻译服务都一样。`,
    saveYes: "是，保存",
    saveNo: "不保存",
    saving: "正在保存本次对话",
    micDenied: "麦克风不可用。",
    tapToStart: "点击开始",
    humanTitle: "正在连接人工翻译",
    humanBody: "工作人员正在为您联系专业翻译。请稍等。",
    amountLabel: "应付金额",
    close: "关闭",
    failed: "翻译失败。请再说一遍。",
    guest: "访客",
    staff: "工作人员",
    humanBtn: "请求人工翻译",
    humanAsked: "请求已发送给工作人员",
  },
  ja: {
    welcome: "ようこそ",
    justSpeak: "ご自身の言語でそのままお話しください。すぐに通訳されます。",
    listening: "聞き取り中…",
    paused: "マイクは一時停止中です",
    speaking: "発話中…",
    staffSpeaking: "スタッフが話しています…",
    replay: "もう一度再生",
    original: "原文",
    disclaimer: "AI通訳には誤りが含まれる場合があります。重要な医療情報はスタッフにご確認ください。",
    saveAsk: (d) => `この会話を病院で${d}日間保存してもよろしいですか？その後、自動的に削除されます。保存の有無にかかわらず、通訳は同じように利用できます。`,
    saveYes: "はい、保存します",
    saveNo: "いいえ",
    saving: "この会話は保存されています",
    micDenied: "マイクを利用できません。",
    tapToStart: "タップして開始",
    humanTitle: "人の通訳者に接続しています",
    humanBody: "スタッフが専門の通訳者を呼んでいます。少々お待ちください。",
    amountLabel: "お支払い金額",
    close: "閉じる",
    failed: "通訳に失敗しました。もう一度お話しください。",
    guest: "ゲスト",
    staff: "スタッフ",
    humanBtn: "通訳者を呼ぶ",
    humanAsked: "リクエストをスタッフに送信しました",
  },
  ru: {
    welcome: "Добро пожаловать",
    justSpeak: "Просто говорите на своём языке. Перевод будет выполнен сразу.",
    listening: "Слушаем…",
    paused: "Микрофон приостановлен",
    speaking: "Говорим…",
    staffSpeaking: "Говорит сотрудник…",
    replay: "Воспроизвести ещё раз",
    original: "Оригинал",
    disclaimer: "ИИ-перевод может содержать ошибки. Пожалуйста, подтверждайте важную медицинскую информацию у сотрудников.",
    saveAsk: (d) => `Разрешаете ли Вы больнице хранить этот разговор в течение ${d} дней? После этого он будет автоматически удалён. Перевод будет работать одинаково в любом случае.`,
    saveYes: "Да, сохранить",
    saveNo: "Нет",
    saving: "Этот разговор сохраняется",
    micDenied: "Микрофон недоступен.",
    tapToStart: "Нажмите, чтобы начать",
    humanTitle: "Подключение переводчика",
    humanBody: "Сотрудник вызывает для Вас профессионального переводчика. Пожалуйста, подождите немного.",
    amountLabel: "Сумма к оплате",
    close: "Закрыть",
    failed: "Не удалось выполнить перевод. Пожалуйста, скажите это ещё раз.",
    guest: "Гость",
    staff: "Сотрудник",
    humanBtn: "Запросить переводчика",
    humanAsked: "Запрос отправлен сотрудникам",
  },
  vi: {
    welcome: "Kính chào quý vị",
    justSpeak: "Quý vị cứ nói bằng ngôn ngữ của mình. Nội dung sẽ được phiên dịch ngay.",
    listening: "Đang nghe…",
    paused: "Đã tạm dừng micro",
    speaking: "Đang nói…",
    staffSpeaking: "Nhân viên đang nói…",
    replay: "Phát lại",
    original: "Bản gốc",
    disclaimer: "Phiên dịch bằng AI có thể có sai sót. Vui lòng xác nhận thông tin y tế quan trọng với nhân viên.",
    saveAsk: (d) => `Bệnh viện có thể lưu cuộc trò chuyện này trong ${d} ngày không? Sau đó cuộc trò chuyện sẽ được tự động xóa. Dù quý vị chọn thế nào, việc phiên dịch vẫn hoạt động như nhau.`,
    saveYes: "Đồng ý lưu",
    saveNo: "Không",
    saving: "Cuộc trò chuyện này đang được lưu",
    micDenied: "Không thể sử dụng micro.",
    tapToStart: "Chạm để bắt đầu",
    humanTitle: "Đang kết nối phiên dịch viên",
    humanBody: "Nhân viên đang gọi phiên dịch viên chuyên nghiệp cho quý vị. Vui lòng chờ trong giây lát.",
    amountLabel: "Số tiền cần thanh toán",
    close: "Đóng",
    failed: "Phiên dịch không thành công. Vui lòng nói lại.",
    guest: "Khách",
    staff: "Nhân viên",
    humanBtn: "Yêu cầu phiên dịch viên",
    humanAsked: "Yêu cầu đã được gửi đến nhân viên",
  },
  mn: {
    welcome: "Тавтай морилно уу",
    justSpeak: "Өөрийн хэлээрээ ярина уу. Шууд орчуулагдана.",
    listening: "Сонсож байна…",
    paused: "Микрофон түр зогссон",
    speaking: "Ярьж байна…",
    staffSpeaking: "Ажилтан ярьж байна…",
    replay: "Дахин тоглуулах",
    original: "Эх хувилбар",
    disclaimer: "AI орчуулгад алдаа байж болзошгүй. Эмнэлгийн чухал мэдээллийг ажилтнаас заавал баталгаажуулна уу.",
    saveAsk: (d) => `Эмнэлэг энэ яриаг ${d} хоног хадгалж болох уу? Дараа нь автоматаар устгагдана. Хадгалсан эсэхээс үл хамааран орчуулга хэвийн ажиллана.`,
    saveYes: "Тийм, хадгалах",
    saveNo: "Үгүй",
    saving: "Энэ яриа хадгалагдаж байна",
    micDenied: "Микрофон ашиглах боломжгүй байна.",
    tapToStart: "Эхлэхийн тулд товшино уу",
    humanTitle: "Хүний орчуулагчтай холбогдож байна",
    humanBody: "Ажилтан танд мэргэжлийн орчуулагч дуудаж байна. Түр хүлээнэ үү.",
    amountLabel: "Төлөх дүн",
    close: "Хаах",
    failed: "Орчуулга амжилтгүй боллоо. Дахин хэлнэ үү.",
    guest: "Зочин",
    staff: "Ажилтан",
    humanBtn: "Хүний орчуулагч хүсэх",
    humanAsked: "Хүсэлтийг ажилтнуудад илгээлээ",
  },
  th: {
    welcome: "ยินดีต้อนรับค่ะ",
    justSpeak: "พูดภาษาของคุณได้เลย ระบบจะแปลให้ทันทีค่ะ",
    listening: "กำลังฟัง…",
    paused: "ไมโครโฟนหยุดชั่วคราว",
    speaking: "กำลังพูด…",
    staffSpeaking: "เจ้าหน้าที่กำลังพูด…",
    replay: "เล่นอีกครั้ง",
    original: "ต้นฉบับ",
    disclaimer: "การแปลด้วย AI อาจมีข้อผิดพลาด กรุณายืนยันข้อมูลทางการแพทย์ที่สำคัญกับเจ้าหน้าที่ค่ะ",
    saveAsk: (d) => `โรงพยาบาลขอเก็บบทสนทนานี้ไว้ ${d} วันได้ไหมคะ หลังจากนั้นจะลบอัตโนมัติ การแปลยังใช้งานได้เหมือนเดิมไม่ว่าคุณจะเลือกอย่างไรค่ะ`,
    saveYes: "ใช่ บันทึกไว้",
    saveNo: "ไม่",
    saving: "กำลังบันทึกบทสนทนานี้",
    micDenied: "ไม่สามารถใช้ไมโครโฟนได้ค่ะ",
    tapToStart: "แตะเพื่อเริ่ม",
    humanTitle: "กำลังเชื่อมต่อกับล่าม",
    humanBody: "เจ้าหน้าที่กำลังโทรหาล่ามมืออาชีพให้คุณ กรุณารอสักครู่ค่ะ",
    amountLabel: "ยอดที่ต้องชำระ",
    close: "ปิด",
    failed: "การแปลไม่สำเร็จ กรุณาพูดอีกครั้งค่ะ",
    guest: "ผู้มาติดต่อ",
    staff: "เจ้าหน้าที่",
    humanBtn: "ขอล่ามที่เป็นเจ้าหน้าที่",
    humanAsked: "ส่งคำขอไปยังเจ้าหน้าที่แล้ว",
  },
  idn: {
    welcome: "Selamat datang",
    justSpeak: "Silakan bicara dalam bahasa Anda. Akan langsung diterjemahkan.",
    listening: "Mendengarkan…",
    paused: "Mikrofon dijeda",
    speaking: "Berbicara…",
    staffSpeaking: "Petugas sedang berbicara…",
    replay: "Putar lagi",
    original: "Asli",
    disclaimer: "Interpretasi AI dapat mengandung kesalahan. Mohon pastikan informasi medis penting dengan petugas.",
    saveAsk: (d) => `Bolehkah rumah sakit menyimpan percakapan ini selama ${d} hari? Setelah itu akan dihapus otomatis. Interpretasi tetap berjalan sama.`,
    saveYes: "Ya, simpan",
    saveNo: "Tidak",
    saving: "Percakapan ini sedang disimpan",
    micDenied: "Mikrofon tidak tersedia.",
    tapToStart: "Ketuk untuk mulai",
    humanTitle: "Menghubungkan ke penerjemah manusia",
    humanBody: "Petugas sedang menghubungi penerjemah profesional untuk Anda. Mohon tunggu sebentar.",
    amountLabel: "Jumlah yang harus dibayar",
    close: "Tutup",
    failed: "Interpretasi gagal. Mohon ucapkan sekali lagi.",
    guest: "Tamu",
    staff: "Petugas",
    humanBtn: "Minta juru bahasa manusia",
    humanAsked: "Permintaan telah dikirim ke staf",
  },
  ar: {
    welcome: "مرحبًا",
    justSpeak: "تحدّث بلغتك فقط. ستتم الترجمة فورًا.",
    listening: "جارٍ الاستماع…",
    paused: "تم إيقاف الميكروفون مؤقتًا",
    speaking: "جارٍ التحدث…",
    staffSpeaking: "الموظف يتحدث…",
    replay: "تشغيل مرة أخرى",
    original: "النص الأصلي",
    disclaimer: "قد تحتوي الترجمة بالذكاء الاصطناعي على أخطاء. يُرجى تأكيد المعلومات الطبية المهمة مع الموظف.",
    saveAsk: (d) => `هل تسمح للمستشفى بالاحتفاظ بهذه المحادثة لمدة ${d} أيام؟ سيتم حذفها تلقائيًا بعد ذلك. ستعمل الترجمة بالطريقة نفسها في كلتا الحالتين.`,
    saveYes: "نعم، احفظها",
    saveNo: "لا",
    saving: "يتم حفظ هذه المحادثة",
    micDenied: "الميكروفون غير متاح.",
    tapToStart: "اضغط للبدء",
    humanTitle: "جارٍ الاتصال بمترجم بشري",
    humanBody: "يتصل الموظف بمترجم محترف لمساعدتك. يُرجى الانتظار لحظة.",
    amountLabel: "المبلغ المطلوب دفعه",
    close: "إغلاق",
    failed: "فشلت الترجمة. يُرجى قول ذلك مرة أخرى.",
    guest: "ضيف",
    staff: "الموظف",
    humanBtn: "طلب مترجم بشري",
    humanAsked: "تم إرسال الطلب إلى الموظفين",
  },
  uz: {
    welcome: "Xush kelibsiz",
    justSpeak: "O‘z tilingizda gapiring. Darhol tarjima qilinadi.",
    listening: "Tinglanmoqda…",
    paused: "Mikrofon to‘xtatildi",
    speaking: "Gapirilmoqda…",
    staffSpeaking: "Xodim gapiryapti…",
    replay: "Qayta eshittirish",
    original: "Asl matn",
    disclaimer: "AI tarjimasida xatolar bo‘lishi mumkin. Muhim tibbiy ma’lumotlarni xodim bilan tasdiqlang.",
    saveAsk: (d) => `Shifoxona ushbu suhbatni ${d} kun saqlashi mumkinmi? Keyin u avtomatik o‘chiriladi. Qanday javob bersangiz ham, tarjima bir xil ishlaydi.`,
    saveYes: "Ha, saqlang",
    saveNo: "Yo‘q",
    saving: "Ushbu suhbat saqlanmoqda",
    micDenied: "Mikrofon mavjud emas.",
    tapToStart: "Boshlash uchun bosing",
    humanTitle: "Jonli tarjimon ulanmoqda",
    humanBody: "Xodim siz uchun professional tarjimonni chaqiryapti. Iltimos, biroz kuting.",
    amountLabel: "To‘lanadigan summa",
    close: "Yopish",
    failed: "Tarjima bajarilmadi. Iltimos, yana ayting.",
    guest: "Mehmon",
    staff: "Xodim",
    humanBtn: "Inson tarjimon so‘rash",
    humanAsked: "So‘rov xodimlarga yuborildi",
  },
};
