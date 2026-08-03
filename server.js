const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { generateValidatedQuestions } = require('./services/aiService');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// مسار الحصول على الأسئلة مباشرة من AI بدون الاعتماد على كاش قديم
app.post('/api/questions/generate', async (req, res) => {
  try {
    const { category, difficulty_pct, amount } = req.body;
    
    const cat = category || "معلومات عامة";
    const diff = parseInt(difficulty_pct) || 50;
    const count = parseInt(amount) || 5;

    // استدعاء الموديل مباشرة لتوليد أسئلة جديدة حية
    const questions = await generateValidatedQuestions(cat, diff, count);
    
    return res.json({ success: true, questions });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

