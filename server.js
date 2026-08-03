const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { generateValidatedQuestions } = require('./services/aiService');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// مسار التوليد المباشر للأسئلة بدون كاش وبدون خيارات
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { category, difficulty_pct, amount } = req.body;
    const cat = category || "عامة";
    const diff = parseInt(difficulty_pct) || 50;
    const count = parseInt(amount) || 5;

    const questions = await generateValidatedQuestions(cat, diff, count);
    return res.json({ success: true, questions });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ success: false, questions: [] });
  }
});

// دعم المسار الاحتياطي
app.post('/api/questions/generate', async (req, res) => {
  try {
    const { category, difficulty_pct, amount } = req.body;
    const cat = category || "عامة";
    const diff = parseInt(difficulty_pct) || 50;
    const count = parseInt(amount) || 5;

    const questions = await generateValidatedQuestions(cat, diff, count);
    return res.json({ success: true, questions });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ success: false, questions: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
