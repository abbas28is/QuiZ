const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'quiz_bot.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS verified_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    difficulty_pct INTEGER NOT NULL,
    question TEXT UNIQUE NOT NULL,
    options TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    source_url TEXT,
    verification_status TEXT CHECK(verification_status IN ('verified', 'rejected')) DEFAULT 'verified',
    confidence_score REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quiz_sessions (
    session_id TEXT PRIMARY KEY,
    telegram_id TEXT,
    category TEXT,
    difficulty_pct INTEGER,
    display_mode TEXT,
    questions TEXT,
    current_index INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    user_answers TEXT,
    status TEXT DEFAULT 'ACTIVE',
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME
  );
`);

module.exports = {
  saveVerifiedQuestion: (q) => {
    try {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO verified_questions 
        (category, difficulty_pct, question, options, correct_answer, explanation, source_url, verification_status, confidence_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        q.category,
        q.difficulty_pct,
        q.question,
        JSON.stringify(q.options),
        q.correct_answer,
        q.explanation || '',
        q.source_url || 'Verified via AI Knowledge Base',
        'verified',
        q.confidence_score || 0.95
      );
    } catch (err) {
      console.error('Error saving question:', err.message);
    }
  },

  getVerifiedQuestions: (category, difficulty, limit) => {
    const stmt = db.prepare(`
      SELECT * FROM verified_questions 
      WHERE category = ? AND difficulty_pct = ? AND verification_status = 'verified'
      ORDER BY RANDOM() LIMIT ?
    `);
    const rows = stmt.all(category, difficulty, limit);
    return rows.map(r => ({
      ...r,
      options: JSON.parse(r.options)
    }));
  },

  saveSession: (session) => {
    const stmt = db.prepare(`
      INSERT INTO quiz_sessions (session_id, telegram_id, category, difficulty_pct, display_mode, questions)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      session.id,
      session.telegramId,
      session.category,
      session.difficultyPct,
      session.displayMode,
      JSON.stringify(session.questions)
    );
  },

  getSession: (id) => {
    const stmt = db.prepare(`SELECT * FROM quiz_sessions WHERE session_id = ?`);
    const row = stmt.get(id);
    if (!row) return null;
    return {
      ...row,
      questions: JSON.parse(row.questions),
      user_answers: row.user_answers ? JSON.parse(row.user_answers) : {}
    };
  },

  updateSessionResult: (id, score, userAnswers, status = 'COMPLETED') => {
    const stmt = db.prepare(`
      UPDATE quiz_sessions 
      SET score = ?, user_answers = ?, status = ?, end_time = CURRENT_TIMESTAMP 
      WHERE session_id = ?
    `);
    stmt.run(score, JSON.stringify(userAnswers), status, id);
  }
};
