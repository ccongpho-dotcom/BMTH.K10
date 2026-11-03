const TOPIC_IDS = new Set([
  "chuyen-doi-so",
  "tu-dong-hoa-chi-huy",
  "microstation-v8i",
  "tri-tue-nhan-tao",
  "an-toan-thong-tin"
]);
const DIFFICULTIES = new Set(["co-ban", "thong-hieu", "van-dung"]);
const OPTION_KEYS = ["A", "B", "C", "D"];
const rateBuckets = new Map();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!originAllowed(origin, env)) return json({ error: "Nguồn truy cập không được phép." }, 403, request, env);
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (origin && !originAllowed(origin, env)) return json({ error: "Nguồn truy cập không được phép." }, 403, request, env);

    try {
      if (request.method === "GET" && url.pathname === "/") {
        return json({ ok: true, service: "BMTH.K10 Quiz API", database: Boolean(env.DB) }, 200, request, env);
      }
      if (!env.DB) throw httpError(503, "Worker chưa được liên kết với cơ sở dữ liệu D1 (binding DB).");

      if (request.method === "GET" && url.pathname === "/api/quiz/meta") {
        enforceRateLimit(request, "public", 120, 60_000);
        return json(await getQuizMeta(env), 200, request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/quiz/start") {
        enforceRateLimit(request, "public", 60, 60_000);
        return json(await startQuiz(request, env), 200, request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/quiz/submit") {
        enforceRateLimit(request, "public", 60, 60_000);
        return json(await submitQuiz(request, env), 200, request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/admin/login") {
        enforceRateLimit(request, "login", 10, 10 * 60_000);
        return json(await adminLogin(request, env), 200, request, env);
      }

      if (url.pathname.startsWith("/api/admin/")) {
        await requireAdmin(request, env);
        if (request.method === "GET" && url.pathname === "/api/admin/stats") {
          return json(await adminStats(env), 200, request, env);
        }
        if (request.method === "GET" && url.pathname === "/api/admin/questions") {
          return json(await listQuestions(url, env), 200, request, env);
        }
        if (request.method === "POST" && url.pathname === "/api/admin/questions") {
          return json(await createQuestion(request, env), 201, request, env);
        }
        if (request.method === "POST" && url.pathname === "/api/admin/import") {
          return json(await importQuestions(request, env), 200, request, env);
        }
        const match = url.pathname.match(/^\/api\/admin\/questions\/(\d+)$/);
        if (match && request.method === "PUT") {
          return json(await updateQuestion(request, env, Number(match[1])), 200, request, env);
        }
        if (match && request.method === "DELETE") {
          return json(await deleteQuestion(env, Number(match[1])), 200, request, env);
        }
      }

      return json({ error: "Không tìm thấy đường dẫn API." }, 404, request, env);
    } catch (error) {
      const status = Number(error && error.status) || 500;
      const message = status >= 500 && status !== 503 ? "Máy chủ đang gặp lỗi. Vui lòng thử lại." : error.message;
      if (status >= 500) console.error(error);
      return json({ error: message }, status, request, env);
    }
  }
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  };
  if (!origin) headers["Access-Control-Allow-Origin"] = "*";
  else if (originAllowed(origin, env)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(request, env) });
}

function originAllowed(origin, env) {
  if (!origin) return true;
  const configured = String(env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  return configured.length === 0 || configured.includes("*") || configured.includes(origin);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function clientKey(request, bucket) {
  return `${bucket}:${request.headers.get("CF-Connecting-IP") || "unknown"}`;
}

function enforceRateLimit(request, bucket, limit, windowMs) {
  const now = Date.now();
  const key = clientKey(request, bucket);
  let entry = rateBuckets.get(key);
  if (!entry || entry.resetAt <= now) entry = { count: 0, resetAt: now + windowMs };
  entry.count += 1;
  rateBuckets.set(key, entry);
  if (entry.count > limit) throw httpError(429, "Thao tác quá nhanh. Vui lòng thử lại sau.");
  if (rateBuckets.size > 3000) {
    for (const [storedKey, stored] of rateBuckets) if (stored.resetAt <= now) rateBuckets.delete(storedKey);
  }
}

async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 2_000_000) throw httpError(413, "Dữ liệu gửi lên quá lớn.");
  try {
    return await request.json();
  } catch {
    throw httpError(400, "Dữ liệu JSON không hợp lệ.");
  }
}

async function getQuizMeta(env) {
  const result = await env.DB.prepare(
    "SELECT topic_id AS topicId, COUNT(*) AS count FROM quiz_questions WHERE is_active = 1 GROUP BY topic_id"
  ).all();
  const counts = new Map((result.results || []).map((row) => [row.topicId, Number(row.count)]));
  const topics = [...TOPIC_IDS].map((id) => ({ id, count: counts.get(id) || 0 }));
  return { totalActive: topics.reduce((sum, topic) => sum + topic.count, 0), topics };
}

async function startQuiz(request, env) {
  requireTokenSecret(env);
  const body = await readJson(request);
  const topicId = body.topicId === "all" ? "all" : cleanTopic(body.topicId);
  const requestedCount = clampInteger(body.count, 1, 20, 10);
  const statement = topicId === "all"
    ? env.DB.prepare("SELECT id, topic_id AS topicId, question_text AS questionText, option_a AS optionA, option_b AS optionB, option_c AS optionC, option_d AS optionD FROM quiz_questions WHERE is_active = 1 ORDER BY RANDOM() LIMIT ?").bind(requestedCount)
    : env.DB.prepare("SELECT id, topic_id AS topicId, question_text AS questionText, option_a AS optionA, option_b AS optionB, option_c AS optionC, option_d AS optionD FROM quiz_questions WHERE is_active = 1 AND topic_id = ? ORDER BY RANDOM() LIMIT ?").bind(topicId, requestedCount);
  const result = await statement.all();
  const rows = result.results || [];
  if (!rows.length) throw httpError(404, "Phạm vi này chưa có câu hỏi đang sử dụng.");
  const ids = rows.map((row) => Number(row.id));
  const sessionToken = await signToken({ type: "quiz", ids, topicId, exp: epochSeconds() + 2 * 60 * 60 }, env.QUIZ_TOKEN_SECRET);
  const questions = rows.map((row) => ({
    id: Number(row.id),
    topicId: row.topicId,
    text: row.questionText,
    options: shuffle([
      { key: "A", text: row.optionA },
      { key: "B", text: row.optionB },
      { key: "C", text: row.optionC },
      { key: "D", text: row.optionD }
    ])
  }));
  return { sessionToken, requestedCount, questions };
}

async function submitQuiz(request, env) {
  requireTokenSecret(env);
  const body = await readJson(request);
  const payload = await verifyToken(String(body.sessionToken || ""), env.QUIZ_TOKEN_SECRET, "quiz");
  const ids = Array.isArray(payload.ids) ? payload.ids.map(Number).filter(Number.isInteger).slice(0, 20) : [];
  if (!ids.length) throw httpError(400, "Lượt kiểm tra không hợp lệ.");
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const placeholders = ids.map(() => "?").join(",");
  const result = await env.DB.prepare(
    `SELECT id, question_text AS questionText, option_a AS optionA, option_b AS optionB, option_c AS optionC, option_d AS optionD, correct_option AS correctOption, explanation FROM quiz_questions WHERE id IN (${placeholders})`
  ).bind(...ids).all();
  const byId = new Map((result.results || []).map((row) => [Number(row.id), row]));
  let correct = 0;
  const results = ids.map((id) => {
    const row = byId.get(id);
    if (!row) return null;
    const selected = OPTION_KEYS.includes(String(answers[id] || "").toUpperCase()) ? String(answers[id]).toUpperCase() : "";
    const options = { A: row.optionA, B: row.optionB, C: row.optionC, D: row.optionD };
    const isCorrect = selected === row.correctOption;
    if (isCorrect) correct += 1;
    return {
      id,
      questionText: row.questionText,
      selectedOption: selected,
      selectedText: selected ? options[selected] : "",
      correctOption: row.correctOption,
      correctText: options[row.correctOption],
      isCorrect,
      explanation: row.explanation || ""
    };
  }).filter(Boolean);
  const total = results.length;
  return { score: { correct, total, percent: total ? Math.round((correct / total) * 100) : 0 }, results };
}

async function adminLogin(request, env) {
  requireTokenSecret(env);
  if (!env.QUIZ_ADMIN_PASSWORD) throw httpError(503, "Worker chưa được cấu hình mật khẩu quản trị.");
  const body = await readJson(request);
  const expectedUsername = String(env.QUIZ_ADMIN_USERNAME || "admin");
  const usernameOk = await secureEqual(String(body.username || ""), expectedUsername);
  const passwordOk = await secureEqual(String(body.password || ""), String(env.QUIZ_ADMIN_PASSWORD));
  if (!usernameOk || !passwordOk) throw httpError(401, "Tên đăng nhập hoặc mật khẩu không đúng.");
  const token = await signToken({ type: "admin", sub: expectedUsername, exp: epochSeconds() + 4 * 60 * 60 }, env.QUIZ_TOKEN_SECRET);
  return { token, expiresIn: 4 * 60 * 60 };
}

async function requireAdmin(request, env) {
  requireTokenSecret(env);
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw httpError(401, "Cần đăng nhập quản trị.");
  return verifyToken(match[1], env.QUIZ_TOKEN_SECRET, "admin");
}

async function adminStats(env) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive, COUNT(DISTINCT topic_id) AS topicsWithQuestions FROM quiz_questions"
  ).first();
  return {
    total: Number(row?.total || 0),
    active: Number(row?.active || 0),
    inactive: Number(row?.inactive || 0),
    topicsWithQuestions: Number(row?.topicsWithQuestions || 0)
  };
}

async function listQuestions(url, env) {
  const topic = url.searchParams.get("topic") || "all";
  const query = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const conditions = [];
  const values = [];
  if (topic !== "all") { conditions.push("topic_id = ?"); values.push(cleanTopic(topic)); }
  if (query) { conditions.push("question_text LIKE ? ESCAPE '\\'"); values.push(`%${escapeLike(query)}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  let statement = env.DB.prepare(
    `SELECT id, topic_id AS topicId, question_text AS questionText, option_a AS optionA, option_b AS optionB, option_c AS optionC, option_d AS optionD, correct_option AS correctOption, explanation, difficulty, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt FROM quiz_questions ${where} ORDER BY topic_id, id DESC LIMIT 500`
  );
  if (values.length) statement = statement.bind(...values);
  const result = await statement.all();
  return { questions: (result.results || []).map(publicAdminQuestion) };
}

async function createQuestion(request, env) {
  const item = validateQuestion(await readJson(request));
  try {
    const result = await env.DB.prepare(
      "INSERT INTO quiz_questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(...questionBindings(item)).run();
    return { ok: true, id: Number(result.meta?.last_row_id || 0) };
  } catch (error) {
    if (String(error.message || "").toLowerCase().includes("unique")) throw httpError(409, "Câu hỏi này đã tồn tại trong chủ đề.");
    throw error;
  }
}

async function updateQuestion(request, env, id) {
  if (!Number.isInteger(id) || id < 1) throw httpError(400, "Mã câu hỏi không hợp lệ.");
  const item = validateQuestion(await readJson(request));
  try {
    const result = await env.DB.prepare(
      "UPDATE quiz_questions SET topic_id = ?, question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, explanation = ?, difficulty = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(...questionBindings(item), id).run();
    if (!Number(result.meta?.changes || 0)) throw httpError(404, "Không tìm thấy câu hỏi.");
    return { ok: true };
  } catch (error) {
    if (error.status) throw error;
    if (String(error.message || "").toLowerCase().includes("unique")) throw httpError(409, "Câu hỏi này đã tồn tại trong chủ đề.");
    throw error;
  }
}

async function deleteQuestion(env, id) {
  if (!Number.isInteger(id) || id < 1) throw httpError(400, "Mã câu hỏi không hợp lệ.");
  const result = await env.DB.prepare("DELETE FROM quiz_questions WHERE id = ?").bind(id).run();
  if (!Number(result.meta?.changes || 0)) throw httpError(404, "Không tìm thấy câu hỏi.");
  return { ok: true };
}

async function importQuestions(request, env) {
  const body = await readJson(request);
  if (!Array.isArray(body.questions) || body.questions.length < 1) throw httpError(400, "Danh sách câu hỏi đang trống.");
  if (body.questions.length > 500) throw httpError(400, "Mỗi lần chỉ được nạp tối đa 500 câu hỏi.");
  const valid = [];
  let skipped = 0;
  for (const raw of body.questions) {
    try { valid.push(validateQuestion(raw)); } catch { skipped += 1; }
  }
  let inserted = 0;
  for (let offset = 0; offset < valid.length; offset += 50) {
    const statements = valid.slice(offset, offset + 50).map((item) => env.DB.prepare(
      "INSERT OR IGNORE INTO quiz_questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(...questionBindings(item)));
    const results = await env.DB.batch(statements);
    for (const result of results) inserted += Number(result.meta?.changes || 0);
  }
  skipped += valid.length - inserted;
  return { ok: true, inserted, skipped };
}

function validateQuestion(raw) {
  const topicId = cleanTopic(raw.topicId);
  const questionText = cleanText(raw.questionText, "Nội dung câu hỏi", 1200, true);
  const options = raw.options && typeof raw.options === "object" ? raw.options : {};
  const normalizedOptions = {};
  for (const key of OPTION_KEYS) normalizedOptions[key] = cleanText(options[key], `Đáp án ${key}`, 600, true);
  const correctOption = String(raw.correctOption || "").trim().toUpperCase();
  if (!OPTION_KEYS.includes(correctOption)) throw httpError(400, "Đáp án đúng phải là A, B, C hoặc D.");
  const difficulty = String(raw.difficulty || "co-ban").trim();
  if (!DIFFICULTIES.has(difficulty)) throw httpError(400, "Mức độ câu hỏi không hợp lệ.");
  return {
    topicId,
    questionText,
    options: normalizedOptions,
    correctOption,
    explanation: cleanText(raw.explanation || "", "Giải thích", 1600, false),
    difficulty,
    isActive: raw.isActive !== false
  };
}

function questionBindings(item) {
  return [item.topicId, item.questionText, item.options.A, item.options.B, item.options.C, item.options.D, item.correctOption, item.explanation, item.difficulty, item.isActive ? 1 : 0];
}

function publicAdminQuestion(row) {
  return {
    id: Number(row.id),
    topicId: row.topicId,
    questionText: row.questionText,
    options: { A: row.optionA, B: row.optionB, C: row.optionC, D: row.optionD },
    correctOption: row.correctOption,
    explanation: row.explanation || "",
    difficulty: row.difficulty,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function cleanTopic(value) {
  const topic = String(value || "").trim();
  if (!TOPIC_IDS.has(topic)) throw httpError(400, "Chủ đề không hợp lệ.");
  return topic;
}

function cleanText(value, label, maxLength, required) {
  const text = String(value || "").trim();
  if (required && !text) throw httpError(400, `${label} không được để trống.`);
  if (text.length > maxLength) throw httpError(400, `${label} vượt quá ${maxLength} ký tự.`);
  return text;
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function shuffle(items) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const target = random[0] % (index + 1);
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

function requireTokenSecret(env) {
  if (!env.QUIZ_TOKEN_SECRET || String(env.QUIZ_TOKEN_SECRET).length < 32) {
    throw httpError(503, "Worker chưa được cấu hình QUIZ_TOKEN_SECRET đủ mạnh.");
  }
}

function epochSeconds() {
  return Math.floor(Date.now() / 1000);
}

async function signToken(payload, secret) {
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(encodedPayload, secret);
  return `${encodedPayload}.${base64UrlEncode(signature)}`;
}

async function verifyToken(token, secret, expectedType) {
  const [encodedPayload, encodedSignature, extra] = String(token || "").split(".");
  if (!encodedPayload || !encodedSignature || extra !== undefined) throw httpError(401, "Phiên làm việc không hợp lệ.");
  const expected = await hmac(encodedPayload, secret);
  const supplied = base64UrlDecode(encodedSignature);
  if (!byteArraysEqual(expected, supplied)) throw httpError(401, "Phiên làm việc không hợp lệ.");
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))); }
  catch { throw httpError(401, "Phiên làm việc không hợp lệ."); }
  if (payload.type !== expectedType || !Number.isFinite(payload.exp) || payload.exp < epochSeconds()) {
    throw httpError(401, "Phiên làm việc đã hết hạn.");
  }
  return payload;
}

async function hmac(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

async function secureEqual(left, right) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right))
  ]);
  return byteArraysEqual(new Uint8Array(leftHash), new Uint8Array(rightHash));
}

function byteArraysEqual(left, right) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) difference |= (left[index % left.length] || 0) ^ (right[index % right.length] || 0);
  return difference === 0;
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  let binary;
  try { binary = atob(base64); } catch { throw httpError(401, "Phiên làm việc không hợp lệ."); }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

