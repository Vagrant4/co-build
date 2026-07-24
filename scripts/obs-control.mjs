const mode = process.argv[2] || "start";
const targetUrl = process.argv[3] || "about:blank";
const sceneName = "Scene";
const browserInputName = "Co-Build Browser Capture";
const monitorInputPrefix = "Co-Build Monitor Capture";
const port = process.env.OBS_WS_PORT || "4455";
const password = process.env.OBS_WS_PASSWORD || "";
const recordingPath = process.env.OBS_RECORDING_PATH || "";
const wsUrl = `ws://127.0.0.1:${port}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sha256Base64(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Buffer.from(digest).toString("base64");
}

async function buildAuthentication(auth) {
  if (!auth) return undefined;
  if (!password) throw new Error("OBS WebSocket requires authentication, but OBS_WS_PASSWORD is empty.");
  const secret = await sha256Base64(password + auth.salt);
  return sha256Base64(secret + auth.challenge);
}

async function connectObs() {
  let lastError;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      return await new Promise((resolve, reject) => {
        const pending = new Map();
        let requestId = 1;
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => reject(new Error("OBS WebSocket connect timeout")), 5000);

        const api = {
          request(type, data = {}) {
            return new Promise((reqResolve, reqReject) => {
              const id = String(requestId++);
              pending.set(id, { resolve: reqResolve, reject: reqReject });
              ws.send(JSON.stringify({ op: 6, d: { requestType: type, requestId: id, requestData: data } }));
              setTimeout(() => {
                if (pending.has(id)) {
                  pending.delete(id);
                  reqReject(new Error(`${type} timed out`));
                }
              }, 12000);
            });
          },
          close() {
            try { ws.close(); } catch {}
          }
        };

        ws.addEventListener("message", async (event) => {
          const message = JSON.parse(event.data);
          if (message.op === 0) {
            const authentication = await buildAuthentication(message.d.authentication);
            ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, eventSubscriptions: 0, ...(authentication ? { authentication } : {}) } }));
            return;
          }
          if (message.op === 2) {
            clearTimeout(timeout);
            resolve(api);
            return;
          }
          if (message.op === 7) {
            const id = message.d.requestId;
            const pendingRequest = pending.get(id);
            if (!pendingRequest) return;
            pending.delete(id);
            if (message.d.requestStatus?.result) {
              pendingRequest.resolve(message.d.responseData || {});
            } else {
              pendingRequest.reject(new Error(`${message.d.requestType} failed: ${message.d.requestStatus?.comment || "unknown error"}`));
            }
          }
        });
        ws.addEventListener("error", () => reject(new Error("OBS WebSocket connection failed")));
      });
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }
  throw lastError || new Error("Could not connect to OBS WebSocket. Enable OBS Tools > WebSocket Server Settings > Enable WebSocket server.");
}

async function saveSourceScreenshot(obs, sourceName, outputPath) {
  await sleep(1500);
  const screenshot = await obs.request("GetSourceScreenshot", {
    sourceName,
    imageFormat: "png",
    imageWidth: 1920,
    imageHeight: 1080,
    imageCompressionQuality: 100
  });
  const base64 = screenshot.imageData.replace(/^data:image\/png;base64,/, "");
  const fs = await import("node:fs");
  fs.writeFileSync(outputPath, Buffer.from(base64, "base64"));
}

async function disableOtherSceneItems(obs, keepSourceName) {
  const sceneItems = await obs.request("GetSceneItemList", { sceneName });
  for (const sceneItem of sceneItems.sceneItems || []) {
    await obs.request("SetSceneItemEnabled", {
      sceneName,
      sceneItemId: sceneItem.sceneItemId,
      sceneItemEnabled: sceneItem.sourceName === keepSourceName
    });
  }
  return (sceneItems.sceneItems || []).find((item) => item.sourceName === keepSourceName);
}

async function fitSceneItem(obs, sceneItemId) {
  await obs.request("SetSceneItemTransform", {
    sceneName,
    sceneItemId,
    sceneItemTransform: {
      positionX: 0,
      positionY: 0,
      scaleX: 1,
      scaleY: 1,
      boundsType: "OBS_BOUNDS_STRETCH",
      boundsWidth: 1920,
      boundsHeight: 1080
    }
  });
}

async function ensureBrowserCapture(obs, url = targetUrl) {
  const inputs = await obs.request("GetInputList");
  const exists = (inputs.inputs || []).some((input) => input.inputName === browserInputName);
  const settings = { url, width: 1920, height: 1080, fps: 30, reroute_audio: false, restart_when_active: true };

  if (!exists) {
    const kindResult = await obs.request("GetInputKindList");
    const kinds = kindResult.inputKinds || [];
    const kind = kinds.includes("browser_source") ? "browser_source" : kinds.find((item) => item.includes("browser"));
    if (!kind) throw new Error(`No OBS browser source input kind found. Available: ${kinds.join(", ")}`);
    await obs.request("CreateInput", { sceneName, inputName: browserInputName, inputKind: kind, inputSettings: settings, sceneItemEnabled: true });
  } else {
    await obs.request("SetInputSettings", { inputName: browserInputName, inputSettings: settings, overlay: true });
  }
  const item = await disableOtherSceneItems(obs, browserInputName);
  if (!item) throw new Error(`OBS input "${browserInputName}" was created but is not in scene "${sceneName}".`);
  await fitSceneItem(obs, item.sceneItemId);
  return item;
}

async function ensureMonitorCapture(obs, monitorIndex = 0) {
  const inputName = `${monitorInputPrefix} ${monitorIndex}`;
  const inputs = await obs.request("GetInputList");
  const exists = (inputs.inputs || []).some((input) => input.inputName === inputName);
  const settings = { monitor: Number(monitorIndex), capture_cursor: true, method: 2 };
  if (!exists) {
    const kindResult = await obs.request("GetInputKindList");
    const kinds = kindResult.inputKinds || [];
    const kind = kinds.includes("monitor_capture") ? "monitor_capture" : kinds.find((item) => item.includes("monitor") || item.includes("display"));
    if (!kind) throw new Error(`No display capture input kind found. Available: ${kinds.join(", ")}`);
    await obs.request("CreateInput", { sceneName, inputName, inputKind: kind, inputSettings: settings, sceneItemEnabled: true });
  } else {
    await obs.request("SetInputSettings", { inputName, inputSettings: settings, overlay: true });
  }
  const item = await disableOtherSceneItems(obs, inputName);
  if (!item) throw new Error(`OBS input "${inputName}" was created but is not in scene "${sceneName}".`);
  await fitSceneItem(obs, item.sceneItemId);
  return { inputName, item };
}

async function configureRecordingOutput(obs) {
  if (!recordingPath) return;
  const updates = [
    ["SimpleOutput", "FilePath", recordingPath],
    ["SimpleOutput", "RecEncoder", "x264"],
    ["SimpleOutput", "RecFormat2", "hybrid_mp4"],
    ["AdvOut", "RecFilePath", recordingPath],
    ["AdvOut", "FFFilePath", recordingPath]
  ];
  for (const [parameterCategory, parameterName, parameterValue] of updates) {
    try { await obs.request("SetProfileParameter", { parameterCategory, parameterName, parameterValue }); } catch {}
  }
}

async function waitForRecordStatus(obs, expectedActive) {
  let lastStatus;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    lastStatus = await obs.request("GetRecordStatus");
    if (Boolean(lastStatus.outputActive) === expectedActive) return lastStatus;
    await sleep(500);
  }
  throw new Error(`OBS recording status did not become ${expectedActive ? "active" : "inactive"}. Last status: ${JSON.stringify(lastStatus)}`);
}

async function main() {
  const obs = await connectObs();
  try {
    if (mode === "start") {
      await configureRecordingOutput(obs);
      const monitorIndex = process.env.OBS_MONITOR_INDEX ?? "0";
      const { inputName } = await ensureMonitorCapture(obs, monitorIndex);
      try { await obs.request("SetCurrentProgramScene", { sceneName }); } catch {}
      const status = await obs.request("GetRecordStatus");
      console.log(`OBS_RECORDING_STATUS_BEFORE ${JSON.stringify(status)}`);
      if (status.outputActive) {
        await obs.request("StopRecord");
        await waitForRecordStatus(obs, false);
      }
      await obs.request("StartRecord");
      const activeStatus = await waitForRecordStatus(obs, true);
      console.log(`OBS_RECORDING_STARTED source=${inputName} ${JSON.stringify(activeStatus)}`);
    } else if (mode === "monitor-screenshot") {
      const outputPath = process.argv[3];
      const monitorIndex = process.argv[4] || "0";
      if (!outputPath) throw new Error("monitor-screenshot mode requires an output path.");
      const { inputName } = await ensureMonitorCapture(obs, monitorIndex);
      await saveSourceScreenshot(obs, inputName, outputPath);
      console.log(`OBS_MONITOR_SCREENSHOT monitor=${monitorIndex} path=${outputPath}`);
    } else if (mode === "screenshot") {
      const outputPath = process.argv[3];
      const url = process.argv[4] || "about:blank";
      if (!outputPath) throw new Error("screenshot mode requires an output path.");
      await ensureBrowserCapture(obs, url);
      await saveSourceScreenshot(obs, browserInputName, outputPath);
      console.log(`OBS_SCREENSHOT=${outputPath}`);
    } else if (mode === "page") {
      console.log(`OBS_CAPTURE_MODE=monitor page=${targetUrl}`);
    } else if (mode === "stop") {
      const status = await obs.request("GetRecordStatus");
      if (status.outputActive) {
        const result = await obs.request("StopRecord");
        const stoppedStatus = await waitForRecordStatus(obs, false);
        console.log(`OBS_RECORDING_STOPPED ${JSON.stringify({ result, stoppedStatus })}`);
      } else {
        console.log(`OBS_RECORDING_ALREADY_STOPPED ${JSON.stringify(status)}`);
      }
    } else if (mode === "status") {
      const recordStatus = await obs.request("GetRecordStatus");
      const inputs = await obs.request("GetInputList");
      const sceneItems = await obs.request("GetSceneItemList", { sceneName });
      const kinds = await obs.request("GetInputKindList");
      console.log(JSON.stringify({ recordStatus, inputs: inputs.inputs, sceneItems: sceneItems.sceneItems, inputKinds: kinds.inputKinds }, null, 2));
    } else {
      throw new Error(`Unknown mode: ${mode}`);
    }
  } finally {
    obs.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
