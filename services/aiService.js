const { GoogleGenerativeAI } = require('@google/generative-ai');
const ValidationService = require('./validationService');
const db = require('../database');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateValidatedQuestions(category, difficultyPct, amount = 5) {
  const verifiedQuestions = [];
  const maxAttempts = amount * 3;
  let attempts = 0;

  const cached = db.getVerifiedQuestions(category, difficultyPct, amount);
  verifiedQuestions.push(...cached);

  while (verifiedQuestions.length < amount && attempts < maxAttempts) {
    attempts++;
    const needed = amount - verifiedQuestions.length;

    const prompt = `
أنت خبير كويزات ومحقق معلومات موثوق جداً.
قم بإنشاء ${needed} أسئلة في قسم: "${category}".
مستوى الصعوبة المطلوبة بالضبط: ${difficultyPct}%

معايير الصعوبة الحقيقية:
- 20%: أسئلة بسيطة ومعروفة عامة.
- 50%: متوسطة تحتاج معرفة جيدة.
- 100%: صعبة جداً للمتخصصين.
- 200%: نادرة جداً ودقيقة.
- 500%: عميقة تحتاج بحث أكاديمي ومصادر موثوقة.
- 1000%: شبه مستحيلة، معلومات دقيقة جداً وموثقة.

شروط غير قابلة للتفاوض:
1. إجابة واحدة صحيحة قطعية 100%.
2. الخيارات الخاطئة تكون منطقية.
3. يمنع الاعتماد على معلومات غير موثوقة.
4. اذكر مصدر المعلومة (منظمة، كتاب، موقع رسمي).
5. أعط درجة ثقة من 0.0 إلى 1.0 (confidence_score).

قم بالرد بصيغة JSON حصرية بأسلوب Array كالتالي:
[
  {
    "question": "نص السؤال الدقيق",
    "options": ["الخيار A", "الخيار B", "الخيار C", "الخيار D"],
    "correct_answer": "الخيار الصحيح المطابق تماما لأحد الخيارات",
    "explanation": "شرح مختصر وموثق للإجابة",
    "source_url": "اسم المصادر الرسمية أو المرجع العلمي",
    "confidence_score": 0.98
  }
]
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsedQuestions = JSON.parse(response.text);

      for (const q of parsedQuestions) {
        q.category = category;
        q.difficulty_pct = difficultyPct;

        const structCheck = ValidationService.validateQuestionStructure(q);
        const factCheck = ValidationService.verifyFactIntegrity(q);

        if (structCheck.valid && factCheck.valid) {
          db.saveVerifiedQuestion(q);
          verifiedQuestions.push(q);
        }

        if (verifiedQuestions.length >= amount) break;
      }
    } catch (err) {
      console.error("AI Generation Error:", err.message);
    }
  }

  return verifiedQuestions.slice(0, amount);
}

module.exports = { generateValidatedQuestions };
