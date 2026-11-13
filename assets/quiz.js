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
  const practiceInput = document.getElementById("quiz-practice");
  const revealButton = document.getElementById("reveal-answer");
  const feedback = document.getElementById("instant-feedback");
  const toggleReview = document.getElementById("toggle-review");
  const resumeButton = document.getElementById("resume-quiz");
  const draftCard = document.getElementById("quiz-draft");
  const draftLabel = document.getElementById("quiz-draft-label");
  const draftKey = "bmth-k10:quiz-draft:v1";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let sessionToken = "";
  let questions = [];
  let answers = {};
  let currentIndex = 0;
  let scopeId = "all";
  let expiresAt = 0;
  let practice = false;
  let revealed = {};
  let sessionBusy = false;
  let memoryDraft = null;
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
    if (!response.ok) throw Object.assign(new Error(data.error || "Không thể kết nối ngân hàng câu hỏi."), { status: response.status });
    return data;
  }

  function tokenExpiry(token) {
    try {
      const payload = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
      const { type, exp } = JSON.parse(atob(payload));
      return type === "quiz" && Number.isFinite(exp) ? exp * 1000 : 0;
    } catch (_) { return 0; }
  }

  function clearDraft(token) {
    if (!token || memoryDraft?.sessionToken === token) memoryDraft = null;
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (!token || saved?.sessionToken === token) localStorage.removeItem(draftKey);
    } catch (_) { /* Storage can be unavailable. */ }
  }

  function getDraft() {
    let saved = memoryDraft;
    try {
      const fromDisk = JSON.parse(localStorage.getItem(draftKey) || "null");
      saved = fromDisk && (!memoryDraft || fromDisk.updatedAt >= memoryDraft.updatedAt) ? fromDisk : memoryDraft;
    }
    catch (_) { /* The in-memory draft still works for this tab. */ }
    if (!saved || saved.apiBase !== apiBase || typeof saved.sessionToken !== "string" ||
        !Array.isArray(saved.questions) || !saved.questions.length || saved.questions.length > 20 ||
        !saved.questions.every((q) => Number.isInteger(q?.id) && typeof q.text === "string" &&
          Array.isArray(q.options) && q.options.length === 4 && q.options.every((o) => /^[A-D]$/.test(o?.key) && typeof o?.text === "string"))) return null;
    if (tokenExpiry(saved.sessionToken) <= Date.now()) {
      clearDraft(saved.sessionToken);
      return null;
    }
    return saved;
  }

  function saveDraft() {
    if (!sessionToken || !questions.length || expiresAt <= Date.now()) return false;
    memoryDraft = { apiBase, sessionToken, questions, answers: { ...answers }, currentIndex, scopeId, practice, revealed: { ...revealed }, updatedAt: Date.now() };
    try {
      localStorage.setItem(draftKey, JSON.stringify(memoryDraft));
      return true;
    } catch (_) { return false; }
  }

  function updateDraftCard() {
    const saved = getDraft();
    draftCard.hidden = !saved;
    if (!saved) return;
    const answered = saved.questions.filter((q) => q.options.some((option) => option.key === saved.answers?.[q.id])).length;
    draftLabel.textContent = `${topicName(saved.scopeId)} · Đã trả lời ${answered}/${saved.questions.length} câu`;
  }

  function openSession() {
    setupSection.hidden = true;
    resultSection.hidden = true;
    sessionSection.hidden = false;
    renderQuestion();
    questionTitle.focus({ preventScroll: true });
    scrollTop();
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }

  function resumeQuiz() {
    if (startButton.dataset.busy === "true") return;
    const saved = getDraft();
    if (!saved) {
      updateDraftCard();
      showAlert("Bài đang dở đã hết hạn hoặc không còn trên trình duyệt.", "error");
      return;
    }
    sessionToken = saved.sessionToken;
    expiresAt = tokenExpiry(sessionToken);
    questions = saved.questions;
    scopeId = saved.scopeId;
    practice = saved.practice === true;
    currentIndex = Math.max(0, Math.min(questions.length - 1, Number.isInteger(saved.currentIndex) ? saved.currentIndex : 0));
    answers = {};
    revealed = {};
    for (const q of questions) {
      if (q.options.some((option) => option.key === saved.answers?.[q.id])) answers[q.id] = saved.answers[q.id];
      const entry = saved.revealed?.[q.id];
      if (practice && answers[q.id] && entry?.selectedOption === answers[q.id] &&
          q.options.some((option) => option.key === entry.correctOption) && typeof entry.correctText === "string") revealed[q.id] = entry;
    }
    topicSelect.value = scopeId;
    practiceInput.checked = practice;
    showAlert("", "");
    openSession();
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
    startButton.disabled = count < 1 || startButton.dataset.busy === "true";
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
    scopeLabel.textContent = topicName(scopeId);
    progressText.textContent = `Câu ${currentIndex + 1}/${total}`;
    progressBar.style.width = `${((currentIndex + 1) / total) * 100}%`;
    questionNumber.textContent = `CÂU ${String(currentIndex + 1).padStart(2, "0")}`;
    questionTitle.textContent = question.text;
    answerOptions.innerHTML = "";
    const displayLetters = ["A", "B", "C", "D"];
    const revealedAnswer = revealed[question.id];
    const selectedIndex = question.options.findIndex((option) => option.key === answers[question.id]);
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `answer-option${answers[question.id] === option.key ? " selected" : ""}`;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(answers[question.id] === option.key));
      button.tabIndex = (selectedIndex === -1 ? index === 0 : selectedIndex === index) ? 0 : -1;
      button.disabled = sessionBusy || Boolean(revealedAnswer);
      if (revealedAnswer?.correctOption === option.key) button.classList.add("option-correct");
      if (revealedAnswer && answers[question.id] === option.key && revealedAnswer.correctOption !== option.key) button.classList.add("option-incorrect");
      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.textContent = displayLetters[index];
      const text = document.createElement("span");
      text.textContent = option.text;
      button.append(letter, text);
      button.addEventListener("click", () => {
        if (sessionBusy || revealed[question.id]) return;
        answers[question.id] = option.key;
        saveDraft();
        renderQuestion();
        answerOptions.children[index]?.focus({ preventScroll: true });
      });
      answerOptions.appendChild(button);
    });
    previousButton.disabled = sessionBusy || currentIndex === 0;
    const isLast = currentIndex === total - 1;
    nextButton.hidden = isLast;
    nextButton.disabled = sessionBusy;
    submitButton.hidden = !isLast;
    submitButton.disabled = sessionBusy;
    exitButton.disabled = sessionBusy;
    revealButton.hidden = !practice || Boolean(revealedAnswer);
    revealButton.disabled = sessionBusy || !answers[question.id];
    revealButton.setAttribute("aria-expanded", String(Boolean(revealedAnswer)));
    feedback.hidden = !revealedAnswer;
    feedback.replaceChildren();
    if (revealedAnswer) {
      const correctIndex = question.options.findIndex((option) => option.key === revealedAnswer.correctOption);
      const title = document.createElement("strong");
      title.textContent = `${revealedAnswer.isCorrect ? "Đồng chí chọn đúng." : "Đồng chí chọn chưa đúng."} Đáp án: ${correctIndex >= 0 ? displayLetters[correctIndex] + ". " : ""}${revealedAnswer.correctText}`;
      feedback.appendChild(title);
      if (revealedAnswer.explanation) {
        const explanation = document.createElement("p");
        explanation.textContent = revealedAnswer.explanation;
        feedback.appendChild(explanation);
      }
    }
    renderDots();
  }

  function goToQuestion(index) {
    if (sessionBusy || !questions[index]) return;
    currentIndex = index;
    saveDraft();
    renderQuestion();
    questionTitle.focus();
  }

  function renderDots() {
    questionDots.innerHTML = "";
    questions.forEach((question, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `question-dot${answers[question.id] ? " answered" : ""}${index === currentIndex ? " current" : ""}`;
      button.textContent = String(index + 1);
      button.setAttribute("aria-label", `Đến câu ${index + 1}${answers[question.id] ? ", đã trả lời" : ", chưa trả lời"}`);
      if (index === currentIndex) button.setAttribute("aria-current", "step");
      button.disabled = sessionBusy;
      button.addEventListener("click", () => goToQuestion(index));
      questionDots.appendChild(button);
    });
  }

  async function startQuiz(event) {
    event.preventDefault();
    if (startButton.disabled || startButton.dataset.busy === "true") return;
    if (getDraft() && !window.confirm("Bắt đầu bài mới sẽ thay thế bài đang dở trên trình duyệt này. Đồng chí có muốn tiếp tục?")) return;
    const newScope = topicSelect.value;
    const newPractice = practiceInput.checked;
    startButton.dataset.busy = "true";
    resumeButton.disabled = true;
    setBusy(startButton, true, "Đang tạo bộ câu hỏi…");
    showAlert("", "");
    try {
      const data = await apiRequest("/api/quiz/start", {
        method: "POST",
        body: JSON.stringify({ topicId: newScope, count: Number(countSelect.value) })
      });
      if (!Array.isArray(data.questions) || !data.questions.length || typeof data.sessionToken !== "string") throw new Error("Chưa có câu hỏi phù hợp trong ngân hàng.");
      sessionToken = data.sessionToken;
      expiresAt = tokenExpiry(sessionToken);
      questions = data.questions;
      scopeId = newScope;
      practice = newPractice;
      answers = {};
      revealed = {};
      currentIndex = 0;
      const saved = saveDraft();
      openSession();
      if (!saved) showAlert("Bài đang làm chỉ được giữ trong tab này vì không lưu được vào trình duyệt.", "");
      else if (data.requestedCount > questions.length) showAlert(`Lượt này có ${questions.length} câu phù hợp.`, "");
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      delete startButton.dataset.busy;
      resumeButton.disabled = false;
      setBusy(startButton, false, "");
      updateAvailability();
    }
  }

  function leaveSession(save = false) {
    if (sessionBusy) return;
    const saved = !save || saveDraft();
    sessionToken = "";
    questions = [];
    answers = {};
    sessionSection.hidden = true;
    resultSection.hidden = true;
    setupSection.hidden = false;
    showAlert(saved ? "" : "Không lưu được bài vào bộ nhớ trình duyệt hoặc bài đã hết hạn.", saved ? "" : "error");
    updateDraftCard();
    updateAvailability();
    if (!draftCard.hidden) resumeButton.focus();
    else topicSelect.focus();
  }

  async function revealAnswer() {
    const question = questions[currentIndex];
    if (!practice || sessionBusy || !question || !answers[question.id] || revealed[question.id]) return;
    sessionBusy = true;
    renderQuestion();
    showAlert("", "");
    try {
      // The existing self-check endpoint can grade an incomplete selection.
      // Retain and show only the result for the current question, not the rest.
      const data = await apiRequest("/api/quiz/submit", {
        method: "POST",
        body: JSON.stringify({ sessionToken, answers: { [question.id]: answers[question.id] } })
      });
      const item = data.results?.find((result) => result.id === question.id);
      if (!item) throw new Error("Không lấy được đáp án cho câu này.");
      revealed[question.id] = item;
      saveDraft();
    } catch (error) {
      showAlert(error.status === 401 ? "Bài làm đã hết hạn. Đồng chí vui lòng bắt đầu bài mới." : error.message, "error");
    } finally {
      sessionBusy = false;
      renderQuestion();
      if (!feedback.hidden) { feedback.tabIndex = -1; feedback.focus(); }
      else if (!revealButton.hidden) revealButton.focus();
    }
  }

  async function submitQuiz() {
    if (sessionBusy) return;
    const unanswered = questions.filter((question) => !answers[question.id]).length;
    if (unanswered > 0) {
      showAlert(`Đồng chí còn ${unanswered} câu chưa trả lời. Hãy hoàn thành trước khi nộp bài.`, "error");
      const firstUnanswered = questions.findIndex((question) => !answers[question.id]);
      if (firstUnanswered >= 0) goToQuestion(firstUnanswered);
      return;
    }
    sessionBusy = true;
    renderQuestion();
    setBusy(submitButton, true, "Đang chấm điểm…");
    showAlert("", "");
    try {
      const data = await apiRequest("/api/quiz/submit", {
        method: "POST",
        body: JSON.stringify({ sessionToken, answers })
      });
      renderResult(data);
      clearDraft(sessionToken);
      sessionSection.hidden = true;
      resultSection.hidden = false;
      document.getElementById("result-title").focus({ preventScroll: true });
      scrollTop();
    } catch (error) {
      showAlert(error.status === 401 ? "Bài làm đã hết hạn. Đồng chí vui lòng bắt đầu bài mới." : error.message, "error");
    } finally {
      sessionBusy = false;
      setBusy(submitButton, false, "");
      if (!sessionSection.hidden) renderQuestion();
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
    resultReview.hidden = true;
    toggleReview.setAttribute("aria-expanded", "false");
    toggleReview.textContent = "Xem đáp án và giải thích";
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
  updateDraftCard();
  setupForm.addEventListener("submit", startQuiz);
  topicSelect.addEventListener("change", updateAvailability);
  previousButton.addEventListener("click", () => goToQuestion(currentIndex - 1));
  nextButton.addEventListener("click", () => goToQuestion(currentIndex + 1));
  submitButton.addEventListener("click", submitQuiz);
  exitButton.addEventListener("click", () => leaveSession(true));
  retryButton.addEventListener("click", () => leaveSession());
  resumeButton.addEventListener("click", resumeQuiz);
  revealButton.addEventListener("click", revealAnswer);
  toggleReview.addEventListener("click", () => {
    resultReview.hidden = !resultReview.hidden;
    toggleReview.setAttribute("aria-expanded", String(!resultReview.hidden));
    toggleReview.textContent = resultReview.hidden ? "Xem đáp án và giải thích" : "Ẩn đáp án và giải thích";
  });
  answerOptions.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const choices = [...answerOptions.children];
    const index = choices.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const offset = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1;
    choices[(index + offset + choices.length) % choices.length].click();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === draftKey && !setupSection.hidden) {
      memoryDraft = null;
      updateDraftCard();
    }
  });
  loadMeta();
})();
