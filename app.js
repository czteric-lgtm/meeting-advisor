const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const transcriptEl = document.getElementById("transcript");
const suggestionsEl = document.getElementById("suggestions");

let recognition = null;
let recognizing = false;
let fullTranscript = "";

function setStatus(text) {
  statusEl.textContent = text;
}

function setButtonsForRecording(isRecording) {
  startBtn.disabled = isRecording;
  stopBtn.disabled = !isRecording;
}

function updateTranscriptDisplay() {
  if (!fullTranscript.trim()) {
    transcriptEl.textContent = "开始录音后，这里会出现实时转写的会议内容。";
    transcriptEl.classList.add("empty");
  } else {
    transcriptEl.textContent = fullTranscript;
    transcriptEl.classList.remove("empty");
  }
}

function addSuggestion({ label, text, meta }) {
  const li = document.createElement("li");
  li.className = "suggestion-item";

  const labelRow = document.createElement("div");
  labelRow.className = "suggestion-label";
  const dot = document.createElement("span");
  dot.className = "suggestion-label-dot";
  const labelText = document.createElement("span");
  labelText.textContent = label;
  labelRow.appendChild(dot);
  labelRow.appendChild(labelText);

  const p = document.createElement("p");
  p.className = "suggestion-text";
  p.textContent = text;

  li.appendChild(labelRow);
  li.appendChild(p);

  if (meta) {
    const metaP = document.createElement("p");
    metaP.className = "suggestion-meta";
    metaP.textContent = meta;
    li.appendChild(metaP);
  }

  suggestionsEl.insertBefore(li, suggestionsEl.firstChild);

  while (suggestionsEl.children.length > 4) {
    suggestionsEl.removeChild(suggestionsEl.lastChild);
  }
}

function analyzeAndSuggest(latestChunk) {
  const recent = fullTranscript.slice(-300);
  const lower = recent.toLowerCase();

  if (/价格|报价|预算|budget|price/.test(recent)) {
    addSuggestion({
      label: "价格节点",
      text: "先让对方把预算和决策流程说清楚，再给出具体方案或数字。",
      meta: "可问：“除了预算之外，还有什么会影响你们这次的决定？”",
    });
  } else if (/担心|顾虑|风险|worry|concern|risk/.test(recent)) {
    addSuggestion({
      label: "处理顾虑",
      text: "先复述对方的担心，确认理解一致，再解释你的解决方案。",
      meta: "模板：先说“我理解你在担心……”，再给出应对方式。",
    });
  } else if (/时间|太忙|没空|no time|busy/.test(recent)) {
    addSuggestion({
      label: "时间紧张",
      text: "直接帮对方简化决策：给出 1 个默认推荐，再给 1 个备选。",
      meta: "结尾记得约好下一步的具体时间和形式。",
    });
  } else if (lower.includes("试用") || lower.includes("demo") || lower.includes("体验")) {
    addSuggestion({
      label: "试用机会",
      text: "试用前先确认清楚成功标准：试用结束你希望对方看到什么结果？",
      meta: "可问：“对你来说，这次试用要达到什么效果才算值得上线？”",
    });
  } else if (latestChunk.split(/\s+/).length > 12) {
    addSuggestion({
      label: "控制说话时长",
      text: "你说得有点多了，可以抛一个开放式问题，让对方多讲讲。",
      meta: "例如：“听到这儿，你有什么疑问或担心吗？”",
    });
  }
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setStatus("当前浏览器不支持 Web Speech API，无法本地实时转写。");
    updateTranscriptDisplay();
    return null;
  }

  const rec = new SpeechRecognition();
  rec.lang = "zh-CN";
  rec.continuous = true;
  rec.interimResults = true;

  rec.onstart = () => {
    recognizing = true;
    setStatus("录音中，正在实时转写……");
  };

  rec.onerror = (event) => {
    console.error("Speech recognition error:", event);
    setStatus("语音识别出错：" + (event.error || "未知错误"));
  };

  rec.onend = () => {
    recognizing = false;
    setStatus("录音已停止");
    setButtonsForRecording(false);
  };

  rec.onresult = (event) => {
    let interimTranscript = "";
    let finalChunk = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        const text = res[0].transcript.trim();
        fullTranscript += (fullTranscript ? "\n" : "") + text;
        finalChunk = text;
      } else {
        interimTranscript += res[0].transcript;
      }
    }

    updateTranscriptDisplay();

    if (finalChunk) {
      analyzeAndSuggest(finalChunk);
    }
  };

  return rec;
}

function ensureMicPermission() {
  return navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      stream.getTracks().forEach((t) => t.stop());
      return true;
    })
    .catch((err) => {
      console.error("Microphone permission error:", err);
      setStatus("无法访问麦克风，请检查浏览器权限设置。");
      throw err;
    });
}

async function startRecording() {
  try {
    setStatus("正在请求麦克风权限…");
    await ensureMicPermission();

    if (!recognition) {
      recognition = initSpeechRecognition();
    }

    if (!recognition) {
      setStatus("浏览器不支持本地语音识别，可以先记录音频，后续接入云端识别服务。");
      return;
    }

    fullTranscript = "";
    updateTranscriptDisplay();
    suggestionsEl.innerHTML = "";

    recognition.start();
    setButtonsForRecording(true);
  } catch {
    setButtonsForRecording(false);
  }
}

function stopRecording() {
  if (recognition && recognizing) {
    recognition.stop();
    recognizing = false;
  }
  setButtonsForRecording(false);
}

startBtn.addEventListener("click", () => {
  startRecording();
});

stopBtn.addEventListener("click", () => {
  stopRecording();
});

updateTranscriptDisplay();
setStatus("麦克风未启用");

