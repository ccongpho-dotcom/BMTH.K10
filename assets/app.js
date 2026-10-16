(function () {
  "use strict";

  const topics = Array.isArray(window.BMTH_TOPICS) ? window.BMTH_TOPICS : [];
  const mediaByTopic = window.BMTH_MEDIA && typeof window.BMTH_MEDIA === "object" ? window.BMTH_MEDIA : {};
  const config = window.BMTH_CONFIG || {};
  const nav = document.getElementById("topic-nav");
  const panel = document.getElementById("lesson-panel");
  const chatLauncher = document.getElementById("chat-launcher");
  const chatPanel = document.getElementById("chat-panel");
  const chatClose = document.getElementById("chat-close");
  const chatReset = document.getElementById("chat-reset");
  const chatStatus = document.getElementById("chat-status");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const toast = document.getElementById("toast");
  const menuButton = document.querySelector(".menu-button");
  let activeTopicId = topics[0] ? topics[0].id : null;
  let history = [];
  let busy = false;
  const welcomeMessage = "Xin chào! Đồng chí cần làm rõ nội dung nào?";

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

  function setChatStatus(state, message) {
    chatStatus.dataset.state = state;
    chatStatus.textContent = message;
  }

  function resetConversation() {
    if (busy) {
      showToast("Vui lòng chờ chatbot trả lời xong.");
      return;
    }
    history = [];
    chatMessages.innerHTML = "";
    addMessage(welcomeMessage, "assistant");
    chatInput.value = "";
    chatInput.style.height = "auto";
    setChatStatus(navigator.onLine ? "ready" : "offline", navigator.onLine ? "Sẵn sàng hỗ trợ học tập" : "Mất kết nối mạng");
    showToast("Đã bắt đầu cuộc trò chuyện mới.");
    chatInput.focus();
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

    const media = mediaByTopic[topic.id] || {};
    const summary = media.summary || topic.description;
    const videoUrl = typeof media.video === "string" ? media.video.trim() : "";
    const audioUrl = typeof media.audio === "string" ? media.audio.trim() : "";
    const mediaPlayers = [
      videoUrl ? `
        <div class="media-card media-card-video">
          <div class="media-label"><span aria-hidden="true">▶</span> Video tóm tắt</div>
          <video controls controlsList="nodownload noplaybackrate" disablePictureInPicture playsinline preload="metadata">
            <source src="${escapeHtml(videoUrl)}">
            Trình duyệt của đồng chí không hỗ trợ phát video.
          </video>
        </div>
      ` : "",
      audioUrl ? `
        <div class="media-card media-card-audio">
          <div class="media-label"><span aria-hidden="true">♪</span> Âm thanh tóm tắt</div>
          <audio controls controlsList="nodownload noplaybackrate" preload="metadata">
            <source src="${escapeHtml(audioUrl)}">
            Trình duyệt của đồng chí không hỗ trợ phát âm thanh.
          </audio>
        </div>
      ` : ""
    ].filter(Boolean).join("");

    panel.innerHTML = `
      <div class="lesson-kicker">CHỦ ĐỀ ${escapeHtml(topic.number)}</div>
      <h2 class="lesson-title">${escapeHtml(topic.title)}</h2>
      <p class="lesson-description">${escapeHtml(topic.description)}</p>
      <section class="lesson-summary" aria-labelledby="summary-title-${escapeHtml(topic.id)}">
        <div class="summary-heading">
          <h3 id="summary-title-${escapeHtml(topic.id)}">Tóm tắt nội dung</h3>
          <span class="summary-badge">Video / Âm thanh</span>
        </div>
        <p>${escapeHtml(summary)}</p>
        ${mediaPlayers
          ? `<div class="summary-media-grid">${mediaPlayers}</div>`
          : `<div class="media-empty"><span aria-hidden="true">＋</span> Chưa gán video hoặc tệp âm thanh cho chủ đề này.</div>`}
      </section>
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

  function courseContext() {
    const overview = topics.map(topicSummary).join("\n\n---\n\n");
    return `TÓM LƯỢC TOÀN BỘ HỌC PHẦN\n${overview}`;
  }

  async function askAssistant(message) {
    if (busy) return;
    if (!navigator.onLine) {
      setChatStatus("offline", "Mất kết nối mạng");
      addMessage("Thiết bị đang mất kết nối mạng. Đồng chí vui lòng kiểm tra kết nối và thử lại.", "assistant");
      return;
    }
    if (!config.chatApiUrl) {
      setChatStatus("error", "Chatbot chưa được kết nối");
      addMessage("Chatbot chưa được kết nối. Giảng viên cần điền URL Cloudflare Worker trong tệp config.js sau khi thiết lập API Google AI Studio.", "assistant");
      showToast("Chưa cấu hình địa chỉ chatbot");
      return;
    }

    busy = true;
    const submitButton = chatForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    chatReset.disabled = true;
    setChatStatus("busy", "Đang tìm trong toàn bộ học phần…");
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
          context: courseContext(),
          history: history.slice(-8)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể kết nối với trợ lý AI.");
      typing.remove();
      const answer = data.answer || "Tôi chưa thể tạo câu trả lời lúc này.";
      addMessage(answer, "assistant");
      history.push({ role: "user", text: message }, { role: "model", text: answer });
      setChatStatus("ready", "Sẵn sàng hỗ trợ học tập");
    } catch (error) {
      typing.remove();
      addMessage(`Xin lỗi, hệ thống đang gặp lỗi: ${error.message}`, "assistant");
      setChatStatus(navigator.onLine ? "error" : "offline", navigator.onLine ? "Hệ thống đang bận, vui lòng thử lại" : "Mất kết nối mạng");
    } finally {
      busy = false;
      submitButton.disabled = false;
      chatReset.disabled = false;
      chatInput.focus();
    }
  }

  chatLauncher.addEventListener("click", () => toggleChat());
  chatClose.addEventListener("click", () => toggleChat(false));
  chatReset.addEventListener("click", resetConversation);
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

  window.addEventListener("online", () => setChatStatus("ready", "Sẵn sàng hỗ trợ học tập"));
  window.addEventListener("offline", () => setChatStatus("offline", "Mất kết nối mạng"));

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
