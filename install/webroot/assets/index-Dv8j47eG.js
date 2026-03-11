var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a;
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
let callbackCounter = 0;
function getUniqueCallbackName(prefix) {
  return `${prefix}_callback_${Date.now()}_${callbackCounter++}`;
}
function exec$2(command, options) {
  if (typeof options === "undefined") {
    options = {};
  }
  return new Promise((resolve, reject) => {
    const callbackFuncName = getUniqueCallbackName("exec");
    window[callbackFuncName] = (errno, stdout, stderr) => {
      resolve({ errno, stdout, stderr });
      cleanup(callbackFuncName);
    };
    function cleanup(successName) {
      delete window[successName];
    }
    try {
      ksu.exec(command, JSON.stringify(options), callbackFuncName);
    } catch (error) {
      reject(error);
      cleanup(callbackFuncName);
    }
  });
}
function Stdio() {
  this.listeners = {};
}
Stdio.prototype.on = function(event, listener) {
  if (!this.listeners[event]) {
    this.listeners[event] = [];
  }
  this.listeners[event].push(listener);
};
Stdio.prototype.emit = function(event, ...args) {
  if (this.listeners[event]) {
    this.listeners[event].forEach((listener) => listener(...args));
  }
};
function ChildProcess() {
  this.listeners = {};
  this.stdin = new Stdio();
  this.stdout = new Stdio();
  this.stderr = new Stdio();
}
ChildProcess.prototype.on = function(event, listener) {
  if (!this.listeners[event]) {
    this.listeners[event] = [];
  }
  this.listeners[event].push(listener);
};
ChildProcess.prototype.emit = function(event, ...args) {
  if (this.listeners[event]) {
    this.listeners[event].forEach((listener) => listener(...args));
  }
};
function spawn$2(command, args, options) {
  if (typeof args === "undefined") {
    args = [];
  } else if (!(args instanceof Array)) {
    options = args;
  }
  if (typeof options === "undefined") {
    options = {};
  }
  const child = new ChildProcess();
  const childCallbackName = getUniqueCallbackName("spawn");
  window[childCallbackName] = child;
  function cleanup(name) {
    delete window[name];
  }
  child.on("exit", (code) => {
    cleanup(childCallbackName);
  });
  try {
    ksu.spawn(
      command,
      JSON.stringify(args),
      JSON.stringify(options),
      childCallbackName
    );
  } catch (error) {
    child.emit("error", error);
    cleanup(childCallbackName);
  }
  return child;
}
function exit() {
  ksu.exit();
}
function checkKSUEnvironment() {
  return !!(typeof ksu !== "undefined");
}
function buildCommand(command, args = []) {
  return args.length ? [command, ...args].map((a) => a.includes(" ") ? `"${a}"` : a).join(" ") : command;
}
async function exec$1(command, args = []) {
  if (!checkKSUEnvironment()) {
    return { errno: -1, stdout: "", stderr: "KernelSU API not available" };
  }
  const fullCmd = buildCommand(command, args);
  return await exec$2(fullCmd);
}
function spawn$1(command, args = [], options = {}) {
  const { onStdout, onStderr, onExit, onError } = options;
  const abortController = new AbortController();
  if (!checkKSUEnvironment()) {
    abortController.abort("KernelSU API not available");
    onError == null ? void 0 : onError("KernelSU API not available");
    return abortController;
  }
  const fullCmd = buildCommand(command, args);
  const child = spawn$2(fullCmd);
  let stopped = false;
  const stop = () => {
    if (!stopped) {
      stopped = true;
      exit();
    }
  };
  abortController.signal.addEventListener("abort", () => {
    stop();
    onError == null ? void 0 : onError(abortController.signal.reason);
  });
  child.stdout.on("data", (data) => {
    if (!stopped) {
      onStdout == null ? void 0 : onStdout(data);
    }
  });
  child.stderr.on("data", (data) => {
    if (!stopped) {
      onStderr == null ? void 0 : onStderr(data);
    }
  });
  child.on("exit", (code) => {
    stopped = true;
    onExit == null ? void 0 : onExit(code);
  });
  child.on("error", (err) => {
    stopped = true;
    onError == null ? void 0 : onError(err);
  });
  return abortController;
}
const tmpDir = "/dev/.vr25/acc";
const binDir = "/data/adb/vr25/bin";
const execDir = "/data/adb/vr25/acc";
const dataDir = "/data/adb/vr25/acc-data";
const logDir = "/data/adb/vr25/acc-data/logs";
const logFile = "/data/adb/vr25/acc-data/logs/webview-acc.log";
const defaultProfilePath = execDir + "/default-config.txt";
const startupProfilePath = dataDir + "/config.txt";
const forceChargingPath = tmpDir + "/.acc-f-config";
const localStorageKey = {
  debugModeToggle: "debugModeEnabled",
  localAccPath: "accPath"
};
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2["DEBUG"] = "DEBUG";
  LogLevel2["INFO"] = "INFO";
  LogLevel2["WARN"] = "WARN";
  LogLevel2["ERROR"] = "ERROR";
  return LogLevel2;
})(LogLevel || {});
let globalAccPath = "";
let globalAccVersion = "";
let globalAccProfilePath = "";
let globalLogLevel = "INFO";
function setAccPath(path) {
  globalAccPath = path;
}
function getAccPath() {
  return globalAccPath;
}
function setAccVersion(version) {
  globalAccVersion = version;
}
function getAccVersion() {
  return globalAccVersion;
}
function setAccProfilePath(path) {
  globalAccProfilePath = path;
}
function getAccProfilePath() {
  return globalAccProfilePath;
}
function setLogLevel(level) {
  globalLogLevel = level;
}
function getLogLevel() {
  return globalLogLevel;
}
const logLevels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
var notificationListener = () => {
};
var consoleListener = (message) => {
  console.error(message);
};
function setNotificationListener(printLog) {
  notificationListener = printLog;
}
function setConsoleListener(printLog) {
  consoleListener = printLog;
}
function printToNotify(message, level = LogLevel.INFO) {
  if (notificationListener) {
    notificationListener(message, level);
  }
  printToConsole(message, level);
}
function printToConsole(message, level = LogLevel.INFO) {
  if (consoleListener && shouldLog(level)) {
    consoleListener(message, level);
  }
  printToFile(message, level);
}
async function printToFile(message, level = LogLevel.INFO) {
  if (!shouldLog(level)) {
    return false;
  }
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}`;
  const escapedEntry = logEntry.replace(/'/g, "'\\''");
  const result = await exec$1(`printf '%s\\n' '${escapedEntry}' >> "${logFile}"`);
  if (result.errno !== 0) {
    consoleListener(`Failed to write log: ${result.stderr}`, LogLevel.ERROR);
    return false;
  }
  return true;
}
async function exec(command, args = []) {
  const fullCmd = buildCommand(command, args);
  printToConsole(`[exec] ${fullCmd}`, LogLevel.DEBUG);
  return await exec$1(fullCmd);
}
function spawn(command, args = [], options = {}) {
  const fullCmd = buildCommand(command, args);
  printToConsole(`[exec] ${fullCmd}`, LogLevel.DEBUG);
  return spawn$1(command, args, options);
}
function shouldLog(level) {
  const currentLevel = logLevels.indexOf(getLogLevel());
  const targetLevel = logLevels.indexOf(level);
  if (targetLevel === -1) return false;
  return targetLevel >= currentLevel;
}
async function initLogDirectory() {
  return exec$1(`mkdir -p "${logDir}" && chmod 755 "${logDir}"`);
}
async function checkId() {
  return exec("id");
}
async function showReadme() {
  return exec("cat", [`${dataDir}/README.md`]);
}
async function createProfileDir() {
  return exec("mkdir", ["-p", `${dataDir}/profiles`]);
}
async function checkAccdProfile$1() {
  return exec(`ps -ef | awk '/[a]ccd\\.sh/{sub(/.*accd\\.sh[ \\t]*/,"");if($0)print;f=1} END{exit!f}'`);
}
async function checkBatteryCapacity() {
  return exec(`cat /sys/class/power_supply/*/charge_full_design`);
}
async function loadProfilesPath() {
  return exec(`[ -d "${dataDir}/profiles" ] && find "${dataDir}/profiles" -maxdepth 1 -type f`);
}
async function deleteProfile(profilePath) {
  return exec("rm", [profilePath]);
}
async function copyProfile(sourcePath, destPath) {
  return exec("cp", [sourcePath, destPath]);
}
async function clearLogs() {
  return exec$1(`: > "${logFile}"`);
}
const ACC_PATHS = [
  "acc",
  `${execDir}/acc`,
  "/dev/acc",
  "/system/bin/acc",
  `${binDir}/acc`
];
async function initAccPath() {
  const localAccPath = localStorage.getItem(localStorageKey.localAccPath);
  if (typeof localAccPath !== "undefined" && localAccPath) {
    ACC_PATHS.unshift(localAccPath);
  }
  if (typeof window.ACC !== "undefined" && window.ACC && window.ACC.accPath) {
    ACC_PATHS.unshift(window.ACC.accPath);
  }
  for (const path of ACC_PATHS) {
    const result = await exec(path, ["-v"]);
    if (result.errno === 0) {
      printToConsole(`ACC found at ${path}, version: ${result.stdout}`);
      setAccPath(path);
      localStorage.setItem(localStorageKey.localAccPath, path);
      setAccVersion(result.stdout.trim());
      return true;
    }
  }
  return false;
}
async function execAcc(args = []) {
  if (!getAccPath()) {
    return { errno: -1, stdout: "", stderr: "ACC path not initialized" };
  }
  return exec(getAccPath(), args);
}
function spawnAcc(args = [], options = {}) {
  return spawn(getAccPath(), args, options);
}
async function printHealth(capacity) {
  return execAcc(["-H", (capacity == null ? void 0 : capacity.trim()) || ""]);
}
function disableChargingSpawn(input, options = {}) {
  return spawnAcc(["-d", input.trim()], options);
}
function enableChargingSpawn(input, options = {}) {
  return spawnAcc(["-e", input.trim()], options);
}
function forceChargingSpawn(input = "", options = {}) {
  return spawnAcc(["-f", input.trim()], options);
}
async function resetStats() {
  return execAcc(["-R"]);
}
function exportLogsSpawn(options = {}) {
  return spawnAcc(["-le"], options);
}
function printVersionCodeSpawn(options = {}) {
  return spawnAcc(["-u", "-c", "-n"], options);
}
function upgradeSpawn(options = {}) {
  return spawnAcc(["-u", "-f"], options);
}
function uninstallSpawn(options = {}) {
  return spawn("sh", ["-c", `echo yes | "${getAccPath()}" -U`], options);
}
async function rollback(input) {
  return execAcc(["-b", (input == null ? void 0 : input.trim()) || ""]);
}
async function loadingSwitch() {
  return execAcc(["-s", "s:"]);
}
function testSwitch(options = {}) {
  return spawnAcc(["-t"], options);
}
function $$1(id) {
  return document.getElementById(id);
}
function setOnClick(id, handler) {
  const element = $$1(id);
  element == null ? void 0 : element.addEventListener("click", () => handler(element));
}
async function activateWithAbort(button, onActivate) {
  if (button._abortController) {
    button._abortController.abort();
    button._abortController = null;
    button.classList.remove("activate");
  } else {
    const controller = await onActivate(button);
    if (controller) {
      button._abortController = controller;
      button.classList.add("activate");
    }
  }
}
function setButtonLoading(button, loading = true) {
  if (!button) return;
  if (loading) {
    button.classList.add("loading");
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }
  } else {
    button.classList.remove("loading");
    if (button instanceof HTMLButtonElement) {
      button.disabled = false;
    }
  }
}
function updateStatusClass(element, value = "") {
  if (!element) return;
  element.classList.remove("status-good", "status-bad");
  if (value == true) {
    element.classList.add("status-good");
  } else if (value == false) {
    element.classList.add("status-bad");
  }
}
function parseConfig(config) {
  const configMap = {};
  const configLines = config.split("\n").filter((line) => line.trim() && line.includes("="));
  configLines.forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      configMap[match[1].trim()] = match[2].replaceAll('"', "").trim();
    }
  });
  return configMap;
}
async function checkAccdProfile(profilePanel) {
  var _a2;
  const configResult = await checkAccdProfile$1();
  if (configResult.errno === 0) {
    printToConsole(configResult.stdout, LogLevel.DEBUG);
    const currentProfile = ((_a2 = configResult.stdout) == null ? void 0 : _a2.trim()) || startupProfilePath;
    setProfilePanel(profilePanel, currentProfile);
    setAccProfilePath(currentProfile);
  } else {
    setProfilePanel(profilePanel, "");
    setAccProfilePath("");
  }
}
function setProfilePanel(panelName, path) {
  const el = $$1(panelName);
  if (el) {
    let displayName;
    if (!path) {
      displayName = "accd: Not Running";
    } else if (path === forceChargingPath) {
      displayName = "accd: Force Charging";
    } else if (path === startupProfilePath) {
      displayName = "accd profile:Startup";
    } else {
      displayName = "accd profile:" + (path.split("/").pop() || path);
    }
    el.textContent = displayName;
  }
}
function isForceCharging(path) {
  return path.includes(forceChargingPath);
}
async function execAcca(args = []) {
  if (!getAccPath()) {
    return { errno: -1, stdout: "", stderr: "ACC path not initialized" };
  }
  return exec(getAccPath() + "a", args);
}
function getAccaPAth() {
  return getAccPath() + "a";
}
async function setConfig(input) {
  return execAcca([getAccProfilePath(), "-s", input.trim()]);
}
async function printConfig(profilePath) {
  return execAcca([profilePath, "-s", "p"]);
}
async function showInfo() {
  return execAcca([getAccProfilePath(), "-i"]);
}
function restartAccdSpawn(options = {}) {
  return spawn(getAccaPAth(), [getAccProfilePath(), "-D", "restart"], options);
}
function stopAccdSpawn(options = {}) {
  return spawn(getAccaPAth(), ["-D", "stop"], options);
}
function getElementById$1(id) {
  return document.getElementById(id);
}
function ensurePromptDom() {
  if (getElementById$1("custom-prompt-mask") && getElementById$1("custom-prompt-dialog")) return;
  const mask = document.createElement("div");
  mask.id = "custom-prompt-mask";
  Object.assign(mask.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.4)",
    display: "none",
    zIndex: "9998"
  });
  const dialog = document.createElement("div");
  dialog.id = "custom-prompt-dialog";
  Object.assign(dialog.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    background: "#1e1e1e",
    color: "#fff",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    width: "90%",
    maxWidth: "420px",
    zIndex: "9999"
  });
  const messageEl = document.createElement("div");
  messageEl.id = "cp-message";
  Object.assign(messageEl.style, { marginBottom: "12px", fontSize: "14px", lineHeight: "1.4" });
  const inputEl = document.createElement("input");
  inputEl.id = "cp-input";
  inputEl.type = "text";
  Object.assign(inputEl.style, {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #444",
    background: "#121212",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box"
  });
  const buttonContainer = document.createElement("div");
  Object.assign(buttonContainer.style, { display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "14px" });
  const cancelBtn = document.createElement("button");
  cancelBtn.id = "cp-cancel";
  cancelBtn.textContent = "Cancel";
  Object.assign(cancelBtn.style, {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "1px solid #555",
    background: "#2b2b2b",
    color: "#ddd",
    cursor: "pointer"
  });
  const okBtn = document.createElement("button");
  okBtn.id = "cp-ok";
  okBtn.textContent = "OK";
  Object.assign(okBtn.style, {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "1px solid #0a7",
    background: "#0a7",
    color: "#fff",
    cursor: "pointer"
  });
  buttonContainer.append(cancelBtn, okBtn);
  dialog.append(messageEl, inputEl, buttonContainer);
  document.body.appendChild(mask);
  document.body.appendChild(dialog);
}
function customPrompt(message, defaultValue = "") {
  ensurePromptDom();
  const mask = getElementById$1("custom-prompt-mask");
  const dialog = getElementById$1("custom-prompt-dialog");
  const msgEl = dialog.querySelector("#cp-message");
  const inputEl = dialog.querySelector("#cp-input");
  const okBtn = dialog.querySelector("#cp-ok");
  const cancelBtn = dialog.querySelector("#cp-cancel");
  msgEl.textContent = message || "";
  inputEl.value = defaultValue || "";
  return new Promise((resolve) => {
    function cleanup() {
      mask.style.display = "none";
      dialog.style.display = "none";
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKey);
      mask.removeEventListener("click", onMaskClick);
    }
    function onOk() {
      const v2 = inputEl.value;
      cleanup();
      resolve(v2);
    }
    function onCancel() {
      cleanup();
      resolve(null);
    }
    function onKey(e) {
      if (e.key === "Enter") onOk();
      if (e.key === "Escape") onCancel();
    }
    function onMaskClick(e) {
      if (e.target === mask) onCancel();
    }
    mask.style.display = "block";
    dialog.style.display = "block";
    setTimeout(() => inputEl.focus(), 0);
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey);
    mask.addEventListener("click", onMaskClick);
  });
}
function getElementById(id) {
  return document.getElementById(id);
}
function ensureConfirmDom() {
  if (getElementById("custom-confirm-mask") && getElementById("custom-confirm-dialog")) return;
  const mask = document.createElement("div");
  mask.id = "custom-confirm-mask";
  Object.assign(mask.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.4)",
    display: "none",
    zIndex: "9998"
  });
  const dialog = document.createElement("div");
  dialog.id = "custom-confirm-dialog";
  Object.assign(dialog.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    background: "#1e1e1e",
    color: "#fff",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    width: "90%",
    maxWidth: "420px",
    zIndex: "9999"
  });
  const messageEl = document.createElement("div");
  messageEl.id = "cc-message";
  Object.assign(messageEl.style, { marginBottom: "16px", fontSize: "14px", lineHeight: "1.5" });
  const buttonContainer = document.createElement("div");
  Object.assign(buttonContainer.style, { display: "flex", gap: "8px", justifyContent: "flex-end" });
  const cancelBtn = document.createElement("button");
  cancelBtn.id = "cc-cancel";
  cancelBtn.textContent = "Cancel";
  Object.assign(cancelBtn.style, {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid #555",
    background: "#2b2b2b",
    color: "#ddd",
    cursor: "pointer",
    fontSize: "14px"
  });
  const okBtn = document.createElement("button");
  okBtn.id = "cc-ok";
  okBtn.textContent = "OK";
  Object.assign(okBtn.style, {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid #0a7",
    background: "#0a7",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px"
  });
  buttonContainer.append(cancelBtn, okBtn);
  dialog.append(messageEl, buttonContainer);
  document.body.appendChild(mask);
  document.body.appendChild(dialog);
}
async function customConfirm(message) {
  ensureConfirmDom();
  const mask = getElementById("custom-confirm-mask");
  const dialog = getElementById("custom-confirm-dialog");
  const msgEl = dialog.querySelector("#cc-message");
  const okBtn = dialog.querySelector("#cc-ok");
  const cancelBtn = dialog.querySelector("#cc-cancel");
  msgEl.textContent = message || "";
  return new Promise((resolve) => {
    function cleanup() {
      mask.style.display = "none";
      dialog.style.display = "none";
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKey);
      mask.removeEventListener("click", onMaskClick);
    }
    function onOk() {
      cleanup();
      resolve(true);
    }
    function onCancel() {
      cleanup();
      resolve(false);
    }
    function onKey(e) {
      if (e.key === "Enter") onOk();
      if (e.key === "Escape") onCancel();
    }
    function onMaskClick(e) {
      if (e.target === mask) onCancel();
    }
    mask.style.display = "block";
    dialog.style.display = "block";
    okBtn.focus();
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey);
    mask.addEventListener("click", onMaskClick);
  });
}
const elements = {
  batteryLevel: () => $$1("battery-level"),
  batteryBar: () => $$1("battery-bar"),
  chargingStatus: () => $$1("charging-status"),
  currentLimit: () => $$1("current-limit"),
  temperature: () => $$1("temperature"),
  powerDisplay: () => $$1("power-display"),
  chargeType: () => $$1("charge-type"),
  realLevel: () => $$1("real-level")
};
let ProfilePanelName$2 = "current-profile-status";
function setTextContent(getElement, value) {
  const el = getElement();
  if (el) el.textContent = value;
}
function initializeStatusTab() {
  setOnClick("battery-health-btn", handleBatteryHealth);
  setOnClick("test-switches-btn", handleTestSwitches);
  setOnClick("disable-charging-btn", handleDisableCharging);
  setOnClick("enable-charging-btn", handleEnableCharging);
  setOnClick("force-charge-btn", handleForceCharge);
  setOnClick("reset-battery-stats-btn", handleResetBatteryStats);
  setOnClick("refresh-btn", handleRefresh);
  setOnClick("restart-btn", handleRestart);
  setOnClick("stop-btn", handleStop);
  setOnClick("detailed-info-btn", handleDetailedInfo);
  setOnClick("run-test-switches", handleRunTestSwitches);
  setOnClick("stop-test-switches", handleStopTestSwitches);
  setOnClick("close-test-switches", handleCloseTestSwitches);
}
async function refreshStatus() {
  if (!getAccPath()) {
    printToNotify("ACC not available", LogLevel.ERROR);
    return;
  }
  setTimeout(async () => {
    try {
      await checkAccdProfile(ProfilePanelName$2);
      const result = await showInfo();
      const status = parseBatteryInfo(result.stdout);
      updateBatteryLevel(status);
      setTextContent(elements.chargingStatus, status.status || "-");
      setTextContent(elements.currentLimit, status.current_now || "-");
      setTextContent(elements.temperature, status.temp || "-");
      setTextContent(elements.powerDisplay, status.power_now || "-");
      setTextContent(elements.chargeType, status.charge_type || "N/A");
      setTextContent(elements.realLevel, status.real_level || "N/A");
    } catch (e) {
      printToConsole(`Status load failed: ${e}`, LogLevel.ERROR);
    }
  }, 0);
}
function parseBatteryInfo(output) {
  const status = {};
  const lines = output.split("\n").filter((line) => line.trim());
  for (const line of lines) {
    const m2 = line.match(/^\s*([a-zA-Z0-9_\-]+)\s*[:=]\s*(.+)$/);
    if (m2) {
      status[m2[1]] = m2[2].trim();
      continue;
    }
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      status[parts[0]] = parts.slice(1).join(" ");
    }
  }
  return status;
}
function updateBatteryLevel(status) {
  const raw = status.level || status.capacity || "0";
  const batteryLevel = raw.toString().replace("%", "").replace(/[^0-9]/g, "") || "0";
  setTextContent(elements.batteryLevel, batteryLevel + "%");
  const batteryBar = elements.batteryBar();
  if (batteryBar) {
    batteryBar.style.setProperty("--battery-level", batteryLevel + "%");
  }
}
function handleRefresh(button) {
  activateWithAbort(
    button,
    async (btn) => {
      btn.textContent = "Refreshing";
      printToNotify("Auto refresh started (10s interval)");
      const controller = new AbortController();
      const intervalId = setInterval(refreshStatus, 1e4);
      controller.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        btn.textContent = "Refresh Status";
        printToNotify("Auto refresh stopped");
      });
      return controller;
    }
  );
}
async function handleBatteryHealth(button) {
  let resutlt = await checkBatteryCapacity();
  let capacity = "";
  if (resutlt.errno === 0 && resutlt.stdout) {
    capacity = (Number(resutlt.stdout) / 1e3).toString();
  }
  const mAh = await customPrompt("Enter battery capacity in mAh (leave empty to auto-detect):", capacity);
  if (mAh !== null) {
    setButtonLoading(button, true);
    printHealth(mAh).then((result) => {
      if (result.errno !== 0) {
        printToConsole(`acc -H error:
${result.stderr}`);
        return;
      }
      const healthValue = result.stdout.trim();
      const span = $$1("battery-health");
      if (span) {
        span.textContent = healthValue;
        updateStatusClass(span, true);
      }
    }).catch((e) => {
      printToConsole(`Battery health check failed: ${e}`, LogLevel.ERROR);
    }).finally(() => {
      setButtonLoading(button, false);
    });
  }
}
async function handleDisableCharging(button) {
  let enableCharging = $$1("enable-charging-btn");
  let forceCharging = $$1("force-charge-btn");
  activateWithAbort(
    button,
    async (btn) => {
      const input = await customPrompt("Disable charging until battery level reaches (% or mV) or for duration (e.g., 1h, 30m):", "70%");
      if (!input || !input.trim()) return null;
      const content = `Disable until ${input.trim()}`;
      if (enableCharging) enableCharging.style.visibility = "hidden";
      if (forceCharging) forceCharging.style.visibility = "hidden";
      btn.textContent = content;
      printToNotify(content);
      const abortController = disableChargingSpawn(input, {
        onStdout: (data) => printToConsole(data),
        onStderr: (data) => printToConsole(data, LogLevel.ERROR),
        onExit: (code) => {
          printToConsole(`Disable charging exited with code: ${code}`);
        },
        onError: (err) => {
          printToNotify(`Disable charging error: ${err}`, LogLevel.ERROR);
        }
      });
      abortController.signal.addEventListener("abort", () => {
        if (btn._abortController === abortController) {
          btn._abortController = null;
          btn.textContent = "Disable charging";
          if (enableCharging) enableCharging.style.visibility = "visible";
          if (forceCharging) forceCharging.style.visibility = "visible";
          printToNotify("Disable charging stopped");
        }
      });
      return abortController;
    }
  );
}
async function handleEnableCharging(button) {
  let disableCharging = $$1("disable-charging-btn");
  let forceCharging = $$1("force-charge-btn");
  activateWithAbort(
    button,
    async (btn) => {
      const input = await customPrompt("Enable charging to battery level (%) or for duration (e.g., 30m):", "80%");
      if (!input || !input.trim()) return null;
      const content = `Enable until ${input.trim()}`;
      if (disableCharging) disableCharging.style.visibility = "hidden";
      if (forceCharging) forceCharging.style.visibility = "hidden";
      btn.textContent = content;
      printToNotify(content);
      const abortController = enableChargingSpawn(input, {
        onStdout: (data) => printToConsole(data),
        onStderr: (data) => printToConsole(data, LogLevel.ERROR),
        onExit: (code) => {
          printToConsole(`Enable charging exited with code: ${code}`);
        },
        onError: (err) => {
          printToNotify(`Enable charging error: ${err}`, LogLevel.ERROR);
        }
      });
      abortController.signal.addEventListener("abort", () => {
        if (btn._abortController === abortController) {
          btn._abortController = null;
          btn.textContent = "Enable charging";
          if (disableCharging) disableCharging.style.visibility = "visible";
          if (forceCharging) forceCharging.style.visibility = "visible";
          printToNotify("Enable charging stopped");
        }
      });
      return abortController;
    }
  );
}
async function handleForceCharge(button) {
  let disableCharging = $$1("disable-charging-btn");
  let enableCharging = $$1("enable-charging-btn");
  let restartBtn = $$1("restart-btn");
  activateWithAbort(
    button,
    async (btn) => {
      const input = await customPrompt("Force charge to battery level (%) or leave empty for 100%:", "100");
      if (input === null) return null;
      const content = `Force charging to ${input.trim() || "100%"}`;
      if (disableCharging) disableCharging.style.visibility = "hidden";
      if (enableCharging) enableCharging.style.visibility = "hidden";
      if (restartBtn) restartBtn.style.visibility = "hidden";
      btn.textContent = content;
      printToNotify(content);
      const abortController = forceChargingSpawn(input, {
        onStdout: (data) => printToConsole(data),
        onStderr: (data) => printToConsole(data, LogLevel.ERROR),
        onExit: (code) => {
          if (code === 0) {
            printToNotify("Force charge start");
          }
          checkAccdProfile(ProfilePanelName$2);
        },
        onError: (err) => {
          printToNotify(`Force charge error: ${err}`, LogLevel.ERROR);
        }
      });
      abortController.signal.addEventListener("abort", () => {
        if (btn._abortController === abortController) {
          btn._abortController = null;
          btn.textContent = "Force charge";
          if (disableCharging) disableCharging.style.visibility = "visible";
          if (enableCharging) enableCharging.style.visibility = "visible";
          if (restartBtn) restartBtn.style.visibility = "visible";
          printToNotify("Force charge stopped");
          setAccProfilePath("");
          restartAccdSpawn({
            onExit: () => checkAccdProfile(ProfilePanelName$2)
          });
        }
      });
      return abortController;
    }
  );
}
function handleRestart(button) {
  setButtonLoading(button, true);
  restartAccdSpawn({
    onExit: (code) => {
      printToConsole(`Restart accd exited with code: ${code}`);
      if (code === 0) ;
      else {
        printToNotify(`accd restart failed with code: ${code}`, LogLevel.ERROR);
      }
      setButtonLoading(button, false);
      checkAccdProfile(ProfilePanelName$2);
    }
  });
}
function handleStop(button) {
  setButtonLoading(button, true);
  stopAccdSpawn({
    onExit: (code) => {
      printToConsole(`Stop accd exited with code: ${code}`);
      if (code === 0) ;
      else {
        printToNotify(`accd stop failed with code: ${code}`, LogLevel.ERROR);
      }
      setButtonLoading(button, false);
      checkAccdProfile(ProfilePanelName$2);
    }
  });
}
async function handleDetailedInfo(button) {
  const panel = $$1("detailed-info-panel");
  if (panel && (panel.style.display === "none" || !panel.style.display)) {
    try {
      const result = await showInfo();
      const info = (result == null ? void 0 : result.stdout) || "";
      const content = $$1("detailed-info-content");
      if (content) content.textContent = info;
      panel.style.display = "block";
      button.textContent = "Hide Detailed Info";
    } catch (e) {
      printToNotify(`Failed to get detailed info: ${e}`, LogLevel.ERROR);
    }
  } else if (panel) {
    panel.style.display = "none";
    button.textContent = "Detailed Battery Info";
  }
}
async function handleResetBatteryStats() {
  if (await customConfirm("Are you sure you want to reset battery statistics?")) {
    try {
      const result = await resetStats();
      const resultStr = (result == null ? void 0 : result.stdout) || "";
      if (resultStr.trim() === "✅") {
        printToNotify("Battery statistics reset successfully");
      } else {
        printToNotify("Battery statistics reset: " + resultStr.trim());
      }
    } catch (e) {
      printToNotify(`Reset battery stats failed: ${e}`, LogLevel.ERROR);
    }
  }
}
function handleTestSwitches() {
  const modal = $$1("test-switches-modal");
  const output = $$1("test-switches-output");
  if (modal) modal.style.display = "block";
  if (output) output.textContent = 'Click "Run Test" to start testing charging switches...\n\nThis may take several minutes. Ensure charger is plugged in.\n';
}
function handleCloseTestSwitches() {
  const stopBtn = $$1("stop-test-switches");
  if (stopBtn) handleStopTestSwitches(stopBtn);
  const modal = $$1("test-switches-modal");
  if (modal) modal.style.display = "none";
}
let testSwitchesAbortController = null;
function handleRunTestSwitches(runBtn) {
  const stopBtn = $$1("stop-test-switches");
  const outputElement = $$1("test-switches-output");
  if (stopBtn) stopBtn.style.display = "inline-block";
  runBtn.style.display = "none";
  if (outputElement) {
    testSwitchesAbortController = testSwitch({
      onStdout: (data) => {
        outputElement.textContent += data + "\n\n";
        outputElement.scrollTop = outputElement.scrollHeight;
      },
      onStderr: (data) => {
        outputElement.textContent += data + "\n\n";
        outputElement.scrollTop = outputElement.scrollHeight;
      },
      onExit: (code) => {
        outputElement.textContent += `

Test completed with exit code: ${code}`;
        if (stopBtn) stopBtn.style.display = "none";
        runBtn.style.display = "";
        testSwitchesAbortController = null;
      },
      onError: (err) => {
        outputElement.textContent += `

Error: ${err}`;
        if (stopBtn) stopBtn.style.display = "none";
        runBtn.style.display = "";
        testSwitchesAbortController = null;
      }
    });
  }
}
function handleStopTestSwitches(stopBtn) {
  const runBtn = $$1("run-test-switches");
  if (runBtn) runBtn.style.display = "";
  stopBtn.style.display = "none";
  if (testSwitchesAbortController) {
    testSwitchesAbortController.abort();
    testSwitchesAbortController = null;
  }
  const outputElement = $$1("test-switches-output");
  if (outputElement) {
    outputElement.textContent += `

Test cancelled`;
  }
}
function handleExportLogs(button) {
  setButtonLoading(button, true);
  try {
    exportLogsSpawn({
      onExit: (code) => {
        printToNotify(`Logs exported to /sdcard/Download/acc-logs-*.tgz with code: ${code}`);
        setButtonLoading(button, false);
      }
    });
  } catch (e) {
    printToConsole(`Logs exported failed: ${e}`, LogLevel.ERROR);
  }
}
async function handleClearLogs(button) {
  setButtonLoading(button, true);
  try {
    const result = await clearLogs();
    if (result.errno === 0) {
      printToNotify("Clear logs", LogLevel.INFO);
    } else {
      printToNotify(`Clear logs failed: ${result.stderr}`, LogLevel.ERROR);
    }
  } finally {
    setButtonLoading(button, false);
  }
}
function initializeLogsTab() {
  setOnClick("export-logs-btn", handleExportLogs);
  setOnClick("clear-logs-btn", handleClearLogs);
}
function M() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var T = M();
function G(u3) {
  T = u3;
}
var _ = { exec: () => null };
function k(u3, e = "") {
  let t = typeof u3 == "string" ? u3 : u3.source, n = { replace: (r, i) => {
    let s = typeof i == "string" ? i : i.source;
    return s = s.replace(m.caret, "$1"), t = t.replace(r, s), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var Re = (() => {
  try {
    return !!new RegExp("(?<=1)(?<!1)");
  } catch {
    return false;
  }
})(), m = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (u3) => new RegExp(`^( {0,3}${u3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}#`), htmlBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}<(?:[a-z].*>|!--)`, "i"), blockquoteBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}>`) }, Te = /^(?:[ \t]*(?:\n|$))+/, Oe = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, we = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, A = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, ye = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, N = / {0,3}(?:[*+-]|\d{1,9}[.)])/, re = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, se = k(re).replace(/bull/g, N).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), Pe = k(re).replace(/bull/g, N).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), Q = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, Se = /^[^\n]+/, j = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/, $e = k(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", j).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), _e = k(/^(bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, N).getRegex(), q = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", F = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, Le = k("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", F).replace("tag", q).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), ie = k(Q).replace("hr", A).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", q).getRegex(), Me = k(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ie).getRegex(), U = { blockquote: Me, code: Oe, def: $e, fences: we, heading: ye, hr: A, html: Le, lheading: se, list: _e, newline: Te, paragraph: ie, table: _, text: Se }, te = k("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", A).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", q).getRegex(), ze = { ...U, lheading: Pe, table: te, paragraph: k(Q).replace("hr", A).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", te).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", q).getRegex() }, Ee = { ...U, html: k(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", F).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: _, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: k(Q).replace("hr", A).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", se).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() }, Ie = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, Ae = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, oe = /^( {2,}|\\)\n(?!\s*$)/, Ce = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, v = /[\p{P}\p{S}]/u, K = /[\s\p{P}\p{S}]/u, ae = /[^\s\p{P}\p{S}]/u, Be = k(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, K).getRegex(), le = /(?!~)[\p{P}\p{S}]/u, De = /(?!~)[\s\p{P}\p{S}]/u, qe = /(?:[^\s\p{P}\p{S}]|~)/u, ue = /(?![*_])[\p{P}\p{S}]/u, ve = /(?![*_])[\s\p{P}\p{S}]/u, He = /(?:[^\s\p{P}\p{S}]|[*_])/u, Ge = k(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Re ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex(), pe = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/, Ze = k(pe, "u").replace(/punct/g, v).getRegex(), Ne = k(pe, "u").replace(/punct/g, le).getRegex(), ce = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", Qe = k(ce, "gu").replace(/notPunctSpace/g, ae).replace(/punctSpace/g, K).replace(/punct/g, v).getRegex(), je = k(ce, "gu").replace(/notPunctSpace/g, qe).replace(/punctSpace/g, De).replace(/punct/g, le).getRegex(), Fe = k("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, ae).replace(/punctSpace/g, K).replace(/punct/g, v).getRegex(), Ue = k(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, ue).getRegex(), Ke = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)", We = k(Ke, "gu").replace(/notPunctSpace/g, He).replace(/punctSpace/g, ve).replace(/punct/g, ue).getRegex(), Xe = k(/\\(punct)/, "gu").replace(/punct/g, v).getRegex(), Je = k(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), Ve = k(F).replace("(?:-->|$)", "-->").getRegex(), Ye = k("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Ve).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), D = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/, et = k(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", D).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), he = k(/^!?\[(label)\]\[(ref)\]/).replace("label", D).replace("ref", j).getRegex(), ke = k(/^!?\[(ref)\](?:\[\])?/).replace("ref", j).getRegex(), tt = k("reflink|nolink(?!\\()", "g").replace("reflink", he).replace("nolink", ke).getRegex(), ne = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/, W = { _backpedal: _, anyPunctuation: Xe, autolink: Je, blockSkip: Ge, br: oe, code: Ae, del: _, delLDelim: _, delRDelim: _, emStrongLDelim: Ze, emStrongRDelimAst: Qe, emStrongRDelimUnd: Fe, escape: Ie, link: et, nolink: ke, punctuation: Be, reflink: he, reflinkSearch: tt, tag: Ye, text: Ce, url: _ }, nt = { ...W, link: k(/^!?\[(label)\]\((.*?)\)/).replace("label", D).getRegex(), reflink: k(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", D).getRegex() }, Z = { ...W, emStrongRDelimAst: je, emStrongLDelim: Ne, delLDelim: Ue, delRDelim: We, url: k(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", ne).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: k(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", ne).getRegex() }, rt = { ...Z, br: k(oe).replace("{2,}", "*").getRegex(), text: k(Z.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() }, C = { normal: U, gfm: ze, pedantic: Ee }, z = { normal: W, gfm: Z, breaks: rt, pedantic: nt };
var st = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }, de = (u3) => st[u3];
function O(u3, e) {
  if (e) {
    if (m.escapeTest.test(u3)) return u3.replace(m.escapeReplace, de);
  } else if (m.escapeTestNoEncode.test(u3)) return u3.replace(m.escapeReplaceNoEncode, de);
  return u3;
}
function X(u3) {
  try {
    u3 = encodeURI(u3).replace(m.percentDecode, "%");
  } catch {
    return null;
  }
  return u3;
}
function J(u3, e) {
  var _a2;
  let t = u3.replace(m.findPipe, (i, s, a) => {
    let o = false, l = s;
    for (; --l >= 0 && a[l] === "\\"; ) o = !o;
    return o ? "|" : " |";
  }), n = t.split(m.splitPipe), r = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !((_a2 = n.at(-1)) == null ? void 0 : _a2.trim()) && n.pop(), e) if (n.length > e) n.splice(e);
  else for (; n.length < e; ) n.push("");
  for (; r < n.length; r++) n[r] = n[r].trim().replace(m.slashPipe, "|");
  return n;
}
function E(u3, e, t) {
  let n = u3.length;
  if (n === 0) return "";
  let r = 0;
  for (; r < n; ) {
    let i = u3.charAt(n - r - 1);
    if (i === e && true) r++;
    else break;
  }
  return u3.slice(0, n - r);
}
function ge(u3, e) {
  if (u3.indexOf(e[1]) === -1) return -1;
  let t = 0;
  for (let n = 0; n < u3.length; n++) if (u3[n] === "\\") n++;
  else if (u3[n] === e[0]) t++;
  else if (u3[n] === e[1] && (t--, t < 0)) return n;
  return t > 0 ? -2 : -1;
}
function fe(u3, e = 0) {
  let t = e, n = "";
  for (let r of u3) if (r === "	") {
    let i = 4 - t % 4;
    n += " ".repeat(i), t += i;
  } else n += r, t++;
  return n;
}
function me(u3, e, t, n, r) {
  let i = e.href, s = e.title || null, a = u3[1].replace(r.other.outputLinkReplace, "$1");
  n.state.inLink = true;
  let o = { type: u3[0].charAt(0) === "!" ? "image" : "link", raw: t, href: i, title: s, text: a, tokens: n.inlineTokens(a) };
  return n.state.inLink = false, o;
}
function it(u3, e, t) {
  let n = u3.match(t.other.indentCodeCompensation);
  if (n === null) return e;
  let r = n[1];
  return e.split(`
`).map((i) => {
    let s = i.match(t.other.beginningSpace);
    if (s === null) return i;
    let [a] = s;
    return a.length >= r.length ? i.slice(r.length) : i;
  }).join(`
`);
}
var w = class {
  constructor(e) {
    __publicField(this, "options");
    __publicField(this, "rules");
    __publicField(this, "lexer");
    this.options = e || T;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: t[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : E(n, `
`) };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], r = it(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: r };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let r = E(n, "#");
        (this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
      }
      return { type: "heading", raw: t[0], depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t) return { type: "hr", raw: E(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = E(t[0], `
`).split(`
`), r = "", i = "", s = [];
      for (; n.length > 0; ) {
        let a = false, o = [], l;
        for (l = 0; l < n.length; l++) if (this.rules.other.blockquoteStart.test(n[l])) o.push(n[l]), a = true;
        else if (!a) o.push(n[l]);
        else break;
        n = n.slice(l);
        let p = o.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        r = r ? `${r}
${p}` : p, i = i ? `${i}
${c}` : c;
        let d = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(c, s, true), this.lexer.state.top = d, n.length === 0) break;
        let h = s.at(-1);
        if ((h == null ? void 0 : h.type) === "code") break;
        if ((h == null ? void 0 : h.type) === "blockquote") {
          let R = h, f = R.raw + `
` + n.join(`
`), S = this.blockquote(f);
          s[s.length - 1] = S, r = r.substring(0, r.length - R.raw.length) + S.raw, i = i.substring(0, i.length - R.text.length) + S.text;
          break;
        } else if ((h == null ? void 0 : h.type) === "list") {
          let R = h, f = R.raw + `
` + n.join(`
`), S = this.list(f);
          s[s.length - 1] = S, r = r.substring(0, r.length - h.raw.length) + S.raw, i = i.substring(0, i.length - R.raw.length) + S.raw, n = f.substring(s.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: r, tokens: s, text: i };
    }
  }
  list(e) {
    var _a2, _b;
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), r = n.length > 1, i = { type: "list", raw: "", ordered: r, start: r ? +n.slice(0, -1) : "", loose: false, items: [] };
      n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
      let s = this.rules.other.listItemRegex(n), a = false;
      for (; e; ) {
        let l = false, p = "", c = "";
        if (!(t = s.exec(e)) || this.rules.block.hr.test(e)) break;
        p = t[0], e = e.substring(p.length);
        let d = fe(t[2].split(`
`, 1)[0], t[1].length), h = e.split(`
`, 1)[0], R = !d.trim(), f = 0;
        if (this.options.pedantic ? (f = 2, c = d.trimStart()) : R ? f = t[1].length + 1 : (f = d.search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = d.slice(f), f += t[1].length), R && this.rules.other.blankLine.test(h) && (p += h + `
`, e = e.substring(h.length + 1), l = true), !l) {
          let S = this.rules.other.nextBulletRegex(f), V = this.rules.other.hrRegex(f), Y = this.rules.other.fencesBeginRegex(f), ee = this.rules.other.headingBeginRegex(f), xe = this.rules.other.htmlBeginRegex(f), be = this.rules.other.blockquoteBeginRegex(f);
          for (; e; ) {
            let H = e.split(`
`, 1)[0], I;
            if (h = H, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), I = h) : I = h.replace(this.rules.other.tabCharGlobal, "    "), Y.test(h) || ee.test(h) || xe.test(h) || be.test(h) || S.test(h) || V.test(h)) break;
            if (I.search(this.rules.other.nonSpaceChar) >= f || !h.trim()) c += `
` + I.slice(f);
            else {
              if (R || d.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || Y.test(d) || ee.test(d) || V.test(d)) break;
              c += `
` + h;
            }
            R = !h.trim(), p += H + `
`, e = e.substring(H.length + 1), d = I.slice(f);
          }
        }
        i.loose || (a ? i.loose = true : this.rules.other.doubleBlankLine.test(p) && (a = true)), i.items.push({ type: "list_item", raw: p, task: !!this.options.gfm && this.rules.other.listIsTask.test(c), loose: false, text: c, tokens: [] }), i.raw += p;
      }
      let o = i.items.at(-1);
      if (o) o.raw = o.raw.trimEnd(), o.text = o.text.trimEnd();
      else return;
      i.raw = i.raw.trimEnd();
      for (let l of i.items) {
        if (this.lexer.state.top = false, l.tokens = this.lexer.blockTokens(l.text, []), l.task) {
          if (l.text = l.text.replace(this.rules.other.listReplaceTask, ""), ((_a2 = l.tokens[0]) == null ? void 0 : _a2.type) === "text" || ((_b = l.tokens[0]) == null ? void 0 : _b.type) === "paragraph") {
            l.tokens[0].raw = l.tokens[0].raw.replace(this.rules.other.listReplaceTask, ""), l.tokens[0].text = l.tokens[0].text.replace(this.rules.other.listReplaceTask, "");
            for (let c = this.lexer.inlineQueue.length - 1; c >= 0; c--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[c].src)) {
              this.lexer.inlineQueue[c].src = this.lexer.inlineQueue[c].src.replace(this.rules.other.listReplaceTask, "");
              break;
            }
          }
          let p = this.rules.other.listTaskCheckbox.exec(l.raw);
          if (p) {
            let c = { type: "checkbox", raw: p[0] + " ", checked: p[0] !== "[ ]" };
            l.checked = c.checked, i.loose ? l.tokens[0] && ["paragraph", "text"].includes(l.tokens[0].type) && "tokens" in l.tokens[0] && l.tokens[0].tokens ? (l.tokens[0].raw = c.raw + l.tokens[0].raw, l.tokens[0].text = c.raw + l.tokens[0].text, l.tokens[0].tokens.unshift(c)) : l.tokens.unshift({ type: "paragraph", raw: c.raw, text: c.raw, tokens: [c] }) : l.tokens.unshift(c);
          }
        }
        if (!i.loose) {
          let p = l.tokens.filter((d) => d.type === "space"), c = p.length > 0 && p.some((d) => this.rules.other.anyLine.test(d.raw));
          i.loose = c;
        }
      }
      if (i.loose) for (let l of i.items) {
        l.loose = true;
        for (let p of l.tokens) p.type === "text" && (p.type = "paragraph");
      }
      return i;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) return { type: "html", block: true, raw: t[0], pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: t[0] };
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: t[0], href: r, title: i };
    }
  }
  table(e) {
    var _a2;
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
    let n = J(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = ((_a2 = t[3]) == null ? void 0 : _a2.trim()) ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], s = { type: "table", raw: t[0], header: [], align: [], rows: [] };
    if (n.length === r.length) {
      for (let a of r) this.rules.other.tableAlignRight.test(a) ? s.align.push("right") : this.rules.other.tableAlignCenter.test(a) ? s.align.push("center") : this.rules.other.tableAlignLeft.test(a) ? s.align.push("left") : s.align.push(null);
      for (let a = 0; a < n.length; a++) s.header.push({ text: n[a], tokens: this.lexer.inline(n[a]), header: true, align: s.align[a] });
      for (let a of i) s.rows.push(J(a, s.header.length).map((o, l) => ({ text: o, tokens: this.lexer.inline(o), header: false, align: s.align[l] })));
      return s;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) return { type: "heading", raw: t[0], depth: t[2].charAt(0) === "=" ? 1 : 2, text: t[1], tokens: this.lexer.inline(t[1]) };
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
        if (!this.rules.other.endAngleBracket.test(n)) return;
        let s = E(n.slice(0, -1), "\\");
        if ((n.length - s.length) % 2 === 0) return;
      } else {
        let s = ge(t[2], "()");
        if (s === -2) return;
        if (s > -1) {
          let o = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
          t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, o).trim(), t[3] = "";
        }
      }
      let r = t[2], i = "";
      if (this.options.pedantic) {
        let s = this.rules.other.pedanticHrefTitle.exec(r);
        s && (r = s[1], i = s[3]);
      } else i = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), me(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: i && i.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i = t[r.toLowerCase()];
      if (!i) {
        let s = n[0].charAt(0);
        return { type: "text", raw: s, text: s };
      }
      return me(n, i, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let r = this.rules.inline.emStrongLDelim.exec(e);
    if (!r || r[3] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(r[1] || r[2] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let s = [...r[0]].length - 1, a, o, l = s, p = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (c.lastIndex = 0, t = t.slice(-1 * e.length + s); (r = c.exec(t)) != null; ) {
        if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a) continue;
        if (o = [...a].length, r[3] || r[4]) {
          l += o;
          continue;
        } else if ((r[5] || r[6]) && s % 3 && !((s + o) % 3)) {
          p += o;
          continue;
        }
        if (l -= o, l > 0) continue;
        o = Math.min(o, o + l + p);
        let d = [...r[0]][0].length, h = e.slice(0, s + r.index + d + o);
        if (Math.min(s, o) % 2) {
          let f = h.slice(1, -1);
          return { type: "em", raw: h, text: f, tokens: this.lexer.inlineTokens(f) };
        }
        let R = h.slice(2, -2);
        return { type: "strong", raw: h, text: R, tokens: this.lexer.inlineTokens(R) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return r && i && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t) return { type: "br", raw: t[0] };
  }
  del(e, t, n = "") {
    let r = this.rules.inline.delLDelim.exec(e);
    if (!r) return;
    if (!(r[1] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let s = [...r[0]].length - 1, a, o, l = s, p = this.rules.inline.delRDelim;
      for (p.lastIndex = 0, t = t.slice(-1 * e.length + s); (r = p.exec(t)) != null; ) {
        if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a || (o = [...a].length, o !== s)) continue;
        if (r[3] || r[4]) {
          l += o;
          continue;
        }
        if (l -= o, l > 0) continue;
        o = Math.min(o, o + l);
        let c = [...r[0]][0].length, d = e.slice(0, s + r.index + c + o), h = d.slice(s, -s);
        return { type: "del", raw: d, text: h, tokens: this.lexer.inlineTokens(h) };
      }
    }
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, r;
      return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    var _a2;
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, r;
      if (t[2] === "@") n = t[0], r = "mailto:" + n;
      else {
        let i;
        do
          i = t[0], t[0] = ((_a2 = this.rules.inline._backpedal.exec(t[0])) == null ? void 0 : _a2[0]) ?? "";
        while (i !== t[0]);
        n = t[0], t[1] === "www." ? r = "http://" + t[0] : r = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: t[0], escaped: n };
    }
  }
};
var x = class u {
  constructor(e) {
    __publicField(this, "tokens");
    __publicField(this, "options");
    __publicField(this, "state");
    __publicField(this, "inlineQueue");
    __publicField(this, "tokenizer");
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || T, this.options.tokenizer = this.options.tokenizer || new w(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, top: true };
    let t = { other: m, block: C.normal, inline: z.normal };
    this.options.pedantic ? (t.block = C.pedantic, t.inline = z.pedantic) : this.options.gfm && (t.block = C.gfm, this.options.breaks ? t.inline = z.breaks : t.inline = z.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: C, inline: z };
  }
  static lex(e, t) {
    return new u(t).lex(e);
  }
  static lexInline(e, t) {
    return new u(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0; t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    var _a2, _b, _c;
    for (this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, "")); e; ) {
      let r;
      if ((_b = (_a2 = this.options.extensions) == null ? void 0 : _a2.block) == null ? void 0 : _b.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false)) continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        r.raw.length === 1 && s !== void 0 ? s.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        (s == null ? void 0 : s.type) === "paragraph" || (s == null ? void 0 : s.type) === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        (s == null ? void 0 : s.type) === "paragraph" || (s == null ? void 0 : s.type) === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let i = e;
      if ((_c = this.options.extensions) == null ? void 0 : _c.startBlock) {
        let s = 1 / 0, a = e.slice(1), o;
        this.options.extensions.startBlock.forEach((l) => {
          o = l.call({ lexer: this }, a), typeof o == "number" && o >= 0 && (s = Math.min(s, o));
        }), s < 1 / 0 && s >= 0 && (i = e.substring(0, s + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(i))) {
        let s = t.at(-1);
        n && (s == null ? void 0 : s.type) === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        (s == null ? void 0 : s.type) === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (e) {
        let s = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(s);
          break;
        } else throw new Error(s);
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  inlineTokens(e, t = []) {
    var _a2, _b, _c, _d, _e2;
    let n = e, r = null;
    if (this.tokens.links) {
      let o = Object.keys(this.tokens.links);
      if (o.length > 0) for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null; ) o.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null; ) n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    let i;
    for (; (r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null; ) i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    n = ((_b = (_a2 = this.options.hooks) == null ? void 0 : _a2.emStrongMask) == null ? void 0 : _b.call({ lexer: this }, n)) ?? n;
    let s = false, a = "";
    for (; e; ) {
      s || (a = ""), s = false;
      let o;
      if ((_d = (_c = this.options.extensions) == null ? void 0 : _c.inline) == null ? void 0 : _d.some((p) => (o = p.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), true) : false)) continue;
      if (o = this.tokenizer.escape(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.tag(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.link(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(o.raw.length);
        let p = t.at(-1);
        o.type === "text" && (p == null ? void 0 : p.type) === "text" ? (p.raw += o.raw, p.text += o.text) : t.push(o);
        continue;
      }
      if (o = this.tokenizer.emStrong(e, n, a)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.codespan(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.br(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.del(e, n, a)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.autolink(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (!this.state.inLink && (o = this.tokenizer.url(e))) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      let l = e;
      if ((_e2 = this.options.extensions) == null ? void 0 : _e2.startInline) {
        let p = 1 / 0, c = e.slice(1), d;
        this.options.extensions.startInline.forEach((h) => {
          d = h.call({ lexer: this }, c), typeof d == "number" && d >= 0 && (p = Math.min(p, d));
        }), p < 1 / 0 && p >= 0 && (l = e.substring(0, p + 1));
      }
      if (o = this.tokenizer.inlineText(l)) {
        e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (a = o.raw.slice(-1)), s = true;
        let p = t.at(-1);
        (p == null ? void 0 : p.type) === "text" ? (p.raw += o.raw, p.text += o.text) : t.push(o);
        continue;
      }
      if (e) {
        let p = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(p);
          break;
        } else throw new Error(p);
      }
    }
    return t;
  }
};
var y = class {
  constructor(e) {
    __publicField(this, "options");
    __publicField(this, "parser");
    this.options = e || T;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    var _a2;
    let r = (_a2 = (t || "").match(m.notSpaceStart)) == null ? void 0 : _a2[0], i = e.replace(m.endingNewline, "") + `
`;
    return r ? '<pre><code class="language-' + O(r) + '">' + (n ? i : O(i, true)) + `</code></pre>
` : "<pre><code>" + (n ? i : O(i, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let t = e.ordered, n = e.start, r = "";
    for (let a = 0; a < e.items.length; a++) {
      let o = e.items[a];
      r += this.listitem(o);
    }
    let i = t ? "ol" : "ul", s = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + i + s + `>
` + r + "</" + i + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let i = 0; i < e.header.length; i++) n += this.tablecell(e.header[i]);
    t += this.tablerow({ text: n });
    let r = "";
    for (let i = 0; i < e.rows.length; i++) {
      let s = e.rows[i];
      n = "";
      for (let a = 0; a < s.length; a++) n += this.tablecell(s[a]);
      r += this.tablerow({ text: n });
    }
    return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${O(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, tokens: n }) {
    let r = this.parser.parseInline(n), i = X(e);
    if (i === null) return r;
    e = i;
    let s = '<a href="' + e + '"';
    return t && (s += ' title="' + O(t) + '"'), s += ">" + r + "</a>", s;
  }
  image({ href: e, title: t, text: n, tokens: r }) {
    r && (n = this.parser.parseInline(r, this.parser.textRenderer));
    let i = X(e);
    if (i === null) return O(n);
    e = i;
    let s = `<img src="${e}" alt="${O(n)}"`;
    return t && (s += ` title="${O(t)}"`), s += ">", s;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : O(e.text);
  }
};
var $ = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
};
var b = class u2 {
  constructor(e) {
    __publicField(this, "options");
    __publicField(this, "renderer");
    __publicField(this, "textRenderer");
    this.options = e || T, this.options.renderer = this.options.renderer || new y(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new $();
  }
  static parse(e, t) {
    return new u2(t).parse(e);
  }
  static parseInline(e, t) {
    return new u2(t).parseInline(e);
  }
  parse(e) {
    var _a2, _b;
    let t = "";
    for (let n = 0; n < e.length; n++) {
      let r = e[n];
      if ((_b = (_a2 = this.options.extensions) == null ? void 0 : _a2.renderers) == null ? void 0 : _b[r.type]) {
        let s = r, a = this.options.extensions.renderers[s.type].call({ parser: this }, s);
        if (a !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(s.type)) {
          t += a || "";
          continue;
        }
      }
      let i = r;
      switch (i.type) {
        case "space": {
          t += this.renderer.space(i);
          break;
        }
        case "hr": {
          t += this.renderer.hr(i);
          break;
        }
        case "heading": {
          t += this.renderer.heading(i);
          break;
        }
        case "code": {
          t += this.renderer.code(i);
          break;
        }
        case "table": {
          t += this.renderer.table(i);
          break;
        }
        case "blockquote": {
          t += this.renderer.blockquote(i);
          break;
        }
        case "list": {
          t += this.renderer.list(i);
          break;
        }
        case "checkbox": {
          t += this.renderer.checkbox(i);
          break;
        }
        case "html": {
          t += this.renderer.html(i);
          break;
        }
        case "def": {
          t += this.renderer.def(i);
          break;
        }
        case "paragraph": {
          t += this.renderer.paragraph(i);
          break;
        }
        case "text": {
          t += this.renderer.text(i);
          break;
        }
        default: {
          let s = 'Token with "' + i.type + '" type was not found.';
          if (this.options.silent) return console.error(s), "";
          throw new Error(s);
        }
      }
    }
    return t;
  }
  parseInline(e, t = this.renderer) {
    var _a2, _b;
    let n = "";
    for (let r = 0; r < e.length; r++) {
      let i = e[r];
      if ((_b = (_a2 = this.options.extensions) == null ? void 0 : _a2.renderers) == null ? void 0 : _b[i.type]) {
        let a = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (a !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
          n += a || "";
          continue;
        }
      }
      let s = i;
      switch (s.type) {
        case "escape": {
          n += t.text(s);
          break;
        }
        case "html": {
          n += t.html(s);
          break;
        }
        case "link": {
          n += t.link(s);
          break;
        }
        case "image": {
          n += t.image(s);
          break;
        }
        case "checkbox": {
          n += t.checkbox(s);
          break;
        }
        case "strong": {
          n += t.strong(s);
          break;
        }
        case "em": {
          n += t.em(s);
          break;
        }
        case "codespan": {
          n += t.codespan(s);
          break;
        }
        case "br": {
          n += t.br(s);
          break;
        }
        case "del": {
          n += t.del(s);
          break;
        }
        case "text": {
          n += t.text(s);
          break;
        }
        default: {
          let a = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent) return console.error(a), "";
          throw new Error(a);
        }
      }
    }
    return n;
  }
};
var P = (_a = class {
  constructor(e) {
    __publicField(this, "options");
    __publicField(this, "block");
    this.options = e || T;
  }
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer() {
    return this.block ? x.lex : x.lexInline;
  }
  provideParser() {
    return this.block ? b.parse : b.parseInline;
  }
}, __publicField(_a, "passThroughHooks", /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"])), __publicField(_a, "passThroughHooksRespectAsync", /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"])), _a);
var B = class {
  constructor(...e) {
    __publicField(this, "defaults", M());
    __publicField(this, "options", this.setOptions);
    __publicField(this, "parse", this.parseMarkdown(true));
    __publicField(this, "parseInline", this.parseMarkdown(false));
    __publicField(this, "Parser", b);
    __publicField(this, "Renderer", y);
    __publicField(this, "TextRenderer", $);
    __publicField(this, "Lexer", x);
    __publicField(this, "Tokenizer", w);
    __publicField(this, "Hooks", P);
    this.use(...e);
  }
  walkTokens(e, t) {
    var _a2, _b;
    let n = [];
    for (let r of e) switch (n = n.concat(t.call(this, r)), r.type) {
      case "table": {
        let i = r;
        for (let s of i.header) n = n.concat(this.walkTokens(s.tokens, t));
        for (let s of i.rows) for (let a of s) n = n.concat(this.walkTokens(a.tokens, t));
        break;
      }
      case "list": {
        let i = r;
        n = n.concat(this.walkTokens(i.items, t));
        break;
      }
      default: {
        let i = r;
        ((_b = (_a2 = this.defaults.extensions) == null ? void 0 : _a2.childTokens) == null ? void 0 : _b[i.type]) ? this.defaults.extensions.childTokens[i.type].forEach((s) => {
          let a = i[s].flat(1 / 0);
          n = n.concat(this.walkTokens(a, t));
        }) : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
      }
    }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let r = { ...n };
      if (r.async = this.defaults.async || r.async || false, n.extensions && (n.extensions.forEach((i) => {
        if (!i.name) throw new Error("extension name required");
        if ("renderer" in i) {
          let s = t.renderers[i.name];
          s ? t.renderers[i.name] = function(...a) {
            let o = i.renderer.apply(this, a);
            return o === false && (o = s.apply(this, a)), o;
          } : t.renderers[i.name] = i.renderer;
        }
        if ("tokenizer" in i) {
          if (!i.level || i.level !== "block" && i.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let s = t[i.level];
          s ? s.unshift(i.tokenizer) : t[i.level] = [i.tokenizer], i.start && (i.level === "block" ? t.startBlock ? t.startBlock.push(i.start) : t.startBlock = [i.start] : i.level === "inline" && (t.startInline ? t.startInline.push(i.start) : t.startInline = [i.start]));
        }
        "childTokens" in i && i.childTokens && (t.childTokens[i.name] = i.childTokens);
      }), r.extensions = t), n.renderer) {
        let i = this.defaults.renderer || new y(this.defaults);
        for (let s in n.renderer) {
          if (!(s in i)) throw new Error(`renderer '${s}' does not exist`);
          if (["options", "parser"].includes(s)) continue;
          let a = s, o = n.renderer[a], l = i[a];
          i[a] = (...p) => {
            let c = o.apply(i, p);
            return c === false && (c = l.apply(i, p)), c || "";
          };
        }
        r.renderer = i;
      }
      if (n.tokenizer) {
        let i = this.defaults.tokenizer || new w(this.defaults);
        for (let s in n.tokenizer) {
          if (!(s in i)) throw new Error(`tokenizer '${s}' does not exist`);
          if (["options", "rules", "lexer"].includes(s)) continue;
          let a = s, o = n.tokenizer[a], l = i[a];
          i[a] = (...p) => {
            let c = o.apply(i, p);
            return c === false && (c = l.apply(i, p)), c;
          };
        }
        r.tokenizer = i;
      }
      if (n.hooks) {
        let i = this.defaults.hooks || new P();
        for (let s in n.hooks) {
          if (!(s in i)) throw new Error(`hook '${s}' does not exist`);
          if (["options", "block"].includes(s)) continue;
          let a = s, o = n.hooks[a], l = i[a];
          P.passThroughHooks.has(s) ? i[a] = (p) => {
            if (this.defaults.async && P.passThroughHooksRespectAsync.has(s)) return (async () => {
              let d = await o.call(i, p);
              return l.call(i, d);
            })();
            let c = o.call(i, p);
            return l.call(i, c);
          } : i[a] = (...p) => {
            if (this.defaults.async) return (async () => {
              let d = await o.apply(i, p);
              return d === false && (d = await l.apply(i, p)), d;
            })();
            let c = o.apply(i, p);
            return c === false && (c = l.apply(i, p)), c;
          };
        }
        r.hooks = i;
      }
      if (n.walkTokens) {
        let i = this.defaults.walkTokens, s = n.walkTokens;
        r.walkTokens = function(a) {
          let o = [];
          return o.push(s.call(this, a)), i && (o = o.concat(i.call(this, a))), o;
        };
      }
      this.defaults = { ...this.defaults, ...r };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return x.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return b.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, r) => {
      let i = { ...r }, s = { ...this.defaults, ...i }, a = this.onError(!!s.silent, !!s.async);
      if (this.defaults.async === true && i.async === false) return a(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null) return a(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string") return a(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (s.hooks && (s.hooks.options = s, s.hooks.block = e), s.async) return (async () => {
        let o = s.hooks ? await s.hooks.preprocess(n) : n, p = await (s.hooks ? await s.hooks.provideLexer() : e ? x.lex : x.lexInline)(o, s), c = s.hooks ? await s.hooks.processAllTokens(p) : p;
        s.walkTokens && await Promise.all(this.walkTokens(c, s.walkTokens));
        let h = await (s.hooks ? await s.hooks.provideParser() : e ? b.parse : b.parseInline)(c, s);
        return s.hooks ? await s.hooks.postprocess(h) : h;
      })().catch(a);
      try {
        s.hooks && (n = s.hooks.preprocess(n));
        let l = (s.hooks ? s.hooks.provideLexer() : e ? x.lex : x.lexInline)(n, s);
        s.hooks && (l = s.hooks.processAllTokens(l)), s.walkTokens && this.walkTokens(l, s.walkTokens);
        let c = (s.hooks ? s.hooks.provideParser() : e ? b.parse : b.parseInline)(l, s);
        return s.hooks && (c = s.hooks.postprocess(c)), c;
      } catch (o) {
        return a(o);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let r = "<p>An error occurred:</p><pre>" + O(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(r) : r;
      }
      if (t) return Promise.reject(n);
      throw n;
    };
  }
};
var L = new B();
function g(u3, e) {
  return L.parse(u3, e);
}
g.options = g.setOptions = function(u3) {
  return L.setOptions(u3), g.defaults = L.defaults, G(g.defaults), g;
};
g.getDefaults = M;
g.defaults = T;
g.use = function(...u3) {
  return L.use(...u3), g.defaults = L.defaults, G(g.defaults), g;
};
g.walkTokens = function(u3, e) {
  return L.walkTokens(u3, e);
};
g.parseInline = L.parseInline;
g.Parser = b;
g.parser = b.parse;
g.Renderer = y;
g.TextRenderer = $;
g.Lexer = x;
g.lexer = x.lex;
g.Tokenizer = w;
g.Hooks = P;
g.parse = g;
g.options;
g.setOptions;
g.use;
g.walkTokens;
g.parseInline;
b.parse;
x.lex;
function initializeMaintenanceTab() {
  setOnClick("upgrade-btn", handleUpgrade);
  setOnClick("uninstall-btn", handleUninstall);
  setOnClick("rollback-btn", handleRollback);
  setOnClick("readme-btn", handleReadme);
  setOnClick("close-readme", handleCloseReadme);
}
function handleUpgrade(button) {
  setButtonLoading(button, true);
  try {
    printVersionCodeSpawn({
      async onStdout(data) {
        if (data.includes("Update available")) {
          if (await customConfirm("Update available. Install now?")) {
            setButtonLoading(button, true);
            upgradeSpawn({
              onExit: () => {
                setButtonLoading(button, false);
                printToNotify("ACC updated successfully. Please refresh the page.");
              }
            });
          }
        } else if (data.includes("No update available")) {
          printToNotify("ACC is up to date");
        } else if (data.trim()) {
          printToNotify("Update check result: " + data.trim());
        }
      },
      onExit: () => {
        setButtonLoading(button, false);
      }
    });
  } catch (e) {
    printToConsole(`upgrade failed: ${e}`);
  }
}
async function handleUninstall(button) {
  if (await customConfirm("Are you sure you want to uninstall ACC? This will remove all ACC files and Profiles.")) {
    setButtonLoading(button, true);
    try {
      uninstallSpawn({
        onStdout: (data) => printToConsole(data),
        onStderr: (data) => printToConsole(data, LogLevel.ERROR),
        onExit: (code) => {
          setButtonLoading(button, false);
          if (code === 0) {
            printToNotify("ACC uninstalled successfully");
          } else {
            printToNotify(`ACC uninstall failed with code: ${code}`, LogLevel.ERROR);
          }
        }
      });
    } catch (e) {
      printToConsole(`uninstall failed: ${e}`, LogLevel.ERROR);
    }
  }
}
async function handleRollback() {
  const version = await customPrompt("Enter version to rollback to (leave empty for previous):");
  try {
    const result = await rollback(version ?? void 0);
    printToNotify("Rollback completed: " + ((result == null ? void 0 : result.stdout) || "").trim());
  } catch (e) {
    printToConsole(`Rollback failed: ${e}`, LogLevel.ERROR);
  }
}
async function handleReadme() {
  try {
    const result = await showReadme();
    if (result.errno === 0 && result.stdout) {
      $$1("readme-content").innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px;">${g.parse(result.stdout)}</pre>`;
      $$1("readme-modal").style.display = "block";
    } else {
      printToNotify(`Failed to load README: ${result.stderr}`, LogLevel.ERROR);
    }
  } catch (e) {
    printToNotify(`Failed to load README: ${e}`, LogLevel.ERROR);
  }
}
function handleCloseReadme() {
  $$1("readme-modal").style.display = "none";
}
const CONFIG_MAPPINGS = [
  // Basic settings
  { elementName: "pause-capacity", configName: "pause_capacity" },
  { elementName: "resume-capacity", configName: "resume_capacity" },
  { elementName: "shutdown-capacity", configName: "shutdown_capacity" },
  { elementName: "capacity-mask", configName: "capacity_mask", required: true },
  // Limits
  { elementName: "max-current", configName: "max_charging_current" },
  { elementName: "max-voltage", configName: "max_charging_voltage" },
  { elementName: "temp-level", configName: "temp_level" },
  // Advanced settings
  { elementName: "prioritize-idle", configName: "prioritize_batt_idle_mode", required: true },
  { elementName: "force-off", configName: "force_off", required: true },
  { elementName: "reboot-resume", configName: "reboot_resume", required: true },
  { elementName: "reset-batt-stats-on-pause", configName: "reset_batt_stats_on_pause", required: true },
  { elementName: "reset-batt-stats-on-plug", configName: "reset_batt_stats_on_plug", required: true },
  { elementName: "reset-batt-stats-on-unplug", configName: "reset_batt_stats_on_unplug", required: true },
  // Cooldown settings
  { elementName: "cooldown-capacity", configName: "cooldown_capacity" },
  { elementName: "cooldown-temp", configName: "cooldown_temp" },
  { elementName: "cooldown-current", configName: "cooldown_current" },
  { elementName: "cooldown-charge", configName: "cooldown_charge" },
  { elementName: "cooldown-pause", configName: "cooldown_pause" },
  // Other settings
  { elementName: "charging-switch", configName: "charging_switch" },
  { elementName: "batt-status-override", configName: "batt_status_override" },
  { elementName: "idle-apps", configName: "idle_apps" },
  { elementName: "run-cmd-on-pause", configName: "run_cmd_on_pause" },
  { elementName: "apply-on-boot", configName: "apply_on_boot" },
  { elementName: "apply-on-plug", configName: "apply_on_plug" }
];
let ProfilePanelName$1 = "current-profile-settings";
function initializeSettingsTab() {
  loadChargingSwitches();
  setOnClick("load-default-config-btn", handleLoadDefaultConfig);
  setOnClick("save-config-btn", handleSaveConfig);
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", handleTabButtonClick);
  });
}
async function refreshSettings() {
  setButtonLoading($$1("settings-panel"), true);
  setTimeout(async () => {
    try {
      await checkAccdProfile(ProfilePanelName$1);
      let currentProfile = getAccProfilePath();
      if (isForceCharging(currentProfile)) {
        printToNotify("ForceCharging configuration should not be modified.", LogLevel.ERROR);
        return;
      }
      await loadCurrentConfig(currentProfile);
      setButtonLoading($$1("settings-panel"), false);
      printToNotify(`${currentProfile.includes(startupProfilePath) ? "Startup Profile" : currentProfile.split("/").pop()} is being edited`);
    } catch (e) {
      printToNotify(`refresh failed:${e}`, LogLevel.ERROR);
    }
  }, 0);
}
function getVal(id) {
  const el = $$1(id);
  return el ? el.value : "";
}
function buildConfigCommands() {
  const commands = [];
  const cooldownChargeVal = getVal("cooldown-charge");
  const cooldownPauseVal = getVal("cooldown-pause");
  const hasCooldownPair = cooldownChargeVal && cooldownPauseVal;
  for (const mapping of CONFIG_MAPPINGS) {
    if ((mapping.elementName === "cooldown-charge" || mapping.elementName === "cooldown-pause") && !hasCooldownPair) {
      continue;
    }
    const value = getVal(mapping.elementName);
    if (mapping.required || value) {
      commands.push(`${mapping.configName}=${value}`);
    }
  }
  return commands;
}
function handleTabButtonClick(e) {
  const button = e.target;
  document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.remove("active"));
  button.classList.add("active");
  const tabId = button.getAttribute("data-tab");
  if (tabId) {
    const tab = $$1(tabId);
    if (tab) tab.classList.add("active");
  }
}
async function loadCurrentConfig(currentProfile) {
  var _a2;
  try {
    const configResult = await printConfig(currentProfile);
    if (configResult.errno === 0 && configResult.stdout) {
      const configMap = parseConfig((_a2 = configResult.stdout) == null ? void 0 : _a2.trim());
      for (const mapping of CONFIG_MAPPINGS) {
        const el = $$1(mapping.elementName);
        if (el) {
          el.value = configMap[mapping.configName] || "";
        }
      }
    }
  } catch (e) {
    printToConsole(`Failed to load Profile: ${e}`, LogLevel.ERROR);
  }
}
async function loadChargingSwitches() {
  try {
    const switchesResult = await loadingSwitch();
    const switches = (switchesResult == null ? void 0 : switchesResult.stdout) || "";
    const switchSelect = $$1("charging-switch");
    if (!switchSelect) return;
    while (switchSelect.options.length > 1) {
      switchSelect.remove(1);
    }
    switches.split("\n").forEach((line) => {
      if (line.trim()) {
        const option = document.createElement("option");
        option.value = line;
        option.textContent = line;
        switchSelect.appendChild(option);
      }
    });
  } catch (e) {
    printToConsole(`Failed to load charging switches: ${e}`, LogLevel.ERROR);
  }
}
async function handleSaveConfig() {
  const panel = $$1("settings-panel");
  if (await customConfirm("Are you sure you want to save these settings?")) {
    setButtonLoading(panel, true);
    setTimeout(async () => {
      try {
        const commands = buildConfigCommands();
        for (const cmd of commands) {
          await setConfig(cmd);
        }
        printToNotify("Profile saved and restart!");
        restartAccdSpawn({});
      } catch (e) {
        printToConsole(`${e}`, LogLevel.ERROR);
      } finally {
        setButtonLoading(panel, false);
      }
    }, 0);
  }
}
async function handleLoadDefaultConfig() {
  const panel = $$1("settings-panel");
  setButtonLoading(panel, true);
  try {
    await loadCurrentConfig(defaultProfilePath);
  } catch (e) {
    printToNotify(`Failed to reset Profile: ${e}`, LogLevel.ERROR);
  } finally {
    setButtonLoading(panel, false);
  }
}
setConsoleListener((message, level) => {
  switch (level) {
    case LogLevel.ERROR:
      console.error(message);
      break;
    case LogLevel.WARN:
      console.warn(message);
      break;
    case LogLevel.INFO:
      console.info(message);
      break;
    default:
      console.log(message);
  }
  const debugConsole = $$1("debug-console");
  const lastUpdated = $$1("last-updated");
  if (debugConsole && debugConsole.style.display != "none") {
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    debugConsole.textContent += `${logMessage}
`;
    debugConsole.scrollTop = debugConsole.scrollHeight;
    if (lastUpdated) lastUpdated.textContent = (/* @__PURE__ */ new Date()).toLocaleString();
  }
});
function initializeDebugMode() {
  const debugConsoleCard = $$1("debug-console-card");
  const debugModeToggle = $$1("debug-mode-toggle");
  const debugModeEnabled = localStorage.getItem(localStorageKey.debugModeToggle) === "true";
  if (debugModeToggle) debugModeToggle.value = debugModeEnabled ? "true" : "false";
  if (debugConsoleCard) {
    if (debugModeEnabled) {
      debugConsoleCard.classList.add("enabled");
      setLogLevel(LogLevel.DEBUG);
    } else {
      debugConsoleCard.classList.remove("enabled");
      setLogLevel(LogLevel.INFO);
    }
  }
  debugModeToggle == null ? void 0 : debugModeToggle.addEventListener("change", (e) => {
    handleDebugModeChange(e.target, debugConsoleCard);
  });
}
function handleDebugModeChange(select, debugConsoleCard) {
  const isEnabled = select.value === "true";
  localStorage.setItem(localStorageKey.debugModeToggle, String(isEnabled));
  if (debugConsoleCard) {
    if (isEnabled) {
      debugConsoleCard.classList.add("enabled");
      setLogLevel(LogLevel.DEBUG);
    } else {
      debugConsoleCard.classList.remove("enabled");
      setLogLevel(LogLevel.INFO);
    }
  }
}
class ProfileCard {
  constructor(options) {
    __publicField(this, "configPath");
    __publicField(this, "isStartup");
    __publicField(this, "container");
    __publicField(this, "callbacks");
    __publicField(this, "isActive", false);
    __publicField(this, "isExpanded", false);
    __publicField(this, "elements");
    this.configPath = options.configPath;
    this.isStartup = options.isStartup;
    this.callbacks = options;
    this.container = document.createElement("div");
    this.container.className = "card profile-panel";
    this.container.dataset.path = this.configPath;
    this.elements = {
      name: null,
      chargeLimit: null,
      resumeCharge: null,
      pauseAt: null,
      buttonGroup: null,
      btnApply: null,
      btnCopy: null,
      btnDelete: null
    };
    this.render();
    this.bindEvents();
  }
  /**
   * Get config path
   */
  getConfigPath() {
    return this.configPath;
  }
  /**
   * Get profile name from path
   */
  getProfileName() {
    if (this.isStartup) {
      return "Startup Profile";
    }
    const parts = this.configPath.split("/");
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(conf|txt)$/i, "");
  }
  /**
   * Render HTML structure
   */
  render() {
    const buttonsHtml = `<button class="primary-button" data-action="apply">Apply</button>
               <button class="success-button" data-action="copy">Copy</button>
               <button class="danger-button" data-action="delete"${this.isStartup ? " disabled" : ""}>Delete</button>`;
    this.container.innerHTML = `
            <h2 class="profile-name">${this.getProfileName()}</h2>
            <div class="profile-display">
                <div class="status-item">
                    <span class="status-key">Charge Limit:</span>
                    <span class="status-value charge-limit">-</span>
                </div>
                <div class="status-item">
                    <span class="status-key">Resume Charge:</span>
                    <span class="status-value resume-charge">-</span>
                </div>
                <div class="status-item">
                    <span class="status-key">Pause at:</span>
                    <span class="status-value pause-at">-</span>
                </div>
            </div>
            <div class="button-group collapsed">${buttonsHtml}</div>
        `;
    this.elements.name = this.container.querySelector(".profile-name");
    this.elements.chargeLimit = this.container.querySelector(".charge-limit");
    this.elements.resumeCharge = this.container.querySelector(".resume-charge");
    this.elements.pauseAt = this.container.querySelector(".pause-at");
    this.elements.buttonGroup = this.container.querySelector(".button-group");
    this.elements.btnApply = this.container.querySelector('[data-action="apply"]');
    this.elements.btnCopy = this.container.querySelector('[data-action="copy"]');
    this.elements.btnDelete = this.container.querySelector('[data-action="delete"]');
  }
  /**
   * Bind event listeners
   */
  bindEvents() {
    var _a2, _b, _c;
    this.container.addEventListener("click", (e) => {
      const target = e.target;
      if (!target.matches("button")) {
        this.toggle();
      }
    });
    (_a2 = this.elements.btnApply) == null ? void 0 : _a2.addEventListener("click", () => this.handleApply());
    (_b = this.elements.btnCopy) == null ? void 0 : _b.addEventListener("click", () => this.handleCopy());
    (_c = this.elements.btnDelete) == null ? void 0 : _c.addEventListener("click", () => this.handleDelete());
  }
  /**
   * Toggle button-group visibility
   */
  toggle() {
    var _a2, _b;
    this.isExpanded = !this.isExpanded;
    if (this.elements.buttonGroup) {
      this.elements.buttonGroup.classList.toggle("collapsed", !this.isExpanded);
    }
    (_b = (_a2 = this.callbacks).onSelect) == null ? void 0 : _b.call(_a2, this);
  }
  /**
   * Expand button-group
   */
  expand() {
    this.isExpanded = true;
    if (this.elements.buttonGroup) {
      this.elements.buttonGroup.classList.remove("collapsed");
    }
  }
  /**
   * Collapse button-group
   */
  collapse() {
    this.isExpanded = false;
    if (this.elements.buttonGroup) {
      this.elements.buttonGroup.classList.add("collapsed");
    }
  }
  /**
   * Check if expanded
   */
  getIsExpanded() {
    return this.isExpanded;
  }
  /**
   * Handle apply button click
   */
  async handleApply() {
    var _a2, _b;
    if (this.elements.btnApply) {
      this.elements.btnApply.disabled = true;
    }
    try {
      await ((_b = (_a2 = this.callbacks).onApply) == null ? void 0 : _b.call(_a2, this));
    } finally {
      if (this.elements.btnApply && !this.isActive) {
        this.elements.btnApply.disabled = false;
      }
    }
  }
  /**
   * Handle copy button click
   */
  async handleCopy() {
    var _a2, _b;
    if (this.elements.btnCopy) {
      this.elements.btnCopy.disabled = true;
    }
    try {
      await ((_b = (_a2 = this.callbacks).onCopy) == null ? void 0 : _b.call(_a2, this));
    } finally {
      if (this.elements.btnCopy) {
        this.elements.btnCopy.disabled = false;
      }
    }
  }
  /**
   * Handle delete button click
   */
  async handleDelete() {
    var _a2, _b;
    if (this.elements.btnDelete) {
      this.elements.btnDelete.disabled = true;
    }
    try {
      await ((_b = (_a2 = this.callbacks).onDelete) == null ? void 0 : _b.call(_a2, this));
    } finally {
      if (this.elements.btnDelete) {
        this.elements.btnDelete.disabled = false;
      }
    }
  }
  /**
   * Load config and update display
   */
  async loadConfig() {
    try {
      const result = await printConfig(this.configPath);
      if (result.errno === 0 && result.stdout) {
        const configMap = parseConfig(result.stdout);
        this.updateDisplay(configMap);
        printToConsole(`Profile loaded: ${this.getProfileName()}`, LogLevel.DEBUG);
      } else {
        printToConsole(`Failed to load profile: ${this.getProfileName()}`, LogLevel.ERROR);
      }
    } catch (e) {
      printToConsole(`Config error: ${e}`, LogLevel.ERROR);
    }
  }
  /**
   * Update display with config data
   */
  updateDisplay(configMap) {
    const chargeLimit = configMap.pause_capacity || configMap.capacity || "-";
    const resumeCharge = configMap.resume_capacity || "-";
    const pauseAt = `${chargeLimit}%`;
    this.elements.chargeLimit.textContent = chargeLimit + (chargeLimit !== "-" ? "%" : "");
    this.elements.resumeCharge.textContent = resumeCharge + (resumeCharge !== "-" ? "%" : "");
    this.elements.pauseAt.textContent = pauseAt;
  }
  /**
   * Set active state (highlight current profile)
   */
  setActive(active) {
    this.isActive = active;
    if (active) {
      this.container.classList.add("active-profile");
      if (this.elements.btnApply) {
        this.elements.btnApply.disabled = true;
      }
      if (this.elements.btnDelete) {
        this.elements.btnDelete.disabled = true;
      }
    } else {
      this.container.classList.remove("active-profile");
      if (this.elements.btnApply) {
        this.elements.btnApply.disabled = false;
      }
      if (this.elements.btnDelete) {
        this.elements.btnDelete.disabled = this.isStartup;
      }
    }
  }
  /**
   * Check if active
   */
  getIsActive() {
    return this.isActive;
  }
  /**
   * Get container element
   */
  getElement() {
    return this.container;
  }
  /**
   * Destroy card (remove from DOM)
   */
  destroy() {
    this.container.remove();
  }
}
const cards = /* @__PURE__ */ new Map();
let activePath = "";
let container = null;
let ProfilePanelName = "current-profile-profile";
async function initializeProfileTab() {
}
function clearCard() {
  container = document.getElementById("profile-container");
  if (!container) {
    printToConsole("Profile container not found", LogLevel.ERROR);
    return null;
  }
  cards.clear();
  container.innerHTML = "";
  return container;
}
async function refreshProfile() {
  clearCard();
  setTimeout(async () => {
    await checkAccdProfile(ProfilePanelName);
    let currentProfile = getAccProfilePath();
    if (currentProfile) {
      setProfilePanel(ProfilePanelName, currentProfile);
    }
    await addCard(startupProfilePath, true);
    const profilesResult = await loadProfilesPath();
    if (profilesResult.errno === 0 && profilesResult.stdout) {
      profilesResult.stdout.trim().split("\n").filter((line) => line.trim()).forEach((filePath) => {
        addCard(filePath.trim(), false);
      });
    }
    activePath = currentProfile;
    setActiveCard(activePath);
  }, 0);
}
function handleSelect(selectedCard) {
  cards.forEach((card) => {
    if (card !== selectedCard && card.getIsExpanded()) {
      card.collapse();
    }
  });
}
async function addCard(configPath, isStartup) {
  const card = new ProfileCard({
    configPath,
    isStartup,
    onApply: handleApply,
    onCopy: handleCopy,
    onDelete: handleDelete,
    onSelect: handleSelect
  });
  cards.set(configPath, card);
  container == null ? void 0 : container.appendChild(card.getElement());
  await card.loadConfig();
  return card;
}
function setActiveCard(path) {
  activePath = path;
  cards.forEach((card, cardPath) => {
    card.setActive(cardPath === path);
  });
}
async function handleApply(card) {
  const path = card.getConfigPath();
  await setAccProfilePath(path);
  return new Promise((resolve) => {
    restartAccdSpawn({
      onExit: (code) => {
        if (code === 0) {
          setProfilePanel(ProfilePanelName, path);
          setActiveCard(path);
          printToNotify(`Profile applied : ${path}`);
        } else {
          printToConsole(`Failed to apply profile (exit code: ${code})`, LogLevel.ERROR);
        }
        resolve();
      },
      onError: (err) => {
        printToConsole(`Apply error: ${err}`, LogLevel.ERROR);
        resolve();
      }
    });
  });
}
async function handleCopy(card) {
  const path = card.getConfigPath();
  const profileName = await customPrompt("please input new Profile Name(without blank):");
  if (profileName === null || !profileName) {
    return;
  }
  try {
    await createProfileDir();
    const newPath = `${dataDir}/profiles/${profileName.replaceAll(" ", "")}.conf`;
    const result = await copyProfile(path, newPath);
    if (result.errno === 0) {
      await addCard(newPath, false);
    } else {
      printToConsole(`Failed to copy profile: ${result.stderr}`, LogLevel.ERROR);
    }
  } catch (e) {
    printToConsole(`Copy error: ${e}`, LogLevel.ERROR);
  } finally {
    refreshProfile();
  }
}
async function handleDelete(card) {
  const path = card.getConfigPath();
  if (path === startupProfilePath) {
    printToNotify("Cannot delete startup profile", LogLevel.WARN);
    return;
  }
  try {
    const result = await deleteProfile(path);
    if (result.errno === 0) {
      cards.delete(path);
      card.destroy();
    } else {
      printToConsole(`Failed to delete profile: ${result.stderr}`, LogLevel.ERROR);
    }
  } catch (e) {
    printToConsole(`Delete error: ${e}`, LogLevel.ERROR);
  } finally {
    refreshProfile();
  }
}
setNotificationListener((message, level) => {
  const errorBox = $$1("error-display");
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.className = `error-box ${level.toLowerCase()}`;
  errorBox.style.display = "block";
  setTimeout(hideNotification, 5e3);
});
function hideNotification() {
  const errorBox = $$1("error-display");
  if (errorBox) errorBox.style.display = "none";
}
async function verifySystem() {
  printToConsole("Starting system verification...");
  window.verifySystem = verifySystem;
  const rootStatus = $$1("root-status");
  const accInstallStatus = $$1("acc-install-status");
  if (rootStatus) {
    rootStatus.textContent = "Checking...";
    updateStatusClass($$1("root-status"), false);
  }
  if (accInstallStatus) {
    accInstallStatus.textContent = "Checking...";
    updateStatusClass($$1("acc-install-status"), false);
  }
  try {
    await verifyRootAccess();
    verifyAccInstallation();
    await initializeUI();
  } catch (e) {
    printToNotify(`System verification failed: ${e}`, LogLevel.ERROR);
  } finally {
    hideLoadingOverlay();
  }
}
async function verifyRootAccess() {
  printToConsole("Checking root access...");
  const rootStatus = $$1("root-status");
  const idResult = await checkId();
  const hasRoot = idResult.errno === 0 && idResult.stdout.includes("uid=0");
  if (rootStatus) {
    rootStatus.textContent = hasRoot ? "Root access OK" : "Root access failed";
    updateStatusClass(rootStatus, hasRoot);
  }
  if (!hasRoot) {
    throw new Error("Root access not granted");
  }
}
function verifyAccInstallation() {
  const accPath = getAccPath();
  if (accPath) {
    const accInstallStatus = $$1("acc-install-status");
    if (accInstallStatus) {
      accInstallStatus.textContent = `Found at ${accPath}`;
      updateStatusClass(accInstallStatus, true);
    }
    const accVersionEl = $$1("acc-version");
    if (accVersionEl) {
      const version = getAccVersion();
      accVersionEl.textContent = version;
      updateStatusClass(accVersionEl, true);
    }
  }
}
async function initializeUI() {
  const controlPanel = $$1("control-panel");
  const profilePanel = $$1("profile-container");
  const logPanel = $$1("log-panel");
  const maintenancePanel = $$1("maintenance-panel");
  const settingsPanel = $$1("settings-panel");
  if (controlPanel) controlPanel.style.display = "block";
  if (profilePanel) profilePanel.style.display = "block";
  if (logPanel) logPanel.style.display = "block";
  if (maintenancePanel) maintenancePanel.style.display = "block";
  if (settingsPanel) settingsPanel.style.display = "block";
  initializeMainTabs();
  initializeDebugMode();
  initializeStatusTab();
  initializeLogsTab();
  initializeMaintenanceTab();
  initializeSettingsTab();
  initializeProfileTab();
  window.addEventListener("click", handleModalClick);
  refreshStatus();
}
function handleModalClick(event) {
  const target = event.target;
  if (target.classList.contains("modal")) {
    target.style.display = "none";
  }
}
function initializeMainTabs() {
  const navButtons = document.querySelectorAll(".nav-button");
  navButtons.forEach((button) => {
    button.addEventListener("click", handleNavButtonClick);
  });
}
function handleNavButtonClick(e) {
  const button = e.currentTarget;
  const tabId = button.getAttribute("data-main-tab");
  if (button.classList.contains("active")) {
    return;
  }
  document.querySelectorAll(".nav-button").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".main-tab-pane").forEach((pane) => pane.classList.remove("active"));
  button.classList.add("active");
  if (tabId) {
    const tab = $$1(tabId);
    if (tab) tab.classList.add("active");
    switch (tabId) {
      case "status-tab":
        refreshStatus();
        break;
      case "profile-tab":
        refreshProfile();
        break;
      case "settings-tab":
        refreshSettings();
        break;
    }
  }
  printToConsole(`Switched to tab: ${tabId}`, LogLevel.DEBUG);
}
function hideLoadingOverlay() {
  const overlay = $$1("loading-overlay");
  if (overlay) {
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.3s ease";
    setTimeout(() => {
      overlay.style.display = "none";
    }, 300);
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!checkKSUEnvironment()) {
      printToNotify("KernelSU API not available.", LogLevel.ERROR);
      return;
    }
    const initLogResult = await initLogDirectory();
    if (initLogResult.errno !== 0) {
      printToNotify(`Logging initialization failed`, LogLevel.ERROR);
      return;
    }
    if (!await initAccPath()) {
      printToNotify("ACC binary not found", LogLevel.ERROR);
      return;
    }
    await verifySystem();
  } catch (e) {
    printToNotify(`Initialization failed: ${e}`, LogLevel.ERROR);
  }
});
