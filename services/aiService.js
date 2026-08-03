async function generateValidatedQuestions(category, difficultyPct, amount = 5) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY Missing!");
    return [];
  }

  // ضبط وصف مستوى الصعوبة الدقيق
  let difficultyContext = "أسئلة بسيطة ومباشرة جداً للمبتدئين.";
  if (difficultyPct > 30 && difficultyPct <= 80) {
    difficultyContext = "أسئلة متوسطة الصعوبة تحتاج معرفة جيدة.";
  } else if (difficultyPct > 80 && difficultyPct <= 200) {
    difficultyContext = "أسئلة صعبة جداً وعميقة للمتخصصين فقط.";
  } else if (difficultyPct > 200) {
    difficultyContext = "أسئلة معقدة ونادرة للغاية، تعجيزية ولا يعرفها إلا قلة من الخبراء.";
  }

  const randomSeed = Math.floor(Math.random() * 9999999);

  const promptText = `
أنت خبير كويزات ومحتوى تعليمي.
قم بإنشاء ${amount} أسئلة حقيقية وفريدة في مجال: "${category}".
نسبة الصعوبة المطلوبة: ${difficultyPct}% (${difficultyContext}).
رمز التنوع العشوائي: ${randomSeed}

شروط صارمة جداً:
1. يمنع وضع أي خيارات متعددة (No Options/Choices).
2. قم بإرجاع السؤال، والإجابة الصحيحة المباشرة، والشرح فقط.
3. التزم بمستوى الصعوبة المحدد (${difficultyPct}%).

أرجِع الناتج بصيغة JSON Array فقط وحصرياً كالتالي:
[
  {
    "question": "نص السؤال الدقيق؟",
    "correct_answer": "الإجابة الصحيحة المباشرة",
    "explanation": "الشرح التوضيحي والمصدر"
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
          temperature: 1.0
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
          explanation: q.explanation || "",
          options: [] // تصفير الخيارات نهائياً
        }));
      }
    }
  } catch (err) {
    console.error("AI Generation Error:", err.message);
  }

  return [];
}

module.exports = { generateValidatedQuestions };
