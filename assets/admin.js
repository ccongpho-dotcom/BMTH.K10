(function () {
  "use strict";

  const config = window.BMTH_CONFIG || {};
  const topics = Array.isArray(window.BMTH_TOPICS) ? window.BMTH_TOPICS : [];
  const apiBase = String(config.quizApiUrl || "").replace(/\/+$/, "");
  const tokenKey = "bmth_quiz_admin_token";
  const alertBox = document.getElementById("admin-alert");
  const loginSection = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");
  const loginForm = document.getElementById("login-form");
  const statsBox = document.getElementById("admin-stats");
  const tableBody = document.getElementById("question-table-body");
  const emptyBox = document.getElementById("question-empty");
  const totalBox = document.getElementById("question-total");
  const topicFilter = document.getElementById("admin-topic-filter");
  const importTopic = document.getElementById("import-topic");
  const searchInput = document.getElementById("admin-search");
  const dialog = document.getElementById("question-dialog");
  const questionForm = document.getElementById("question-form");
  const questionFormAlert = document.getElementById("question-form-alert");
  const topicInput = document.getElementById("question-topic");
  let adminToken = sessionStorage.getItem(tokenKey) || "";
  let questions = [];
  let searchTimer = 0;

  function endpoint(path) {
    return `${apiBase}${path}`;
  }

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `quiz-alert${type ? ` ${type}` : ""}`;
    alertBox.hidden = !message;
    if (message) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setButtonBusy(button, busy, text) {
    if (!button) return;
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? text : button.dataset.label;
  }

  async function apiRequest(path, options = {}) {
    if (!apiBase) throw new Error("Chưa khai báo quizApiUrl trong config.js.");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
    const response = await fetch(endpoint(path), { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "/api/admin/login") {
      adminToken = "";
      sessionStorage.removeItem(tokenKey);
      showLogin();
      throw new Error("Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.");
    }
    if (!response.ok) throw new Error(data.error || "Không thể kết nối máy chủ quản trị.");
    return data;
  }

  function topicName(topicId) {
    const topic = topics.find((item) => item.id === topicId);
    return topic ? `${topic.number}. ${topic.shortTitle || topic.title}` : topicId;
  }

  function populateTopicInputs() {
    topics.forEach((topic) => {
      const label = `${topic.number}. ${topic.shortTitle || topic.title}`;
      const filterOption = document.createElement("option");
      filterOption.value = topic.id;
      filterOption.textContent = label;
      topicFilter.appendChild(filterOption);
      const importOption = document.createElement("option");
      importOption.value = topic.id;
      importOption.textContent = label;
      importTopic.appendChild(importOption);
      const formOption = document.createElement("option");
      formOption.value = topic.id;
      formOption.textContent = label;
      topicInput.appendChild(formOption);
    });
  }

  function showLogin() {
    loginSection.hidden = false;
    dashboard.hidden = true;
  }

  function showDashboard() {
    loginSection.hidden = true;
    dashboard.hidden = false;
  }

  async function login(event) {
    event.preventDefault();
    const button = loginForm.querySelector("button[type='submit']");
    setButtonBusy(button, true, "Đang xác thực…");
    showAlert("", "");
    try {
      const data = await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          username: document.getElementById("admin-username").value.trim(),
          password: document.getElementById("admin-password").value
        })
      });
      adminToken = data.token;
      sessionStorage.setItem(tokenKey, adminToken);
      loginForm.reset();
      showDashboard();
      await refreshDashboard();
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setButtonBusy(button, false, "");
    }
  }

  function logout() {
    adminToken = "";
    sessionStorage.removeItem(tokenKey);
    questions = [];
    tableBody.innerHTML = "";
    showAlert("Đã đăng xuất khỏi trang quản trị.", "");
    showLogin();
  }

  function createStat(label, value, detail) {
    const card = document.createElement("article");
    card.className = "stat-card";
    const strong = document.createElement("strong");
    const title = document.createElement("span");
    const small = document.createElement("small");
    strong.textContent = String(value);
    title.textContent = label;
    small.textContent = detail;
    card.append(strong, title, small);
    return card;
  }

  async function loadStats() {
    const data = await apiRequest("/api/admin/stats", { method: "GET" });
    statsBox.innerHTML = "";
    statsBox.append(
      createStat("Tổng câu hỏi", data.total || 0, "Trong toàn bộ ngân hàng"),
      createStat("Đang sử dụng", data.active || 0, "Có thể xuất hiện trong bài kiểm tra"),
      createStat("Tạm ẩn", data.inactive || 0, "Không đưa vào đề"),
      createStat("Chủ đề có câu hỏi", data.topicsWithQuestions || 0, `Trên ${topics.length} chủ đề`)
    );
  }

  function makeCell(text, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function makeAction(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function renderQuestions() {
    tableBody.innerHTML = "";
    totalBox.textContent = `${questions.length} câu`;
    emptyBox.hidden = questions.length > 0;
    questions.forEach((question, index) => {
      const row = document.createElement("tr");
      row.appendChild(makeCell(String(index + 1)));
      const topicCell = document.createElement("td");
      const topicChip = document.createElement("span");
      topicChip.className = "topic-chip";
      topicChip.textContent = topicName(question.topicId);
      topicCell.appendChild(topicChip);
      row.appendChild(topicCell);
      const questionCell = makeCell(question.questionText, "question-cell");
      if (question.explanation) {
        const note = document.createElement("small");
        note.textContent = `Giải thích: ${question.explanation}`;
        questionCell.appendChild(note);
      }
      row.appendChild(questionCell);
      row.appendChild(makeCell(question.correctOption, "answer-cell"));
      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `status-chip ${question.isActive ? "active" : "inactive"}`;
      badge.textContent = question.isActive ? "Đang dùng" : "Tạm ẩn";
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      const actions = document.createElement("td");
      actions.className = "table-actions";
      actions.append(
        makeAction("Sửa", "edit-button", () => openQuestionDialog(question)),
        makeAction("Xóa", "delete-button", () => deleteQuestion(question))
      );
      row.appendChild(actions);
      tableBody.appendChild(row);
    });
  }

  async function loadQuestions() {
    const params = new URLSearchParams({ topic: topicFilter.value || "all" });
    const query = searchInput.value.trim();
    if (query) params.set("q", query);
    const data = await apiRequest(`/api/admin/questions?${params}`, { method: "GET" });
    questions = Array.isArray(data.questions) ? data.questions : [];
    renderQuestions();
  }

  async function refreshDashboard() {
    try {
      await Promise.all([loadStats(), loadQuestions()]);
    } catch (error) {
      showAlert(error.message, "error");
    }
  }

  function openQuestionDialog(question) {
    questionFormAlert.hidden = true;
    questionFormAlert.textContent = "";
    document.getElementById("question-dialog-title").textContent = question ? "Sửa câu hỏi" : "Thêm câu hỏi";
    document.getElementById("question-id").value = question ? question.id : "";
    topicInput.value = question ? question.topicId : (topicFilter.value !== "all" ? topicFilter.value : topics[0]?.id || "");
    document.getElementById("question-difficulty").value = question?.difficulty || "co-ban";
    document.getElementById("question-text").value = question?.questionText || "";
    document.getElementById("option-a").value = question?.options?.A || "";
    document.getElementById("option-b").value = question?.options?.B || "";
    document.getElementById("option-c").value = question?.options?.C || "";
    document.getElementById("option-d").value = question?.options?.D || "";
    document.getElementById("correct-option").value = question?.correctOption || "A";
    document.getElementById("question-active").checked = question ? question.isActive : true;
    document.getElementById("question-explanation").value = question?.explanation || "";
    dialog.showModal();
  }

  function closeQuestionDialog() {
    dialog.close();
    questionForm.reset();
    questionFormAlert.hidden = true;
  }

  function questionPayload() {
    return {
      topicId: topicInput.value,
      difficulty: document.getElementById("question-difficulty").value,
      questionText: document.getElementById("question-text").value.trim(),
      options: {
        A: document.getElementById("option-a").value.trim(),
        B: document.getElementById("option-b").value.trim(),
        C: document.getElementById("option-c").value.trim(),
        D: document.getElementById("option-d").value.trim()
      },
      correctOption: document.getElementById("correct-option").value,
      explanation: document.getElementById("question-explanation").value.trim(),
      isActive: document.getElementById("question-active").checked
    };
  }

  async function saveQuestion(event) {
    event.preventDefault();
    const id = document.getElementById("question-id").value;
    const button = questionForm.querySelector("button[type='submit']");
    setButtonBusy(button, true, "Đang lưu…");
    try {
      await apiRequest(id ? `/api/admin/questions/${id}` : "/api/admin/questions", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(questionPayload())
      });
      closeQuestionDialog();
      showAlert(id ? "Đã cập nhật câu hỏi." : "Đã thêm câu hỏi mới.", "success");
      await refreshDashboard();
    } catch (error) {
      questionFormAlert.textContent = error.message;
      questionFormAlert.className = "quiz-alert form-alert error";
      questionFormAlert.hidden = false;
    } finally {
      setButtonBusy(button, false, "");
    }
  }

  async function deleteQuestion(question) {
    if (!window.confirm(`Xóa câu hỏi “${question.questionText}”? Thao tác này không thể hoàn tác.`)) return;
    try {
      await apiRequest(`/api/admin/questions/${question.id}`, { method: "DELETE" });
      showAlert("Đã xóa câu hỏi.", "success");
      await refreshDashboard();
    } catch (error) {
      showAlert(error.message, "error");
    }
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;
    const source = String(text || "").replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (character === '"') {
        if (quoted && source[index + 1] === '"') { value += '"'; index += 1; }
        else quoted = !quoted;
      } else if (character === "," && !quoted) {
        row.push(value); value = "";
      } else if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        row.push(value); value = "";
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
        row = [];
      } else value += character;
    }
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    if (quoted) throw new Error("File CSV có dấu ngoặc kép chưa đóng.");
    return rows;
  }

  function normalizeHeader(value) {
    return String(value || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  function csvValue(record, keys) {
    for (const key of keys) if (record[key] !== undefined) return String(record[key]).trim();
    return "";
  }

  function csvToQuestions(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("File CSV chưa có dữ liệu câu hỏi.");
    const headers = rows[0].map(normalizeHeader);
    const required = ["chu_de", "cau_hoi", "dap_an_a", "dap_an_b", "dap_an_c", "dap_an_d", "dap_an_dung"];
    if (!required.every((header) => headers.includes(header)) && !["topic_id", "question", "option_a", "option_b", "option_c", "option_d", "correct_option"].every((header) => headers.includes(header))) {
      throw new Error("Sai cấu trúc CSV. Hãy tải và sử dụng đúng form mẫu trên trang quản trị.");
    }
    return rows.slice(1).map((cells, index) => {
      const record = {};
      headers.forEach((header, column) => { record[header] = cells[column] || ""; });
      const status = csvValue(record, ["trang_thai", "is_active", "active"]).toLowerCase();
      const item = {
        topicId: csvValue(record, ["chu_de", "topic_id", "topic"]),
        questionText: csvValue(record, ["cau_hoi", "question", "question_text"]),
        options: {
          A: csvValue(record, ["dap_an_a", "option_a"]),
          B: csvValue(record, ["dap_an_b", "option_b"]),
          C: csvValue(record, ["dap_an_c", "option_c"]),
          D: csvValue(record, ["dap_an_d", "option_d"])
        },
        correctOption: csvValue(record, ["dap_an_dung", "correct_option"]).toUpperCase(),
        explanation: csvValue(record, ["giai_thich", "explanation"]),
        difficulty: csvValue(record, ["muc_do", "difficulty"]) || "co-ban",
        isActive: !["0", "false", "tam_an", "tạm ẩn", "an"].includes(status)
      };
      if (!item.topicId || !item.questionText || Object.values(item.options).some((option) => !option) || !["A", "B", "C", "D"].includes(item.correctOption)) {
        throw new Error(`Dòng ${index + 2} thiếu dữ liệu hoặc đáp án đúng không thuộc A, B, C, D.`);
      }
      return item;
    });
  }

  function textToQuestions(text, topicId) {
    if (!topicId || !topics.some((topic) => topic.id === topicId)) {
      throw new Error("Hãy chọn chủ đề trước khi nạp file TXT.");
    }

    const lines = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
    const items = [];
    let current = null;
    let explanationMode = false;

    function finishCurrent() {
      if (!current) return;
      current.questionText = current.questionText.trim();
      current.explanation = current.explanation.trim();
      if (!current.questionText || Object.values(current.options).some((option) => !option.trim()) || !["A", "B", "C", "D"].includes(current.correctOption)) {
        throw new Error(`Câu ${items.length + 1} thiếu nội dung, chưa đủ 4 đáp án hoặc chưa có đáp án đúng.`);
      }
      Object.keys(current.options).forEach((key) => { current.options[key] = current.options[key].trim(); });
      items.push(current);
      current = null;
      explanationMode = false;
    }

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      const questionMatch = line.match(/^Câu(?:\s+hỏi)?\s+\d+\s*:\s*(.+)$/i);
      if (questionMatch) {
        finishCurrent();
        current = {
          topicId,
          questionText: questionMatch[1].trim(),
          options: { A: "", B: "", C: "", D: "" },
          correctOption: "",
          explanation: "",
          difficulty: "co-ban",
          isActive: true
        };
        return;
      }

      if (!current) return;
      const optionMatch = line.match(/^([A-D])\s*[.):\-]\s*(.+)$/i);
      if (optionMatch) {
        current.options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
        explanationMode = false;
        return;
      }

      const answerMatch = line.match(/^Đáp\s+án\s+đúng\s*:\s*([A-D])\s*$/i);
      if (answerMatch) {
        current.correctOption = answerMatch[1].toUpperCase();
        explanationMode = false;
        return;
      }

      const explanationMatch = line.match(/^Giải\s+thích\s*:\s*(.*)$/i);
      if (explanationMatch) {
        current.explanation = explanationMatch[1].trim();
        explanationMode = true;
        return;
      }

      if (explanationMode) current.explanation += `${current.explanation ? " " : ""}${line}`;
    });

    finishCurrent();
    if (!items.length) throw new Error("Không tìm thấy câu hỏi trong file TXT. Hãy dùng đúng mẫu 'Câu 1:', A–D và 'Đáp án đúng:'.");
    return items;
  }

  async function importQuestionFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const isTextForm = file.name.toLowerCase().endsWith(".txt");
      const items = isTextForm ? textToQuestions(text, importTopic.value) : csvToQuestions(text);
      if (items.length > 500) throw new Error("Mỗi lần chỉ được nạp tối đa 500 câu hỏi.");
      const data = await apiRequest("/api/admin/import", { method: "POST", body: JSON.stringify({ questions: items }) });
      showAlert(`Đã đọc ${items.length} câu từ ${file.name}; nạp mới ${data.inserted || 0} câu, bỏ qua ${data.skipped || 0} câu trùng hoặc không hợp lệ.`, "success");
      await refreshDashboard();
    } catch (error) {
      showAlert(error.message, "error");
    }
  }

  function initialize() {
    populateTopicInputs();
    loginForm.addEventListener("submit", login);
    document.getElementById("admin-logout").addEventListener("click", logout);
    document.getElementById("add-question").addEventListener("click", () => openQuestionDialog(null));
    document.getElementById("close-question-dialog").addEventListener("click", closeQuestionDialog);
    document.getElementById("cancel-question").addEventListener("click", closeQuestionDialog);
    document.getElementById("refresh-questions").addEventListener("click", refreshDashboard);
    document.getElementById("question-file").addEventListener("change", importQuestionFile);
    questionForm.addEventListener("submit", saveQuestion);
    topicFilter.addEventListener("change", () => loadQuestions().catch((error) => showAlert(error.message, "error")));
    searchInput.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => loadQuestions().catch((error) => showAlert(error.message, "error")), 300);
    });
    if (!apiBase) {
      showAlert("Trang quản trị đã sẵn sàng nhưng chưa có URL Worker trắc nghiệm. Hãy triển khai Worker rồi điền quizApiUrl trong config.js.", "error");
      showLogin();
    } else if (adminToken) {
      showDashboard();
      refreshDashboard();
    } else showLogin();
  }

  initialize();
})();
