/* ============================================================
   ENB Economic & MSME Survey — Supabase connection manager
   ------------------------------------------------------------
   Instead of hardcoding the Supabase URL/key in this file, the
   app asks for them once per device (a small setup screen) and
   remembers them in this browser via localStorage. This keeps
   credentials out of the codebase entirely — only people who
   are given the URL/key by you can connect this app to your data.

   Exposes: window.ENBConnection.getClient() -> Supabase client or null
            window.ENBConnection.requireConnection(onReady) -> shows
              setup screen if not connected, else calls onReady(client)
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "enb_survey_supabase_connection";

  function loadSavedConnection() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.url && parsed.key) return parsed;
      return null;
    } catch (e) {
      return null;
    }
  }

  function saveConnection(url, key) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key }));
  }

  function clearConnection() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function buildClient(url, key) {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("Supabase library did not load from CDN.");
      return null;
    }
    try {
      return window.supabase.createClient(url, key);
    } catch (e) {
      console.error("Could not create Supabase client:", e);
      return null;
    }
  }

  let cachedClient = null;

  function getClient() {
    if (cachedClient) return cachedClient;
    const saved = loadSavedConnection();
    if (!saved) return null;
    cachedClient = buildClient(saved.url, saved.key);
    return cachedClient;
  }

  // ---------------- Setup screen UI ----------------

  function buildSetupScreen(onConnected) {
    const overlay = document.createElement("div");
    overlay.id = "connectionSetupOverlay";
    overlay.className = "conn-overlay";
    overlay.innerHTML = `
      <div class="conn-card">
        <p class="header-eyebrow" style="color:var(--cocoa)">East New Britain Provincial Administration</p>
        <h2 class="conn-title">Connect this device</h2>
        <p class="conn-sub">Enter your Supabase project details once. They'll be remembered on this device only — never stored in the app's code.</p>

        <div class="field-group">
          <label for="connUrl">Supabase Project URL</label>
          <input type="text" id="connUrl" placeholder="https://your-project-ref.supabase.co">
        </div>
        <div class="field-group">
          <label for="connKey">Publishable (anon) Key</label>
          <input type="text" id="connKey" placeholder="sb_publishable_... or eyJ...">
          <p class="hint">Find both under Supabase → Project Settings → API. Never enter the "secret" or "service_role" key here.</p>
        </div>
        <p class="conn-error" id="connError" style="display:none"></p>
        <div class="conn-btn-row">
          <button class="btn btn-primary" id="connSaveBtn" type="button">Connect</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const urlInput = overlay.querySelector("#connUrl");
    const keyInput = overlay.querySelector("#connKey");
    const errorEl = overlay.querySelector("#connError");
    const saveBtn = overlay.querySelector("#connSaveBtn");

    // Pre-fill if there's a (possibly broken) saved connection, so the
    // person can see/correct what's there rather than retyping blind.
    const existing = loadSavedConnection();
    if (existing) {
      urlInput.value = existing.url;
      keyInput.value = existing.key;
    }

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = "";
    }

    saveBtn.addEventListener("click", async () => {
      const url = urlInput.value.trim();
      const key = keyInput.value.trim();
      errorEl.style.display = "none";

      if (!url || !key) {
        showError("Please enter both the project URL and the key.");
        return;
      }
      if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url)) {
        showError("That doesn't look like a Supabase URL — it should look like https://xxxx.supabase.co");
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Checking connection…";

      const testClient = buildClient(url, key);
      if (!testClient) {
        showError("Could not set up a connection with these details. Double-check the URL and key.");
        saveBtn.disabled = false;
        saveBtn.textContent = "Connect";
        return;
      }

      // Verify the credentials actually work against this project before
      // saving, so a typo doesn't get "saved" and fail silently later.
      try {
        const { error } = await testClient.from("surveys").select("id").limit(1);
        if (error) {
          showError("Connected, but Supabase rejected the request: " + error.message + ". Check the key is the publishable/anon key and that schema.sql has been run.");
          saveBtn.disabled = false;
          saveBtn.textContent = "Connect";
          return;
        }
      } catch (e) {
        showError("Could not reach Supabase with these details: " + (e.message || e));
        saveBtn.disabled = false;
        saveBtn.textContent = "Connect";
        return;
      }

      saveConnection(url, key);
      cachedClient = testClient;
      overlay.remove();
      onConnected(testClient);
    });
  }

  // ---------------- Public API ----------------

  function requireConnection(onReady) {
    const client = getClient();
    if (client) {
      onReady(client);
      return;
    }
    buildSetupScreen(onReady);
  }

  window.ENBConnection = {
    getClient,
    requireConnection,
    clearConnection,
    saveConnection,
    showSetupScreen: buildSetupScreen
  };
})();
