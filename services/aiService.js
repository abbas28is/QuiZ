async function generateValidatedQuestions(category, difficultyPct, amount = 5) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing!");
    return [];
  }

  // تحديد وصف الصعوبة بشكل صريح ومباشر للذكاء الاصطناعي
  let difficultyGuide = "أسئلة عامة وسهلة جداً ومباشرة يسهل إجابتها.";
  if (difficultyPct > 30 && difficultyPct <= 70) {
    difficultyGuide = "أسئلة متوسطة تحتاج معرفة جيدة وحضور ذهن.";
  } else if (difficultyPct > 70 && difficultyPct <= 150) {
    difficultyGuide = "أسئلة صعبة جداً ومتقدمة للمتخصصين في المجال.";
  } else if (difficultyPct > 150) {
    difficultyGuide = "أسئلة معقدة ودقيقة جداً ونادرة، مستواها شبه تعجيزي وللمحترفين فقط.";
  }

  // استخدام Random Seed لضمان عدم تكرار الأسئلة نهائياً
  const randomSeed = Math.floor(Math.random() * 1000000);

  const promptText = `
أنت خبير واضع اختبارات وتحديات دقيقة جداً.
المطلوب: إنشاء ${amount} أسئلة حقيقية ومتنوعة وجديدة تماماً.
- المجال: "${category}"
- نسبة الصعوبة المطلوبة: ${difficultyPct}% (${difficultyGuide})
- كود التنوع العشوائي: ${randomSeed}

شروط صارمة:
1. عدم تكرار أي سؤال سابق.
2. لا تضع أي خيارات متعددة (No Options).
3. أرجع فقط السؤال والإجابة الصحيحة والشرح.

أرجع الرد بصيغة JSON Array حصرية فقط وبدون أي كود تشفير أو كلام إضافي:
[
  {
    "question": "نص السؤال الدقيق وفق مستوى الصعوبة",
    "correct_answer": "الإجابة الصحيحة المباشرة",
    "explanation": "الشرح أو المصدر التوضيحي"
  }
]
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 1.0 // أقصى درجات التنوع للذكاء الاصطناعي
        }
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const rawText = data.candidates[0].content.parts[0].text;
      const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      if (Array.isArray(parsed)) {
        return parsed.map(q => ({
          category: category,
          difficulty_pct: difficultyPct,
          question: q.question,
          correct_answer: q.correct_answer,
          explanation: q.explanation || "معلومة موثوقة.",
          options: [] // إلغاء الخيارات تماماً
        }));
      }
    } else {
      console.error("Gemini Error Payload:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("Generation Error:", err.message);
  }

  return [];
}

module.exports = { generateValidatedQuestions };
