const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../database');

const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
const ai = new GoogleGenerativeAI(apiKey);

async function generateValidatedQuestions(category, difficultyPct, amount = 5) {
  const verifiedQuestions = [];

  const prompt = `
أنت خبير كويزات متخصص. قم بإنشاء ${amount} أسئلة حقيقية ودقيقة جداً في مجال "${category}" بمستوى صعوبة ${difficultyPct}%.
يجب أن تكون الأسئلة احترافية وتتضمن خيارات حقيقية وليست وهمية.

شروط الرد:
أرجع النتيجة بصيغة JSON Array حصرية فقط، بنفس هذا الهيكل تماماً ودون أي مقدمات أو علامات إضافية:
[
  {
    "question": "السؤال هنا؟",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correct_answer": "خيار 1",
    "explanation": "الشرح التوضيحي للحل",
    "source_url": "اسم المصدر أو الكتاب",
    "confidence_score": 0.95
  }
]
`;

  try {
    const model = ai.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = await model.generateContent(prompt);
    const text = response.response.text();

    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedQuestions = JSON.parse(cleanText);

    if (Array.isArray(parsedQuestions)) {
      for (const q of parsedQuestions) {
        q.category = category;
        q.difficulty_pct = difficultyPct;
        if (q.question && Array.isArray(q.options) && q.options.length === 4 && q.correct_answer) {
          try { db.saveVerifiedQuestion(q); } catch (e) {}
          verifiedQuestions.push(q);
        }
      }
    }
  } catch (err) {
    console.error("AI Generation Critical Error:", err);
  }

  return verifiedQuestions;
}

module.exports = { generateValidatedQuestions };
