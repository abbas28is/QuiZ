const db = require('../database');

async function generateValidatedQuestions(category, difficultyPct, amount = 5) {
  const verifiedQuestions = [];
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  // نص التوجيه لإنشاء أسئلة بدون خيارات (سؤال وجواب فقط)
  const promptText = `أنت خبير كويزات ومحقق معلومات.
قم بإنشاء ${amount} أسئلة مختلفة وجديدة تماماً في مجال "${category}".
مستوى الصعوبة المطلوبة بالضبط هو: ${difficultyPct}% (حيث 20% سهل، 100% متوسط، 300% صعبة جداً، 500%+ أسئلة متخصصة ومعقدة جداً).

الشروط المهمة:
1. يمنع التكرار، أنشئ أسئلة جديدة تناسب مستوى الصعوبة ${difficultyPct}%.
2. لا تضع أي خيارات (Options)، فقط سؤال وإجابته المباشرة والشرح.

أرجع النتيجة بصيغة JSON Array حصرية فقط، بنفس هذا الهيكل تماماً:
[
  {
    "question": "نص السؤال هنا؟",
    "correct_answer": "الإجابة المباشرة والدقيقة",
    "explanation": "الشرح التوضيحي للمعلومة",
    "source_url": "اسم المصدر أو المرجع العلمي",
    "confidence_score": 0.98
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
          responseMimeType: "application/json",
          temperature: 0.9 // لضمان تنوع الأسئلة وعدم تكرارها
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
          q.options = []; // إخفاء الخيارات
          
          if (q.question && q.correct_answer) {
            try { db.saveVerifiedQuestion(q); } catch (e) {}
            verifiedQuestions.push(q);
          }
        }
      }
    } else {
      console.error("Gemini Response Error:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("Fetch API Error:", err.message);
  }

  return verifiedQuestions;
}

module.exports = { generateValidatedQuestions };
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
