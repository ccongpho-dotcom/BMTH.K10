(function () {
  "use strict";

  const config = window.BMTH_CONFIG || {};
  const topics = Array.isArray(window.BMTH_TOPICS) ? window.BMTH_TOPICS : [];
  const apiBase = String(config.quizApiUrl || "").replace(/\/+$/, "");
  const setupSection = document.getElementById("quiz-setup");
  const sessionSection = document.getElementById("quiz-session");
  const resultSection = document.getElementById("quiz-result");
  const setupForm = document.getElementById("quiz-setup-form");
  const topicSelect = document.getElementById("quiz-topic");
  const countSelect = document.getElementById("quiz-count");
  const startButton = document.getElementById("start-quiz");
  const alertBox = document.getElementById("quiz-alert");
  const availability = document.getElementById("question-availability");
  const scopeLabel = document.getElementById("session-scope");
  const progressText = document.getElementById("session-progress-text");
  const progressBar = document.getElementById("session-progress-bar");
  const questionNumber = document.getElementById("question-number");
  const questionTitle = document.getElementById("question-title");
  const answerOptions = document.getElementById("answer-options");
  const questionDots = document.getElementById("question-dots");
  const previousButton = document.getElementById("previous-question");
  const nextButton = document.getElementById("next-question");
  const submitButton = document.getElementById("submit-quiz");
  const exitButton = document.getElementById("exit-quiz");
  const retryButton = document.getElementById("retry-quiz");
  const resultReview = document.getElementById("result-review");
  let sessionToken = "";
  let questions = [];
  let answers = {};
  let currentIndex = 0;
  let meta = null;

  function endpoint(path) {
    return `${apiBase}${path}`;
  }

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `quiz-alert${type ? ` ${type}` : ""}`;
    alertBox.hidden = !message;
  }

  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.label;
  }

  async function apiRequest(path, options) {
    if (!apiBase) throw new Error("Chức năng trắc nghiệm chưa được kết nối với Cloudflare Worker.");
    const response = await fetch(endpoint(path), {
      ...options,
      headers: { "Content-Type": "application/json", ...(options && options.headers ? options.headers : {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Không thể kết nối ngân hàng câu hỏi.");
    return data;
  }

  function populateTopics() {
    topics.forEach((topic) => {
      const option = document.createElement("option");
      option.value = topic.id;
      option.textContent = `Chủ đề ${topic.number}: ${topic.shortTitle || topic.title}`;
      topicSelect.appendChild(option);
    });
    const requestedTopic = new URLSearchParams(window.location.search).get("topic");
    if (topics.some((topic) => topic.id === requestedTopic)) topicSelect.value = requestedTopic;
  }

  function topicName(topicId) {
    if (topicId === "all") return "Toàn bộ học phần";
    const topic = topics.find((item) => item.id === topicId);
    return topic ? `Chủ đề ${topic.number}: ${topic.shortTitle || topic.title}` : "Chủ đề đã chọn";
  }

  function updateAvailability() {
    if (!meta) return;
    const selected = topicSelect.value;
    const count = selected === "all"
      ? Number(meta.totalActive || 0)
      : Number((meta.topics || []).find((item) => item.id === selected)?.count || 0);
    availability.textContent = count > 0
      ? ""
      : "Phạm vi này chưa có câu hỏi. Giảng viên cần nạp câu hỏi trong trang quản trị.";
    availability.hidden = count > 0;
    startButton.disabled = count < 1;
  }

  async function loadMeta() {
    if (!apiBase) {
      showAlert("Module trắc nghiệm đã được cài vào giao diện nhưng chưa có URL Worker. Hãy triển khai Worker trắc nghiệm rồi điền quizApiUrl trong config.js.", "error");
      startButton.disabled = true;
      availability.textContent = "Chưa kết nối ngân hàng câu hỏi.";
      return;
    }
    try {
      meta = await apiRequest("/api/quiz/meta", { method: "GET" });
      showAlert("", "");
      updateAvailability();
    } catch (error) {
      showAlert(error.message, "error");
      startButton.disabled = true;
    }
  }

  function renderQuestion() {
    const question = questions[currentIndex];
    if (!question) return;
    const total = questions.length;
    scopeLabel.textContent = topicName(question.scopeTopicId || topicSelect.value);
    progressText.textContent = `Câu ${currentIndex + 1}/${total}`;
    progressBar.style.width = `${((currentIndex + 1) / total) * 100}%`;
    questionNumber.textContent = `CÂU ${String(currentIndex + 1).padStart(2, "0")}`;
    questionTitle.textContent = question.text;
    answerOptions.innerHTML = "";
    const displayLetters = ["A", "B", "C", "D"];
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `answer-option${answers[question.id] === option.key ? " selected" : ""}`;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(answers[question.id] === option.key));
      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.textContent = displayLetters[index];
      const text = document.createElement("span");
      text.textContent = option.text;
      button.append(letter, text);
      button.addEventListener("click", () => {
        answers[question.id] = option.key;
        renderQuestion();
      });
      answerOptions.appendChild(button);
    });
    previousButton.disabled = currentIndex === 0;
    const isLast = currentIndex === total - 1;
    nextButton.hidden = isLast;
    submitButton.hidden = !isLast;
    renderDots();
  }

  function renderDots() {
    questionDots.innerHTML = "";
    questions.forEach((question, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `question-dot${answers[question.id] ? " answered" : ""}${index === currentIndex ? " current" : ""}`;
      button.textContent = String(index + 1);
      button.setAttribute("aria-label", `Đến câu ${index + 1}${answers[question.id] ? ", đã trả lời" : ", chưa trả lời"}`);
      button.addEventListener("click", () => { currentIndex = index; renderQuestion(); });
      questionDots.appendChild(button);
    });
  }

  async function startQuiz(event) {
    event.preventDefault();
    setBusy(startButton, true, "Đang tạo bộ câu hỏi…");
    showAlert("", "");
    try {
      const data = await apiRequest("/api/quiz/start", {
        method: "POST",
        body: JSON.stringify({ topicId: topicSelect.value, count: Number(countSelect.value) })
      });
      sessionToken = data.sessionToken;
      questions = Array.isArray(data.questions) ? data.questions : [];
      answers = {};
      currentIndex = 0;
      if (!questions.length) throw new Error("Chưa có câu hỏi phù hợp trong ngân hàng.");
      setupSection.hidden = true;
      resultSection.hidden = true;
      sessionSection.hidden = false;
      renderQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (data.requestedCount > questions.length) {
        showAlert(`Ngân hàng hiện chỉ có ${questions.length} câu phù hợp nên hệ thống đã tạo bài với số câu hiện có.`, "");
      }
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setBusy(startButton, false, "");
    }
  }

  function leaveSession() {
    sessionToken = "";
    questions = [];
    answers = {};
    sessionSection.hidden = true;
    resultSection.hidden = true;
    setupSection.hidden = false;
    showAlert("", "");
    updateAvailability();
  }

  async function submitQuiz() {
    const unanswered = questions.filter((question) => !answers[question.id]).length;
    if (unanswered > 0) {
      showAlert(`Đồng chí còn ${unanswered} câu chưa trả lời. Hãy hoàn thành trước khi nộp bài.`, "error");
      const firstUnanswered = questions.findIndex((question) => !answers[question.id]);
      if (firstUnanswered >= 0) { currentIndex = firstUnanswered; renderQuestion(); }
      return;
    }
    setBusy(submitButton, true, "Đang chấm điểm…");
    showAlert("", "");
    try {
      const data = await apiRequest("/api/quiz/submit", {
        method: "POST",
        body: JSON.stringify({ sessionToken, answers })
      });
      renderResult(data);
      sessionSection.hidden = true;
      resultSection.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setBusy(submitButton, false, "");
    }
  }

  function renderResult(data) {
    const score = data.score || { correct: 0, total: questions.length, percent: 0 };
    const percent = Math.round(Number(score.percent || 0));
    document.getElementById("result-percent").textContent = `${percent}%`;
    document.getElementById("score-ring").style.setProperty("--score", `${percent}%`);
    document.getElementById("result-correct").textContent = String(score.correct || 0);
    document.getElementById("result-incorrect").textContent = String((score.total || 0) - (score.correct || 0));
    document.getElementById("result-message").textContent = percent >= 80
      ? "Kết quả tốt. Đồng chí đã nắm khá chắc nội dung học phần."
      : percent >= 50
        ? "Đồng chí đã nắm được nội dung cơ bản; nên xem lại những câu trả lời chưa đúng."
        : "Đồng chí nên ôn lại bài giảng và thực hiện một lượt kiểm tra khác.";
    resultReview.innerHTML = "";
    (data.results || []).forEach((item, index) => {
      const card = document.createElement("section");
      card.className = `review-item${item.isCorrect ? " correct" : ""}`;
      const title = document.createElement("h3");
      title.textContent = `Câu ${index + 1}: ${item.questionText}`;
      const selected = document.createElement("p");
      selected.className = item.isCorrect ? "answer-good" : "answer-bad";
      selected.textContent = `Đã chọn: ${item.selectedText || "Không trả lời"}`;
      const correct = document.createElement("p");
      correct.className = "answer-good";
      correct.textContent = `Đáp án đúng: ${item.correctText}`;
      card.append(title, selected, correct);
      if (item.explanation) {
        const explanation = document.createElement("p");
        explanation.className = "review-explanation";
        explanation.textContent = `Giải thích: ${item.explanation}`;
        card.appendChild(explanation);
      }
      resultReview.appendChild(card);
    });
  }

  populateTopics();
  setupForm.addEventListener("submit", startQuiz);
  topicSelect.addEventListener("change", updateAvailability);
  previousButton.addEventListener("click", () => { if (currentIndex > 0) { currentIndex -= 1; renderQuestion(); } });
  nextButton.addEventListener("click", () => { if (currentIndex < questions.length - 1) { currentIndex += 1; renderQuestion(); } });
  submitButton.addEventListener("click", submitQuiz);
  exitButton.addEventListener("click", leaveSession);
  retryButton.addEventListener("click", leaveSession);
  loadMeta();
})();
