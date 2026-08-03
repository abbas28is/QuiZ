require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bot = require('./bot');
const db = require('./database');
const { generateValidatedQuestions } = require('./services/aiService');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/quiz/create', async (req, res) => {
  try {
    const { category, customCategory, amount, difficultyPct, displayMode, telegramId } = req.body;
    const selectedCategory = category === 'آخر' ? customCategory : category;
    const questionsCount = parseInt(amount) || 5;
    const difficulty = parseInt(difficultyPct) || 100;

    if (!selectedCategory) {
      return res.status(400).json({ error: 'الرجاء تحديد موضوع التحدي' });
    }

    const questions = await generateValidatedQuestions(selectedCategory, difficulty, questionsCount);

    if (questions.length === 0) {
      return res.status(500).json({ error: 'تعذر الحصول على أسئلة موثقة حالياً، حاول لاحقاً.' });
    }

    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const sessionData = {
      id: sessionId,
      telegramId: telegramId || 'guest',
      category: selectedCategory,
      difficultyPct: difficulty,
      displayMode: displayMode || 'IMMEDIATE',
      questions
    };

    db.saveSession(sessionData);

    res.json({
      success: true,
      sessionId,
      category: selectedCategory,
      displayMode: sessionData.displayMode,
      questionsCount: questions.length,
      questions: questions.map((q, idx) => ({
        id: idx,
        question: q.question,
        options: q.options,
        difficulty_pct: q.difficulty_pct
      }))
    });
  } catch (err) {
    console.error("Create Quiz Error:", err);
    res.status(500).json({ error: 'حدث خطأ في إنشاء التحدي' });
  }
});

app.post('/api/quiz/submit', (req, res) => {
  try {
    const { sessionId, userAnswers } = req.body;
    const session = db.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }

    let score = 0;
    const detailedResults = [];

    session.questions.forEach((q, idx) => {
      const userAns = userAnswers[idx];
      const isCorrect = userAns === q.correct_answer;
      if (isCorrect) score++;

      detailedResults.push({
        question: q.question,
        options: q.options,
        userAnswer: userAns || 'لم يتم الإجابة',
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation,
        source: q.source_url
      });
    });

    db.updateSessionResult(sessionId, score, userAnswers);

    const percentage = Math.round((score / session.questions.length) * 100);
    let rating = 'مبتدئ';
    if (percentage >= 90) rating = 'خبير متمرس 🔥';
    else if (percentage >= 70) rating = 'ممتاز جداً 👏';
    else if (percentage >= 50) rating = 'جيد 💡';

    res.json({
      success: true,
      score,
      totalQuestions: session.questions.length,
      percentage,
      rating,
      detailedResults
    });
  } catch (err) {
    console.error("Submit Quiz Error:", err);
    res.status(500).json({ error: 'خطأ أثناء حساب النتائج' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  bot.start({
    onStart: (info) => console.log(`Telegram Bot @${info.username} launched!`)
  });
});
