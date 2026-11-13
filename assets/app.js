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
  const legacyAnswerIntro = /^(?:\s*(?:>\s*)?(\*{1,2}|_{1,2})?chào học viên\s*[,!:–—-]?\s*trợ lý học tập xin giải đáp câu hỏi của bạn(?:\s+dựa trên tài liệu học phần)?\s+như sau(?:[ \t]*[:：.!–—-](?:\1)?|\1[ \t]*[:：.!–—-]|(?:\1)?(?=[ \t]*(?:\r?\n|$)))[ \t]*(?:\r?\n[ \t]*)*)+/iu;
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

  function stripAnswerIntro(value) {
    return String(value || "").normalize("NFC").replace(legacyAnswerIntro, "").trim();
  }

  function phraseIncluded(question, phrase) {
    const normalizedPhrase = normalizeText(phrase);
    if (normalizedPhrase.length < 4) return question === normalizedPhrase;
    return question === normalizedPhrase || question.includes(normalizedPhrase) || normalizedPhrase.includes(question);
  }

  // BMTH_ANSWER_INTENT_V1: không chọn FAQ khớp một phần cho câu hỏi so sánh hoặc câu hỏi rộng.
  function bmthIntentKeyV1(value) {
    return String(value ?? "").toLowerCase().normalize("NFD")
      .replace(/\p{M}+/gu, "").replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  function bmthClassifyIntentV1(value) {
    const key = bmthIntentKeyV1(value);
    const plain = key
      .replace(/^(?:(?:xin|hay|vui long|giup toi|cho toi biet|cho biet|dong chi cho biet|dong chi hay) )+/, "")
      .replace(/(?: (?:giup toi|cho toi|voi a|nhe|a))+$/, "");
    const human = "(?:tri tue(?:(?: cua)? (?:con nguoi|nguoi)| tu nhien)?|human intelligence)";
    const ai = "(?:tri tue nhan tao(?: ai)?|ai|artificial intelligence)";
    const pair = (a, b) => [
      new RegExp(`^(?:su )?(?:phan biet|so sanh|doi chieu|neu (?:su )?khac biet) (?:giua )?${a} (?:va|voi|so voi) ${b}$`),
      new RegExp(`^${a} (?:va|voi|so voi) ${b} (?:(?:giong va )?khac nhau(?: (?:o )?(?:diem nao|cho nao|nhu the nao|the nao))?|khac gi|khac nhau gi|co gi khac nhau)$`),
      new RegExp(`^${a} khac(?: gi)?(?: (?:so )?voi)? ${b}(?: (?:o )?(?:diem nao|cho nao|nhu the nao|the nao|gi))?$`),
      new RegExp(`^(?:su )?khac biet giua ${a} va ${b}(?: la gi| o dau| o diem nao| nhu the nao)?$`),
      new RegExp(`^${a} co phai la ${b} khong$`),
    ].some((rule) => rule.test(plain));
    if (pair(human, ai) || pair(ai, human)) return "human-ai";

    const micro = "(?:phan mem )?micro ?station(?: v ?8 ?i)?";
    if (new RegExp(`^(?:${micro} )?(?:(?:(?:co the|cho phep) )?mo (?:toi da )?(?:duoc )?|co )(?:toi da )?bao nhieu (?:cua so )?(?:view|khung nhin)(?: cung (?:mot )?luc| dong thoi)?(?: (?:cua|trong|bang|tren) ${micro})?$`).test(plain)
        && new RegExp(micro).test(plain)) return "micro-views";
    if (new RegExp(`^(?:${micro} (?:(?:cho phep|co the|co the dung de|dung de|duoc dung de|su dung de) (?:thuc hien |lam )?(?:nhung )?(?:gi|viec gi|cong viec gi)|co (?:nhung )?chuc nang (?:gi|nao)|(?:co the )?lam duoc (?:nhung )?gi)|(?:cac |nhung )?(?:chuc nang(?: chinh)?|cong dung|tac dung) (?:cua )?${micro}(?: la gi| gom nhung gi)?|(?:co the )?lam (?:nhung )?gi (?:voi|bang|trong) ${micro})$`).test(plain)) return "micro-overview";

    if (/(?:^| )(?:phan biet|so sanh|doi chieu|khac biet|khac nhau|giong nhau|khac gi|khac .{1,100} o (?:diem|cho) nao)(?: |$)/.test(plain)) return "compare";
    if (/(?:^| )(?:cho phep thuc hien (?:nhung )?gi|co the lam (?:duoc )?(?:nhung )?gi|duoc dung de lam gi|dung de lam gi|co (?:nhung )?chuc nang (?:gi|nao)|chuc nang (?:chinh )?cua .+ la gi)$/.test(plain)) return "overview";
    return "ordinary";
  }

  function findQuickAnswer(message) {
    const strictIntent = bmthClassifyIntentV1(message) !== "ordinary";
    const question = normalizeText(message);
    const questionTokens = new Set(meaningfulTokens(question));
    if (!question || !questionTokens.size) return null;

    let best = null;
    for (const item of faqEntries) {
      const patterns = [item.question, ...(Array.isArray(item.patterns) ? item.patterns : [])];
      const exactPattern = patterns.some((pattern) => strictIntent
        ? bmthIntentKeyV1(message) === bmthIntentKeyV1(pattern)
        : phraseIncluded(question, pattern));
      if (strictIntent && !exactPattern) continue;
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



  // BMTH_GEMINI_QUOTA_UI_V1: giữ mã phiên; Worker chịu trách nhiệm tính lượt.
  let bmthMemorySessionId;
  function getChatSessionId() {
    if (bmthMemorySessionId) return bmthMemorySessionId;
    try {
      const saved = window.sessionStorage.getItem(sessionIdKey);
      if (saved && /^[a-zA-Z0-9-]{12,100}$/.test(saved)) {
        bmthMemorySessionId = saved;
        return bmthMemorySessionId;
      }
    } catch (_) { /* Dùng cùng một mã phiên trong bộ nhớ nếu storage bị chặn. */ }
    bmthMemorySessionId = window.crypto?.randomUUID?.() ||
      ("bmth-" + Date.now() + "-" + Math.random().toString(16).slice(2));
    try { window.sessionStorage.setItem(sessionIdKey, bmthMemorySessionId); } catch (_) { /* giữ trong bộ nhớ */ }
    return bmthMemorySessionId;
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

  // BMTH_CHAT_FULL_UI_V2
  function bmthV2BrowserQuick(message) {
    const key = normalizeText(message);
    const intent = bmthClassifyIntentV1(message);
    if (intent === "human-ai" || intent === "micro-overview" || intent === "micro-views") return null;
    return faqEntries.find(item => [item.question, ...(Array.isArray(item.patterns) ? item.patterns : [])]
      .some(pattern => normalizeText(pattern) === key)) || null;
  }

  function bmthV2BrowserText(value) {
    return String(value ?? "").replace(/[^\p{Script=Latin}\p{Nd}\u0300\u0301\u0302\u0303\u0306\u0309\u031b\u0323\x20-\x7e\n\r\t–—“”‘’…•→←≤≥≠×÷°%]/gu, "");
  }

  async function bmthV2BrowserRead(response, onDelta) {
    if (!response.body) throw new Error("Trình duyệt không nhận được luồng trả lời.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", answer = "", donePacket = false;
    function take(line) {
      if (!line.trim()) return;
      if (donePacket) throw new Error("Luồng phản hồi không hợp lệ.");
      const event = JSON.parse(line);
      if (event.type === "error") throw Object.assign(new Error(event.error || "Phản hồi bị gián đoạn."), { code: event.code });
      if (event.type === "done") { donePacket = true; return; }
      if (event.type === "delta" && typeof event.text === "string") {
        answer += bmthV2BrowserText(event.text);
        if (answer.length > 15000) throw new Error("Phản hồi vượt giới hạn hiển thị.");
        onDelta(answer);
      }
    }
    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1); take(line); }
        if (buffer.length > 65536) throw new Error("Luồng phản hồi vượt giới hạn.");
        if (done) { if (buffer.trim()) take(buffer); break; }
      }
    } finally { await reader.cancel().catch(() => {}); }
    if (!donePacket || !answer.trim()) throw new Error("Phản hồi chưa hoàn tất.");
    return answer.trim();
  }

  async function askAssistant(message) {
    if (busy) return;
    addMessage(message, "user");
    const remember = (answer) => {
      history.push({ role: "user", text: message }, { role: "model", text: answer });
      history = history.slice(-8);
    };
    const quick = bmthV2BrowserQuick(message);
    if (quick) {
      const answer = bmthV2BrowserText(quick.answer).trim();
      addMessage(answer, "assistant");
      remember(answer);
      setChatStatus("ready", "Đã trả lời từ học liệu có sẵn · Không dùng API");
      return;
    }
    if (!navigator.onLine || !config.chatApiUrl) {
      setChatStatus("offline", "Chưa kết nối trợ lý AI");
      addMessage("Tôi chưa kết nối được tới trợ lý AI. Đồng chí vui lòng kiểm tra kết nối rồi thử lại.", "assistant");
      return;
    }
    busy = true;
    const button = chatForm.querySelector("button[type='submit']");
    button.disabled = true;
    chatReset.disabled = true;
    setChatStatus("busy", "Đang tra cứu và soạn câu trả lời…");
    const typing = addMessage("", "assistant", "typing");
    let streamed = null;
    try {
      const active = topics.find(item => item.id === activeTopicId);
      const response = await fetch(config.chatApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/x-ndjson", "X-BMTH-Session": getChatSessionId() },
        // context and the session header let the new page still work after a Worker rollback.
        body: JSON.stringify({ message, activeTopic: active?.title || "", context: courseContext(message, active?.id).slice(0, 24000),
          history: history.slice(-8).map(item => ({ role: item.role, text: item.text.slice(0, item.role === "user" ? 850 : 1300) })) })
      });
      let answer, source;
      if (response.ok && (response.headers.get("Content-Type") || "").includes("application/x-ndjson")) {
        answer = await bmthV2BrowserRead(response, (text) => {
          typing.remove();
          if (!streamed) streamed = addMessage("", "assistant");
          streamed.querySelector(".message-bubble").textContent = text;
          chatMessages.scrollTop = chatMessages.scrollHeight;
        });
      } else {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw Object.assign(new Error(data.error || "Tôi chưa kết nối được với trợ lý AI."), { code: data.code });
        answer = bmthV2BrowserText(data.answer || "Tôi chưa có câu trả lời phù hợp.").trim();
        source = data.source;
      }
      typing.remove();
      if (streamed) streamed.querySelector(".message-bubble").textContent = answer;
      else addMessage(answer, "assistant");
      remember(answer);
      setChatStatus("ready", source === "faq500" || source === "course-intent" || source === "social" ? "Đã trả lời · Không dùng Gemini" : "Sẵn sàng hỗ trợ học tập");
    } catch (error) {
      typing.remove();
      if (streamed) streamed.remove();
      const known = ["GEMINI_IP_DAILY_LIMIT", "GEMINI_UPSTREAM_LIMIT", "GEMINI_UNAVAILABLE", "GEMINI_SESSION_LIMIT"].includes(error.code);
      addMessage(known ? error.message : "Tôi chưa hoàn tất câu trả lời. Đồng chí có thể thử lại.", "assistant");
      setChatStatus(known ? "ready" : "error", known ? "Vẫn có thể tra cứu học liệu có sẵn" : "Chưa nhận được phản hồi đầy đủ");
    } finally {
      busy = false;
      button.disabled = false;
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
