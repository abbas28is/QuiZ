const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

let currentSession = null;
let currentQuestionIdx = 0;
let userAnswers = {};
let selectedDisplayMode = 'IMMEDIATE';
let timerInterval = null;
let secondsElapsed = 0;

function toggleCustomCategory() {
  const select = document.getElementById('category-select');
  const customInput = document.getElementById('custom-category');
  if (select.value === 'آخر') {
    customInput.classList.remove('hidden');
  } else {
    customInput.classList.add('hidden');
  }
}

function updateDifficultyLabel(val) {
  document.getElementById('difficulty-val').innerText = val + '%';
  const desc = document.getElementById('difficulty-desc');
  const v = parseInt(val);

  if (v <= 30) desc.innerText = "أسئلة سهلة جداً ومعروفة للجميع";
  else if (v <= 80) desc.innerText = "أسئلة متوسطة تحتاج معرفة جيدة";
  else if (v <= 150) desc.innerText = "أسئلة صعبة للمحترفين المتخصصين";
  else if (v <= 300) desc.innerText = "أسئلة نادرة جداً وتفصيلية";
  else if (v <= 600) desc.innerText = "أسئلة تحتاج بحث ومعرفة أكاديمية عميقة";
  else desc.innerText = "أسئلة شبه مستحيلة لا يعرفها إلا كبار الخبراء!";
}

function setMode(mode) {
  selectedDisplayMode = mode;
  const btnImm = document.getElementById('mode-immediate');
  const btnAtEnd = document.getElementById('mode-atend');

  if (mode === 'IMMEDIATE') {
    btnImm.className = "p-3 text-xs rounded-lg border border-blue-500 bg-blue-500/10 font-bold";
    btnAtEnd.className = "p-3 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-400";
  } else {
    btnAtEnd.className = "p-3 text-xs rounded-lg border border-blue-500 bg-blue-500/10 font-bold";
    btnImm.className = "p-3 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-400";
  }
}

async function startQuiz() {
  const category = document.getElementById('category-select').value;
  const customCategory = document.getElementById('custom-category').value;
  const amount = document.getElementById('amount-input').value;
  const difficultyPct = document.getElementById('difficulty-slider').value;

  showScreen('screen-loading');

  try {
    const response = await fetch('/api/quiz/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        customCategory,
        amount,
        difficultyPct,
        displayMode: selectedDisplayMode,
        telegramId: tg?.initDataUnsafe?.user?.id || 'anonymous'
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    currentSession = data;
    currentQuestionIdx = 0;
    userAnswers = {};
    secondsElapsed = 0;

    startTimer();
    renderQuestion();
    showScreen('screen-play');
  } catch (err) {
    alert(err.message || "حدث خطأ أثناء تحميل التحدي");
    showScreen('screen-config');
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById('quiz-timer').innerText = `⏱️ ${mins}:${secs}`;
  }, 1000);
}

function renderQuestion() {
  const q = currentSession.questions[currentQuestionIdx];
  document.getElementById('quiz-progress').innerText = `السؤال ${currentQuestionIdx + 1} / ${currentSession.questionsCount}`;
  document.getElementById('question-text').innerText = q.question;
  document.getElementById('next-btn').classList.add('hidden');

  const container = document.getElementById('options-container');
  container.innerHTML = '';

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = "w-full text-right p-3 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs transition";
    btn.innerText = opt;
    btn.onclick = () => selectAnswer(opt);
    container.appendChild(btn);
  });
}

function selectAnswer(option) {
  userAnswers[currentQuestionIdx] = option;

  const container = document.getElementById('options-container');
  Array.from(container.children).forEach(child => child.disabled = true);

  if (currentSession.displayMode === 'IMMEDIATE') {
    document.getElementById('next-btn').classList.remove('hidden');
  } else {
    nextQuestion();
  }
}

function nextQuestion() {
  currentQuestionIdx++;
  if (currentQuestionIdx < currentSession.questionsCount) {
    renderQuestion();
  } else {
    submitQuiz();
  }
}

async function submitQuiz() {
  clearInterval(timerInterval);
  showScreen('screen-loading');

  try {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSession.sessionId,
        userAnswers
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    renderResults(data);
    showScreen('screen-results');
  } catch (err) {
    alert("خطأ أثناء إرسال النتائج");
  }
}

function renderResults(data) {
  document.getElementById('final-score').innerText = `${data.percentage}%`;
  document.getElementById('final-rating').innerText = `التقييم: ${data.rating} (${data.score}/${data.totalQuestions})`;

  const container = document.getElementById('results-details');
  container.innerHTML = '';

  data.detailedResults.forEach((res, i) => {
    const card = document.createElement('div');
    card.className = `p-3 rounded-lg border text-xs space-y-1 ${res.isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`;
    
    card.innerHTML = `
      <div class="font-bold">${i + 1}. ${res.question}</div>
      <div class="${res.isCorrect ? 'text-green-400' : 'text-red-400'}">إجابتك: ${res.userAnswer}</div>
      ${!res.isCorrect ? `<div class="text-green-400">الإجابة الصحيحة: ${res.correctAnswer}</div>` : ''}
      ${res.explanation ? `<div class="text-slate-400 mt-1">💡 ${res.explanation}</div>` : ''}
      <div class="text-[10px] text-slate-500">📌 المصدر: ${res.source}</div>
    `;
    container.appendChild(card);
  });
}

function showScreen(screenId) {
  ['screen-config', 'screen-loading', 'screen-play', 'screen-results'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(screenId).classList.remove('hidden');
}
