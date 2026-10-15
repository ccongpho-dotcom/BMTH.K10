(function () {
  "use strict";

  const topics = Array.isArray(window.BMTH_TOPICS) ? window.BMTH_TOPICS : [];
  const config = window.BMTH_CONFIG || {};
  const nav = document.getElementById("topic-nav");
  const panel = document.getElementById("lesson-panel");
  const chatLauncher = document.getElementById("chat-launcher");
  const chatPanel = document.getElementById("chat-panel");
  const chatClose = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const toast = document.getElementById("toast");
  const menuButton = document.querySelector(".menu-button");
  let activeTopicId = topics[0] ? topics[0].id : null;
  let history = [];
  let busy = false;

  const escapeHtml = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 3300);
  }

  function renderNavigation() {
    nav.innerHTML = topics.map((topic) => `
      <button class="topic-button${topic.id === activeTopicId ? " active" : ""}" type="button" data-topic-id="${escapeHtml(topic.id)}" aria-current="${topic.id === activeTopicId ? "page" : "false"}">
        <span class="topic-number">${escapeHtml(topic.number)}</span>
        <span class="topic-name">${escapeHtml(topic.shortTitle || topic.title)}</span>
        <span class="topic-arrow" aria-hidden="true">›</span>
      </button>
    `).join("");
  }

  function renderLesson(topic) {
    if (!topic) {
      panel.innerHTML = "<p>Chưa có nội dung bài giảng.</p>";
      return;
    }

    const documentMarkup = topic.document
      ? `<div class="document-viewer">
          <iframe src="${escapeHtml(topic.document)}#toolbar=0&navpanes=0&scrollbar=1" title="Tài liệu ${escapeHtml(topic.title)}" loading="lazy"></iframe>
          <div class="document-watermark">BMTH.K10</div>
        </div>`
      : `<div class="document-empty">
          <span aria-hidden="true">▤</span>
          <p>Nội dung đầy đủ đã được nạp vào kho tri thức của chatbot. Bản PDF không được công khai trên GitHub nhằm hạn chế sao chép tài liệu.</p>
        </div>`;

    panel.innerHTML = `
      <div class="lesson-kicker">CHỦ ĐỀ ${escapeHtml(topic.number)}</div>
      <h2 class="lesson-title">${escapeHtml(topic.title)}</h2>
      <p class="lesson-description">${escapeHtml(topic.description)}</p>
      <div class="lesson-meta">
        <span class="meta-chip">Thời lượng: ${escapeHtml(topic.duration)}</span>
        <span class="meta-chip">Chế độ: Chỉ đọc</span>
        <span class="meta-chip">Trợ lý AI hỗ trợ 24/7</span>
      </div>
      <section class="objectives">
        <h3>Mục tiêu học tập</h3>
        <ul>${topic.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <div class="content-grid">
        ${topic.sections.map((section) => `<section class="content-section"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.content)}</p></section>`).join("")}
      </div>
      <section class="key-points">
        <h3>Trọng tâm cần ghi nhớ</h3>
        <div class="key-list">${topic.keyPoints.map((item, index) => `<div class="key-item"><span>${index + 1}</span>${escapeHtml(item)}</div>`).join("")}</div>
      </section>
      <section class="document-box">
        <h3>Tài liệu bài giảng</h3>
        ${documentMarkup}
      </section>
    `;
    window.location.hash = topic.id;
  }

  function chooseTopic(id, scrollIntoView) {
    const topic = topics.find((item) => item.id === id) || topics[0];
    if (!topic) return;
    activeTopicId = topic.id;
    renderNavigation();
    renderLesson(topic);
    if (scrollIntoView) document.getElementById("chu-de").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic-id]");
    if (button) chooseTopic(button.dataset.topicId, window.innerWidth < 980);
  });

  function toggleChat(force) {
    const shouldOpen = typeof force === "boolean" ? force : !chatPanel.classList.contains("open");
    chatPanel.classList.toggle("open", shouldOpen);
    chatPanel.setAttribute("aria-hidden", String(!shouldOpen));
    chatLauncher.setAttribute("aria-expanded", String(shouldOpen));
    if (shouldOpen) window.setTimeout(() => chatInput.focus(), 220);
  }

  function addMessage(text, role, extraClass) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}${extraClass ? ` ${extraClass}` : ""}`;
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;
    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return wrapper;
  }

  function topicSummary(topic) {
    if (!topic) return "";
    const sections = topic.sections.map((section) => `${section.title}: ${section.content}`).join("\n");
    return `CHƯƠNG ${topic.chapter}: ${topic.title}\nMô tả: ${topic.description}\nMục tiêu: ${topic.objectives.join("; ")}\n${sections}\nTrọng tâm: ${topic.keyPoints.join("; ")}`;
  }

  function courseContext(activeTopic) {
    const overview = activeTopic ? topicSummary(activeTopic) : topics.map(topicSummary).join("\n\n---\n\n");
    return `TÓM LƯỢC CHƯƠNG NGƯỜI HỌC ĐANG MỞ\n${overview}`;
  }

  async function askAssistant(message) {
    if (busy) return;
    if (!config.chatApiUrl) {
      addMessage("Chatbot chưa được kết nối. Giảng viên cần điền URL Cloudflare Worker trong tệp config.js sau khi thiết lập API Google AI Studio.", "assistant");
      showToast("Chưa cấu hình địa chỉ chatbot");
      return;
    }

    busy = true;
    const submitButton = chatForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    addMessage(message, "user");
    const typing = addMessage("", "assistant", "typing");

    try {
      const activeTopic = topics.find((item) => item.id === activeTopicId);
      const response = await fetch(config.chatApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          activeTopic: activeTopic ? activeTopic.title : "",
          context: courseContext(activeTopic),
          history: history.slice(-8)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể kết nối với trợ lý AI.");
      typing.remove();
      const answer = data.answer || "Tôi chưa thể tạo câu trả lời lúc này.";
      addMessage(answer, "assistant");
      history.push({ role: "user", text: message }, { role: "model", text: answer });
    } catch (error) {
      typing.remove();
      addMessage(`Xin lỗi, hệ thống đang gặp lỗi: ${error.message}`, "assistant");
    } finally {
      busy = false;
      submitButton.disabled = false;
      chatInput.focus();
    }
  }

  chatLauncher.addEventListener("click", () => toggleChat());
  chatClose.addEventListener("click", () => toggleChat(false));
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    chatInput.value = "";
    chatInput.style.height = "auto";
    askAssistant(message);
  });
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 100)}px`;
  });
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });
  document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => askAssistant(button.dataset.prompt)));

  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".protected-content")) {
      event.preventDefault();
      showToast("Nội dung bài giảng được cung cấp ở chế độ chỉ đọc.");
    }
  });
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const selectionNode = window.getSelection()?.anchorNode;
    const selectionElement = selectionNode?.nodeType === Node.TEXT_NODE ? selectionNode.parentElement : selectionNode;
    const protectedAction = event.target.closest(".protected-content") || selectionElement?.closest?.(".protected-content") || ["s", "p", "u"].includes(key);
    if ((event.ctrlKey || event.metaKey) && ["c", "s", "p", "u"].includes(key) && protectedAction) {
      event.preventDefault();
      showToast("Nội dung bài giảng được cung cấp ở chế độ chỉ đọc.");
    }
    if (event.key === "Escape") toggleChat(false);
  });

  menuButton.addEventListener("click", () => {
    document.getElementById("chu-de").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("current-year").textContent = new Date().getFullYear();
  const hashTopic = window.location.hash.slice(1);
  chooseTopic(topics.some((topic) => topic.id === hashTopic) ? hashTopic : activeTopicId, false);
})();
