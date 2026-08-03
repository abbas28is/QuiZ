const db = require('../database');

async function generateValidatedQuestions(category, difficultyPct, amount = 5) {
  const verifiedQuestions = [];

  // 1. فحص الكاش أولاً
  try {
    const cached = db.getVerifiedQuestions(category, difficultyPct, amount);
    if (cached && cached.length >= amount) {
      return cached.slice(0, amount);
    }
    if (cached && cached.length > 0) {
      verifiedQuestions.push(...cached);
    }
  } catch (err) {
    console.error("Cache fetch error:", err.message);
  }

  const needed = amount - verifiedQuestions.length;
  if (needed <= 0) return verifiedQuestions.slice(0, amount);

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing in Environment Variables!");
    return getFallbackQuestions(category, difficultyPct, needed);
  }

  const promptText = `أنت خبير كويزات متخصص. قم بإنشاء ${needed} أسئلة حقيقية ودقيقة في مجال "${category}" بمستوى صعوبة ${difficultyPct}%.
يجب أن ترجع النتيجة بصيغة JSON Array فقط وبدون أي نص آخر قبل أو بعد:
[
  {
    "question": "نص السؤال الدقيق هنا",
    "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
    "correct_answer": "الخيار الأول",
    "explanation": "شرح الإجابة",
    "source_url": "اسم المصدر",
    "confidence_score": 0.95
  }
]`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const rawText = data.candidates[0].content.parts[0].text;
      const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      if (Array.isArray(parsed)) {
        for (const q of parsed) {
          q.category = category;
          q.difficulty_pct = difficultyPct;
          if (q.question && Array.isArray(q.options) && q.options.length === 4 && q.correct_answer) {
            try { db.saveVerifiedQuestion(q); } catch (e) {}
            verifiedQuestions.push(q);
          }
        }
      }
    } else {
      console.error("Gemini API Error Response:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("Fetch API Error:", err.message);
  }

  // إذا لم يرجع الذكاء الاصطناعي أسئلة كافية، يتم تزويد الباقي بأسئلة رياضية/عامة واقعية
  if (verifiedQuestions.length < amount) {
    const extraNeeded = amount - verifiedQuestions.length;
    const fallbacks = getFallbackQuestions(category, difficultyPct, extraNeeded);
    verifiedQuestions.push(...fallbacks);
  }

  return verifiedQuestions.slice(0, amount);
}

function getFallbackQuestions(category, difficultyPct, count) {
  const list = [
    {
      question: "ما هو الفريق الأكثر فوزاً بدوري أبطال أوروبا؟",
      options: ["ريال مدريد", "إيه سي ميلان", "بايرن ميونخ", "برشلونة"],
      correct_answer: "ريال مدريد",
      explanation: "حقق ريال مدريد الرقم القياسي بالفوز بالبطولة.",
      source_url: "UEFA",
      confidence_score: 1.0
    },
    {
      question: "كم عدد اللاعبين في فريق كرة القدم داخل الملعب؟",
      options: ["11 لاعب", "10 لاعبين", "12 لاعب", "9 لاعبين"],
      correct_answer: "11 لاعب",
      explanation: "يتكون كل فريق أساسي من 11 لاعباً مع حارس المرمى.",
      source_url: "FIFA Rules",
      confidence_score: 1.0
    },
    {
      question: "كم مدة الشوط الواحد في مباراة كرة القدم الرسمية؟",
      options: ["45 دقيقة", "40 دقيقة", "50 دقيقة", "30 دقيقة"],
      correct_answer: "45 دقيقة",
      explanation: "المباراة تلعب على شوطين مدة كل شوط 45 دقيقة.",
      source_url: "FIFA",
      confidence_score: 1.0
    },
    {
      question: "من هو اللاعب الملقب بـ (البرغوث)؟",
      options: ["ليونيل ميسي", "كريستيانو رونالدو", "نيمار داسيلفا", "كيليان مبابي"],
      correct_answer: "ليونيل ميسي",
      explanation: "يطلق لقب البرغوث (La Pulga) على الأسطورة ليونيل ميسي.",
      source_url: "Sports Press",
      confidence_score: 1.0
    },
    {
      question: "أي دولة استضافت كأس العالم لكرة القدم عام 2022؟",
      options: ["قطر", "البرازيل", "فرنسا", "روسيا"],
      correct_answer: "قطر",
      explanation: "أقيمت بطولة كأس العالم 2022 في دولة قطر.",
      source_url: "FIFA World Cup 2022",
      confidence_score: 1.0
    }
  ];

  const result = [];
  for (let i = 0; i < count; i++) {
    const item = { ...list[i % list.length] };
    item.category = category;
    item.difficulty_pct = difficultyPct;
    result.push(item);
  }
  return result;
}

module.exports = { generateValidatedQuestions };
