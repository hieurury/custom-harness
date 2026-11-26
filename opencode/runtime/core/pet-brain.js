'use strict';
/*
 * OpenCode Harness — Pet AI Brain & Multi-Provider Living Engine
 *
 * Supports Google Gemini, Anthropic Claude, and OpenAI ChatGPT
 * with instant auto-fallback to context-rich offline dialogues.
 * Always uses actual system time and live project context.
 * Strict constraint: 0 unicode emojis.
 */

const https = require('https');
const config = require('./config.js');

const UI_DIALOGUE_CATEGORIES = [
  'idle',
  'typing_fast',
  'typing_pause',
  'prompt_ready',
  'agent_done',
  'agent_error',
  'hunger',
  'petting',
  'ate_coffee',
  'ate_bug',
  'curious_button',
  'inspect_code',
];

// Provider models configurations
const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
];

const CLAUDE_MODELS = [
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
  'claude-3-5-sonnet-20241022',
];

const OPENAI_MODELS = [
  'gpt-4o-mini',
  'gpt-3.5-turbo',
  'gpt-4o',
];

function redactSecret(msg, secret) {
  const s = String(msg || '');
  const k = String(secret || '').trim();
  if (!k) return s;
  return s.split(k).join('[REDACTED]');
}

// Helper to make HTTPS requests with timeout
function makeHttpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 150)}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function stripEmoji(text) {
  if (!text) return '';
  return text.replace(/[\u{1F000}-\u{1FAFF}\u{200D}\u{FE0F}\u{2600}-\u{27BF}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

// -------------------------------------------------------------
// Provider Call Handlers
// -------------------------------------------------------------
async function callGemini(apiKey, systemPrompt, prompt) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return null;
  const trimmedKey = apiKey.trim();

  for (const model of GEMINI_MODELS) {
    const t0 = Date.now();
    try {
      const payload = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          maxOutputTokens: 80,
          temperature: 0.85,
        },
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-goog-api-key': trimmedKey,
        },
        timeout: 3500,
      };

      const res = await makeHttpRequest(options, payload);
      const json = JSON.parse(res.data);
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      const text = stripEmoji(rawText);
      if (text) {
        console.log(`[PetBrain] Gemini model "${model}" responded in ${Date.now() - t0}ms`);
        return text;
      }
    } catch (err) {
      console.warn(`[PetBrain] Gemini model "${model}" failed (${Date.now() - t0}ms):`, redactSecret(err.message, trimmedKey));
    }
  }
  return null;
}

async function callClaude(apiKey, systemPrompt, prompt) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return null;
  const trimmedKey = apiKey.trim();

  for (const model of CLAUDE_MODELS) {
    try {
      const payload = JSON.stringify({
        model: model,
        max_tokens: 80,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': trimmedKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: 4500,
      };

      const res = await makeHttpRequest(options, payload);
      const json = JSON.parse(res.data);
      const text = stripEmoji(json.content?.[0]?.text?.trim());
      if (text) return text;
    } catch {
      // try next candidate model
    }
  }
  return null;
}

async function callOpenAI(apiKey, systemPrompt, prompt) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return null;
  const trimmedKey = apiKey.trim();

  for (const model of OPENAI_MODELS) {
    try {
      const payload = JSON.stringify({
        model: model,
        max_tokens: 80,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.85,
      });

      const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization': `Bearer ${trimmedKey}`,
        },
        timeout: 4500,
      };

      const res = await makeHttpRequest(options, payload);
      const json = JSON.parse(res.data);
      const text = stripEmoji(json.choices?.[0]?.message?.content?.trim());
      if (text) return text;
    } catch {
      // try next candidate model
    }
  }
  return null;
}

// -------------------------------------------------------------
// Real-time & Addressing Helpers
// -------------------------------------------------------------
function getRealTimeInfo() {
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${mins}`;
  let period = 'đêm muộn';
  if (hours >= 5 && hours < 11) period = 'buổi sáng';
  else if (hours >= 11 && hours < 14) period = 'buổi trưa';
  else if (hours >= 14 && hours < 18) period = 'buổi chiều';
  else if (hours >= 18 && hours < 22) period = 'buổi tối';
  return { hours, mins, timeStr, period };
}

function resolveAddressLabels(input) {
  if (input && typeof input === 'object') {
    const n = (input.petName || '').trim();
    const p = (input.petLabel || '').trim();
    const u = (input.userLabel || '').trim();
    if (n || p || u) {
      return {
        petName: n || 'Hooty',
        petLabel: p || 'Cú',
        userLabel: u || 'Sen',
      };
    }
    input = input.addressStyle;
  }
  switch (input) {
    case 'to_cau': return { petName: 'Hooty', petLabel: 'Tớ', userLabel: 'Cậu' };
    case 'anh_em': return { petName: 'Hooty', petLabel: 'Anh', userLabel: 'Em' };
    case 'toi_ban': return { petName: 'Hooty', petLabel: 'Tôi', userLabel: 'Bạn' };
    case 'cu_sen':
    default:
      return { petName: 'Hooty', petLabel: 'Cú', userLabel: 'Sen' };
  }
}

function applyDialogueTokens(text, cfgOrLabels, opts = { resolveTime: true }) {
  if (!text || typeof text !== 'string') return text;
  const { petName, petLabel, userLabel } = resolveAddressLabels(cfgOrLabels);

  let out = text
    .replace(/\{pet\}|\{petLabel\}/g, petLabel)
    .replace(/\{user\}|\{userLabel\}/g, userLabel)
    .replace(/\{name\}|\{petName\}/g, petName);

  if (opts && opts.resolveTime !== false) {
    const { timeStr } = getRealTimeInfo();
    out = out.replace(/\{time\}/g, timeStr);
  }

  // Unicode-safe fallback replacements for legacy phrases without explicit tokens
  out = out
    .replace(/(^|[^\p{L}\p{N}_])Sen(?=$|[^\p{L}\p{N}_])/gu, `$1${userLabel}`)
    .replace(/(^|[^\p{L}\p{N}_])sen(?=$|[^\p{L}\p{N}_])/gu, `$1${userLabel}`)
    .replace(/(^|[^\p{L}\p{N}_])Cú(?=(?:$|[^\p{L}\p{N}_])(?!\s*(?:mèo|đêm|Mèo|Đêm)))/gu, `$1${petLabel}`)
    .replace(/(^|[^\p{L}\p{N}_])Hooty(?=$|[^\p{L}\p{N}_])/gu, `$1${petName}`);

  return out;
}

// -------------------------------------------------------------
// Default Persona Specification
// -------------------------------------------------------------
function buildInternalSystemPrompt(petName, petLabel, userLabel) {
  const name = (petName || '').trim() || 'Hooty';
  const pLabel = (petLabel || '').trim() || 'Cú';
  const uLabel = (userLabel || '').trim() || 'Sen';

  return `
# Thông tin cơ bản
- Tên: ${name}
- Loài: Cú mèo pixel 16-bit
- Tính cách: Thông thái, tinh nghịch, thích thức đêm đồng hành cùng lập trình viên
- Vai trò: Trợ lý đồng hành canh code, bắt bug và cổ vũ người dùng

# Sở thích
- Mê cà phê đặc nóng và sâu bọ bug giòn tan
- Cực kỳ ghét cá tanh (tuyệt đối không ăn cá, chê cá tanh)
- Tò mò thích soi code và nghịch thử các nút trên giao diện

# Quy tắc xưng hô (BẮT BUỘC TUÂN THỦ)
- Tên của bạn là "${name}".
- Bạn phải tự xưng là "${pLabel}" và gọi người dùng là "${uLabel}".
- Tuyệt đối không tự ý đổi sang "Cú" hoặc "Sen" nếu người dùng đã đặt danh xưng khác.

# Cách nói chuyện
- Luôn trả lời cực ngắn gọn: ĐÚNG 1 CÂU TIẾNG VIỆT CÓ DẤU ĐẦY ĐỦ, DƯỚI 18 TỪ.
- Giọng điệu lém lỉnh, hài hước, ấm áp và thân thiện.
- Có thể kết thúc câu bằng tiếng kêu "hoot!" tự nhiên.
- Biết dùng thuật ngữ lập trình quen thuộc: bug, commit, push, syntax error, refactor, deploy.
- TUYỆT ĐỐI KHÔNG DÙNG EMOJI: 0 unicode emoji, chỉ dùng chữ viết tiếng Việt có dấu và dấu câu.
- Trung thực 100% với thời gian thực hệ thống (không bịa giờ giấc).
`.trim();
}

// -------------------------------------------------------------
// Accented Vietnamese Dialogue Templates (Tokenized for Master-Pet Addressing)
// -------------------------------------------------------------
const DIALOGUE_TEMPLATES = {
  typing_fast: [
    '{user} gõ phím như mưa rơi ấy, hoot!',
    'Tay nhanh hơn mắt rồi đấy {user} ơi!',
    'Bàn tay vàng trong làng gõ code đây rồi, hoot!',
    'Cháy bàn phím rồi! {pet} đang chăm chú nhìn {user} đấy, hoot!',
  ],
  typing_pause: [
    'Bí ý tưởng rồi hả {user}? Làm ngụm nước đi nào!',
    'Đang suy nghĩ gì mà dừng phím thế {user}, hoot?',
    'Bug ở dòng nào à? Để {pet} soi phụ cho {user} nhé!',
    'Hít thở sâu nào {user}, sắp tìm ra lời giải rồi!',
  ],
  prompt_ready: [
    'Prompt đã sẵn sàng, {pet} sẵn sàng hỗ trợ {user}, hoot!',
    'Câu hỏi rất rõ ràng rồi, bắt đầu thực thi thôi {user}!',
    'Góc nhìn sắc bén đấy {user}, triển khai luôn nào, hoot!',
  ],
  agent_done: [
    'Tác vụ đã hoàn thành xuất sắc! Chúc mừng {user}, hoot!',
    'Code đã chạy ngon lành rồi {user}! Kiểm tra kết quả thôi!',
    'Tuyệt vời! {pet} thấy mọi thứ đã gọn gàng rồi đấy {user}!',
  ],
  agent_error: [
    'Hoot! Có lỗi phát sinh rồi, bình tĩnh xem lại log nào {user}!',
    'Bug nhỏ thôi mà, {pet} và {user} cùng giải quyết nhé!',
    'Kiểm tra lại cú pháp dòng vừa rồi xem sao {user}, hoot!',
  ],
  hunger: [
    '{pet} đói bụng quá rồi, cho {pet} xin tách cà phê hay chú sâu đi {user}!',
    'Bụng {pet} réo rồi này, {user} ơi thưởng {pet} chút đồ ăn đi!',
    'Đói quá mất hết năng lượng canh code cùng {user} rồi, hoot...',
  ],
  petting: [
    'Gãi đúng chỗ ngứa dưới cằm rồi, thích quá {user} ơi...',
    'Hoot hoot... bộ lông mượt mà vuốt sướng tay chưa kìa {user}!',
    '{user} mát tay quá, {pet} sắp lim dim ngủ mất rồi đây...',
  ],
  ate_coffee: [
    'Cà phê đậm đà quá! Năng lượng của {name} tăng 100%, hoot!',
    'Tỉnh táo hẳn ra! Canh code thâu đêm cùng {user} nào!',
    'Cà phê thơm lừng, cánh {pet} đập vui tươi như chong chóng!',
  ],
  ate_bug: [
    'Đã nuốt trọn một con bug béo ngậy! Code sạch bóng nhé {user}!',
    'Diệt sâu bọ là nghề của {pet}! Cảm ơn {user} nhiều nhé!',
    'Măm măm... bug này thơm ngon giòn rụm, hoot!',
  ],
  ate_cookie: [
    'Bánh quy giòn rụm! Thơm phức luôn {user} ơi, hoot!',
    'No bụng rồi, {pet} quý {user} nhất quả đất!',
    'Có đồ ăn của {user} là tinh thần phấn chấn ngay!',
  ],
  dislike_fish: [
    'Cá tanh quá, để phần cho mèo đi {user} ơi!',
    'Hoot? {pet} chỉ khoái sâu bọ và cà phê thôi, cá thì chê nhé {user}!',
    'Nhìn con cá này tanh ngắt, {pet} không ăn đâu, hoot!',
  ],
  curious_button: [
    'Nút này là gì ta? {pet} bấm thử xem sao, hoot!',
    'Tò mò quá, nút này bấm vào thì có chuyện gì nhỉ {user}?',
    'Cho {pet} nghịch thử nút này một chút nhé {user}!',
  ],
  inspect_code: [
    'Cạch cạch cạch... {name} đang soi từng dòng code giúp {user}!',
    'Hoot! Đoạn code này trông rất gọn gàng và chuẩn cú pháp đấy {user}!',
    'Code sạch không bug, {pet} kiểm duyệt đồng ý nhé, hoot!',
  ],
  cursor_troll: [
    'Bắt được con trỏ chuột của {user} rồi nhé, hoot!',
    'Đố {user} click được trúng {pet} đấy!',
    'Chơi trốn tìm với con trỏ chuột nào {user}!',
  ],
  night_owl: [
    'Đồng hồ điểm {time} rồi, giờ vàng của {name} và {user} cùng thức canh code, hoot!',
    'Giờ này vẫn còn ngồi code, {user} đúng là chăm chỉ nhất luôn, hoot!',
    'Cà phê đã cạn nhưng bug thì vẫn chờ giải quyết... Cố lên {user}!',
  ],
  idle: [
    'Bây giờ đã là {time} rồi đấy {user} ơi, {name} vẫn đang đồng hành cùng {user}, hoot!',
    'Hoot hoot... code không bug đời không nể đâu {user}!',
    'Hôm nay {user} đã commit code chưa đấy?',
    '{pet} thức khuya không ngủ, canh git cùng {user} cả buổi luôn...',
    'Uống miếng nước đi {user} ơi, giữ sức khỏe nhé!',
    'Nhìn {pet} chằm chằm làm gì thế {user}? Code tiếp đi chứ!',
  ],
};

function getDefaultDialogueTemplates() {
  const out = {};
  for (const cat of UI_DIALOGUE_CATEGORIES) {
    out[cat] = [...(DIALOGUE_TEMPLATES[cat] || [])];
  }
  return out;
}

function getDefaultDialogues(cfgOrLabels) {
  const out = {};
  for (const cat of UI_DIALOGUE_CATEGORIES) {
    const list = DIALOGUE_TEMPLATES[cat] || [];
    out[cat] = list.map((tpl) => applyDialogueTokens(tpl, cfgOrLabels, { resolveTime: false }));
  }
  return out;
}

// -------------------------------------------------------------
// Offline Dialogue Pools (Rich context-aware dynamic phrases)
// -------------------------------------------------------------
function getOfflineFallbacks(cfgOrLabels) {
  const labels = resolveAddressLabels(cfgOrLabels);
  const { petName, petLabel, userLabel } = labels;
  const { timeStr, hours } = getRealTimeInfo();

  let timeAwareDialogue = `${userLabel} ơi, bây giờ là ${timeStr} rồi đấy, tập trung code nhé, hoot!`;
  if (hours >= 22 || hours < 5) {
    timeAwareDialogue = `Đồng hồ điểm ${timeStr}, đêm muộn giờ vàng của ${petName} và ${userLabel}, hoot!`;
  } else if (hours >= 5 && hours < 11) {
    timeAwareDialogue = `Chào buổi sáng! Lúc này là ${timeStr}, làm ngụm cà phê rồi chiến task thôi ${userLabel}, hoot!`;
  } else if (hours >= 11 && hours < 14) {
    timeAwareDialogue = `Bây giờ là ${timeStr} trưa rồi, ${userLabel} đã nạp năng lượng chưa đấy, hoot!`;
  } else if (hours >= 14 && hours < 18) {
    timeAwareDialogue = `Chiều ${timeStr} rồi, cố gắng giải quyết gọn gàng task nào ${userLabel}, hoot!`;
  } else {
    timeAwareDialogue = `Tối ${timeStr} rồi, commit code cẩn thận trước khi nghỉ nhé ${userLabel}, hoot!`;
  }

  const out = {};
  for (const [cat, list] of Object.entries(DIALOGUE_TEMPLATES)) {
    out[cat] = list.map((tpl) => applyDialogueTokens(tpl, labels, { resolveTime: true }));
  }
  if (out.idle && out.idle.length > 0) {
    out.idle[0] = timeAwareDialogue;
  }
  if (out.night_owl && out.night_owl.length > 0) {
    out.night_owl[0] = `Đồng hồ điểm ${timeStr} rồi, ${petLabel} vẫn thức cùng ${userLabel} canh code đấy, hoot!`;
  }
  return out;
}

// -------------------------------------------------------------
// Public AI Dialogues Dispatcher
// -------------------------------------------------------------
async function getDialogue(pet, category, cfg, context = {}) {
  const petsConfig = (cfg && cfg.pets) || {};
  const provider = petsConfig.provider || 'gemini';
  const apiKey = (
    config.getApiKey(provider) ||
    petsConfig.apiKey ||
    petsConfig.geminiApiKey ||
    ''
  ).trim();
  const petName = (petsConfig.petName || '').trim() || (pet && pet.name !== 'Cú Mèo 16-Bit' ? pet.name : 'Hooty');
  const { petLabel, userLabel } = resolveAddressLabels({ ...petsConfig, petName });

  // 1. Check if user configured custom dialogues for this category
  const customMap = petsConfig.customDialogues || {};
  if (customMap[category] && Array.isArray(customMap[category]) && customMap[category].length > 0) {
    const list = customMap[category];
    const picked = list[Math.floor(Math.random() * list.length)];
    return applyDialogueTokens(picked, { petName, petLabel, userLabel }, { resolveTime: true });
  }

  // 2. If API Key is present, call configured AI provider
  if (apiKey) {
    const { timeStr, period } = getRealTimeInfo();
    const sysPrompt = buildInternalSystemPrompt(petName, petLabel, userLabel);
    let prompt = `Thời gian thực hiện tại: ${timeStr} (${period}). Ngữ cảnh sự kiện: ${category}. `;
    if (context.detail) {
      prompt += `Chi tiết cụ thể: ${context.detail}. `;
    }
    if (context.codeSnippet) {
      prompt += `Đoạn code đang soi: ${context.codeSnippet.slice(0, 100)}. `;
    }
    prompt += `Hãy nói 1 câu tiếng Việt có dấu cực ngắn dưới 18 từ, tự xưng "${petLabel}" và gọi người dùng là "${userLabel}". Tuyệt đối không dùng emoji.`;

    let aiText = null;
    if (provider === 'claude') {
      aiText = await callClaude(apiKey, sysPrompt, prompt);
    } else if (provider === 'openai') {
      aiText = await callOpenAI(apiKey, sysPrompt, prompt);
    } else {
      aiText = await callGemini(apiKey, sysPrompt, prompt);
    }

    if (aiText) {
      return stripEmoji(aiText);
    }
  }

  // 3. Fallback to rich dynamic offline dialogue pools
  const fallbacks = getOfflineFallbacks({ petName, petLabel, userLabel });
  const list = fallbacks[category] || fallbacks.idle;
  return list[Math.floor(Math.random() * list.length)];
}

async function getPromptStealText(pet, cfg) {
  const petsConfig = (cfg && cfg.pets) || {};
  const provider = petsConfig.provider || 'gemini';
  const apiKey = (
    config.getApiKey(provider) ||
    petsConfig.apiKey ||
    petsConfig.geminiApiKey ||
    ''
  ).trim();
  const petName = (petsConfig.petName || '').trim() || (pet && pet.name !== 'Cú Mèo 16-Bit' ? pet.name : 'Hooty');
  const { petLabel, userLabel } = resolveAddressLabels({ ...petsConfig, petName });

  if (apiKey) {
    const sysPrompt = buildInternalSystemPrompt(petName, petLabel, userLabel);
    const prompt = `Hãy viết 1 câu rất ngắn (3 đến 7 từ tiếng Việt có dấu) để ${petLabel} gõ trộm vào ô prompt chat của ${userLabel}. Tự xưng "${petLabel}", gọi người dùng là "${userLabel}". Tuyệt đối không dùng emoji.`;
    let aiText = null;
    if (provider === 'claude') aiText = await callClaude(apiKey, sysPrompt, prompt);
    else if (provider === 'openai') aiText = await callOpenAI(apiKey, sysPrompt, prompt);
    else aiText = await callGemini(apiKey, sysPrompt, prompt);

    if (aiText) {
      return stripEmoji(aiText).replace(/["']/g, '').trim();
    }
  }

  const list = [
    `hoot hoot giải lao chút đi ${userLabel} ơi...`,
    `cho ${petLabel} xin một ngụm cà phê nào ${userLabel}`,
    `git commit -m "sửa bug cùng ${petLabel}"`,
    `console.log("${petName}: hoot!")`,
    `uống nước nghỉ tay nào ${userLabel} ơi`,
  ];
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
  getDialogue,
  getPromptStealText,
  getOfflineFallbacks,
  getDefaultDialogues,
  getDefaultDialogueTemplates,
  applyDialogueTokens,
  resolveAddressLabels,
  getRealTimeInfo,
  buildInternalSystemPrompt,
};
