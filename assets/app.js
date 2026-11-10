(function () {
  "use strict";

  const topics = Array.isArray(window.BMTH_TOPICS) ? window.BMTH_TOPICS : [];
  const mediaByTopic = window.BMTH_MEDIA && typeof window.BMTH_MEDIA === "object" ? window.BMTH_MEDIA : {};
  const faqEntries = Array.isArray(window.BMTH_FAQ) ? window.BMTH_FAQ : [];
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
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const viewModeToggle = document.getElementById("view-mode-toggle");
  let activeTopicId = topics[0] ? topics[0].id : null;
  let history = [];
  let busy = false;
  const welcomeMessage = "Xin chào! Đồng chí cần làm rõ nội dung nào?";
  const answerIntro = "Chào học viên, trợ lý học tập xin giải đáp câu hỏi của bạn như sau:";
  const maxApiRequestsPerSession = 6;
  const apiUsageKey = "bmth-ai-api-count";
  const sessionIdKey = "bmth-chat-session-id";
  const stopWords = new Set(["la", "gi", "nhung", "nhu", "the", "nao", "cua", "co", "va", "cho", "trong", "mot", "cac", "duoc", "ve", "voi", "khi", "can", "hay", "toi", "dong", "chi"]);

  function isPhoneScreen() {
    return Math.min(window.screen.width || window.innerWidth, window.screen.height || window.innerHeight) <= 760;
  }

  function setViewMode(overview, persist) {
    if (!viewportMeta || !viewModeToggle) return;
    const enabled = Boolean(overview && isPhoneScreen());
    document.documentElement.classList.toggle("overview-mode", enabled);
    viewportMeta.setAttribute("content", enabled
      ? "width=1180, initial-scale=1, viewport-fit=cover"
      : "width=device-width, initial-scale=1, viewport-fit=cover");
    viewModeToggle.setAttribute("aria-pressed", String(enabled));
    viewModeToggle.setAttribute("aria-label", enabled ? "Trở về giao diện điện thoại" : "Xem bố cục toàn cảnh");
    const label = viewModeToggle.querySelector("span");
    if (label) label.textContent = enabled ? "Về di động" : "Toàn cảnh";
    if (persist) {
      try {
        window.localStorage.setItem("bmth-view-mode", enabled ? "overview" : "mobile");
      } catch (_) {
        // Trình duyệt có thể chặn lưu tùy chọn; giao diện vẫn hoạt động trong phiên hiện tại.
      }
    }
  }

  if (viewModeToggle) {
    let savedViewMode = "mobile";
    try {
      savedViewMode = window.localStorage.getItem("bmth-view-mode") || "mobile";
    } catch (_) {
      savedViewMode = "mobile";
    }
    setViewMode(savedViewMode === "overview", false);
    viewModeToggle.addEventListener("click", () => {
      const nextOverview = !document.documentElement.classList.contains("overview-mode");
      setViewMode(nextOverview, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const escapeHtml = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function meaningfulTokens(value) {
    return normalizeText(value).split(" ").filter((token) => token.length > 1 && !stopWords.has(token));
  }

  function phraseIncluded(question, phrase) {
    const normalizedPhrase = normalizeText(phrase);
    if (normalizedPhrase.length < 4) return question === normalizedPhrase;
    return question === normalizedPhrase || question.includes(normalizedPhrase) || normalizedPhrase.includes(question);
  }

  function findQuickAnswer(message) {
    const question = normalizeText(message);
    const questionTokens = new Set(meaningfulTokens(question));
    if (!question || !questionTokens.size) return null;

    let best = null;
    for (const item of faqEntries) {
      const patterns = [item.question, ...(Array.isArray(item.patterns) ? item.patterns : [])];
      const exactPattern = patterns.some((pattern) => phraseIncluded(question, pattern));
      const keywordPhrases = Array.isArray(item.keywords) ? item.keywords.map(normalizeText).filter(Boolean) : [];
      const keywordHits = keywordPhrases.filter((keyword) => {
        if (keyword.includes(" ")) return question.includes(keyword);
        return questionTokens.has(keyword);
      }).length;
      const referenceTokens = new Set(meaningfulTokens(`${item.question} ${keywordPhrases.join(" ")}`));
      const overlap = [...questionTokens].filter((token) => referenceTokens.has(token)).length;
      const unionSize = new Set([...questionTokens, ...referenceTokens]).size || 1;
      const overlapScore = overlap / unionSize;
      const keywordScore = keywordHits / Math.max(2, Math.min(4, keywordPhrases.length || 2));
      const score = exactPattern ? 1 : keywordScore * 0.72 + overlapScore * 0.28;
      const eligible = exactPattern || (keywordHits >= 2 && score >= 0.58);
      if (eligible && (!best || score > best.score)) best = { ...item, score };
    }
    return best && best.score >= 0.58 ? best : null;
  }

  function readApiUsage() {
    try {
      return Math.max(0, Number(window.sessionStorage.getItem(apiUsageKey)) || 0);
    } catch (_) {
      return 0;
    }
  }

  function incrementApiUsage() {
    const next = readApiUsage() + 1;
    try {
      window.sessionStorage.setItem(apiUsageKey, String(next));
    } catch (_) {
      // Nếu trình duyệt chặn sessionStorage, Worker vẫn duy trì giới hạn phía máy chủ.
    }
    return next;
  }

  function getChatSessionId() {
    try {
      let value = window.sessionStorage.getItem(sessionIdKey);
      if (!value) {
        value = window.crypto?.randomUUID?.() || `bmth-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        window.sessionStorage.setItem(sessionIdKey, value);
      }
      return value;
    } catch (_) {
      return `bmth-${Math.random().toString(16).slice(2)}`;
    }
  }

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
      <section class="topic-quiz-card" aria-label="Tự kiểm tra chủ đề ${escapeHtml(topic.shortTitle || topic.title)}">
        <div>
          <span class="topic-quiz-icon" aria-hidden="true">✓</span>
          <div>
            <h3>Tự kiểm tra kiến thức</h3>
          </div>
        </div>
        <a href="quiz.html?topic=${encodeURIComponent(topic.id)}">Bắt đầu <span aria-hidden="true">→</span></a>
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
    panel.dispatchEvent(new CustomEvent("bmth:lesson-rendered", { detail: { topicId: topic.id } }));
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

  function courseContext(message, currentTopicId) {
    const normalizedMessage = normalizeText(message);
    const messageTokens = new Set(meaningfulTokens(normalizedMessage));
    const refersToCurrentTopic = /\b(chu de nay|noi dung nay|phan nay|bai nay)\b/.test(normalizedMessage);
    let selected = refersToCurrentTopic ? topics.filter((topic) => topic.id === currentTopicId) : [];

    if (!selected.length) {
      const ranked = topics.map((topic) => {
        const searchable = normalizeText(`${topic.title} ${topic.shortTitle} ${topic.description} ${topic.sections.map((section) => `${section.title} ${section.content}`).join(" ")} ${topic.keyPoints.join(" ")}`);
        const score = [...messageTokens].reduce((total, token) => total + (searchable.includes(token) ? 1 : 0), 0);
        return { topic, score };
      }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
      const bestScore = ranked[0]?.score || 0;
      selected = ranked.filter((item) => item.score >= Math.max(2, bestScore - 1)).slice(0, 2).map((item) => item.topic);
    }

    if (!selected.length) selected = topics;
    const overview = selected.map(topicSummary).join("\n\n---\n\n");
    const scope = selected.length === topics.length ? "TOÀN BỘ HỌC PHẦN" : `NỘI DUNG LIÊN QUAN (${selected.map((topic) => topic.shortTitle).join(", ")})`;
    return `${scope}\n${overview}`;
  }

  async function askAssistant(message) {
    if (busy) return;
    addMessage(message, "user");

    const quickAnswer = findQuickAnswer(message);
    if (quickAnswer) {
      const answer = `${answerIntro}\n\n${quickAnswer.answer}`;
      addMessage(answer, "assistant");
      history.push({ role: "user", text: message }, { role: "model", text: answer });
      history = history.slice(-8);
      setChatStatus("ready", "Đã trả lời từ học liệu có sẵn · Không dùng API");
      window.setTimeout(() => {
        if (!busy) setChatStatus("ready", "Sẵn sàng hỗ trợ học tập");
      }, 4200);
      return;
    }

    if (!navigator.onLine) {
      setChatStatus("offline", "Mất kết nối mạng");
      addMessage("Câu hỏi này chưa có trong bộ trả lời nhanh và thiết bị đang mất kết nối mạng. Đồng chí vui lòng kiểm tra kết nối rồi thử lại.", "assistant");
      return;
    }
    if (!config.chatApiUrl) {
      setChatStatus("error", "Chatbot chưa được kết nối");
      addMessage("Chatbot chưa được kết nối. Giảng viên cần điền URL Cloudflare Worker trong tệp config.js sau khi thiết lập API Google AI Studio.", "assistant");
      showToast("Chưa cấu hình địa chỉ chatbot");
      return;
    }

    if (readApiUsage() >= maxApiRequestsPerSession) {
      setChatStatus("ready", "Đã đạt giới hạn hỏi AI trong phiên");
      addMessage(`Để tiết kiệm hạn mức dùng thử, mỗi phiên được gửi tối đa ${maxApiRequestsPerSession} câu hỏi mới tới AI. Đồng chí vẫn có thể hỏi các nội dung phổ biến trong học phần hoặc bắt đầu lại sau khi mở phiên trình duyệt mới.`, "assistant");
      return;
    }

    busy = true;
    const submitButton = chatForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    chatReset.disabled = true;
    setChatStatus("busy", "Đang tìm trong toàn bộ học phần…");
    const typing = addMessage("", "assistant", "typing");

    try {
      const activeTopic = topics.find((item) => item.id === activeTopicId);
      incrementApiUsage();
      const response = await fetch(config.chatApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BMTH-Session": getChatSessionId()
        },
        body: JSON.stringify({
          message,
          activeTopic: activeTopic ? activeTopic.title : "",
          context: courseContext(message, activeTopic?.id),
          history: history.slice(-4)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) throw new Error(data.error || "Hệ thống đang có nhiều câu hỏi. Vui lòng đợi khoảng 60 giây rồi thử lại.");
        throw new Error(data.error || "Không thể kết nối với trợ lý AI.");
      }
      typing.remove();
      const answer = data.answer || "Tôi chưa thể tạo câu trả lời lúc này.";
      addMessage(answer, "assistant");
      history.push({ role: "user", text: message }, { role: "model", text: answer });
      history = history.slice(-8);
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
