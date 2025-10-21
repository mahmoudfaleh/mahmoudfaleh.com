// Register Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker Registered"));
}

// Tab Navigation
const pages = document.querySelectorAll(".page");
const buttons = document.querySelectorAll(".tab-bar button");

buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.page);
    const current = document.querySelector(".page.active");

    // Page transition
    if (current && current !== target) {
      current.classList.remove("active");
      setTimeout(() => {
        target.classList.add("active");
      }, 50);
    } else {
      target.classList.add("active");
    }

    // Highlight selected button
    buttons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Offline/Online Detection
const offlineStatus = document.getElementById("offline-status");
function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineStatus.textContent = "You are online ✅";
  } else {
    offlineStatus.textContent = "You are offline ❌ (using cached content)";
  }
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// Test functions
function checkSW() {
  const out = document.getElementById("test-output");
  if (navigator.serviceWorker.controller) {
    out.textContent = "Service Worker active: " + navigator.serviceWorker.controller.state;
  } else {
    out.textContent = "No active Service Worker.";
  }
}

function checkCache() {
  const out = document.getElementById("test-output");
  caches.keys().then(keys => out.textContent = "Caches: " + keys.join(", "));
}



const iframe = document.getElementById("consoleFrame");

// Inject console UI inside iframe
iframe.srcdoc = `
  <style>
    body { background:#000; color:#0f0; font-family:monospace; margin:0; padding:5px; }
    #console { height:100%; overflow-y:auto; }
    .log { color:#0f0; }
    .warn { color:#ff0; }
    .error { color:#f55; white-space:pre-wrap; }
    .info { color:#0ff; }
    .network { color:#f0f; }
  </style>
  <div id="console"></div>
  <script>
    window.addEventListener("message", e => {
      const {type, msg} = e.data;
      if (!type) return;
      const el = document.createElement("div");
      el.className = type;
      el.textContent = "["+type+"] " + msg;
      document.getElementById("console").appendChild(el);
      document.getElementById("console").scrollTop = 999999;
    });
  <\/script>
`;

// Queue for logs before iframe is ready
let messageQueue = [];
function pushMessage(type, msg) {
  messageQueue.push({ type, msg });
}

// --- Capture console.* ---
["log","warn","error","info"].forEach(type => {
  const original = console[type];
  console[type] = (...args) => {
    pushMessage(type, args.map(a => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "));
    original.apply(console, args);
  };
});

// --- Capture runtime errors ---
window.addEventListener("error", (event) => {
  pushMessage("error", event.message + " at " + event.filename + ":" + event.lineno);
});

// --- Capture unhandled promise rejections ---
window.addEventListener("unhandledrejection", (event) => {
  pushMessage("error", "Unhandled Promise Rejection: " + event.reason);
});

// --- Capture fetch errors ---
const origFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const res = await origFetch(...args);
    if (!res.ok) {
      pushMessage("network", "Fetch failed: " + args[0] + " → " + res.status + " " + res.statusText);
    }
    return res;
  } catch (err) {
    pushMessage("network", "Fetch error: " + args[0] + " → " + err);
    throw err;
  }
};

// --- Capture XHR errors ---
const origXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  this._url = url;
  return origXhrOpen.call(this, method, url, ...rest);
};
const origXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function(...args) {
  this.addEventListener("error", () => pushMessage("network", "XHR error: " + this._url));
  this.addEventListener("abort", () => pushMessage("network", "XHR aborted: " + this._url));
  this.addEventListener("load", () => {
    if (this.status >= 400) {
      pushMessage("network", "XHR failed: " + this._url + " → " + this.status + " " + this.statusText);
    }
  });
  return origXhrSend.apply(this, args);
};

// --- Flush queue once iframe ready ---
iframe.addEventListener("load", () => {
  messageQueue.forEach(entry => {
    iframe.contentWindow.postMessage(entry, "*");
  });
  messageQueue = [];

  // Live forwarder
  const forward = (type, msg) => iframe.contentWindow.postMessage({ type, msg }, "*");

  // Replace console again (direct forward)
  ["log","warn","error","info"].forEach(type => {
    const original = console[type];
    console[type] = (...args) => {
      const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : a)).join(" ");
      forward(type, msg);
      original.apply(console, args);
    };
  });

  // Runtime errors
  window.addEventListener("error", (event) => {
    forward("error", event.message + " at " + event.filename + ":" + event.lineno);
  });
  window.addEventListener("unhandledrejection", (event) => {
    forward("error", "Unhandled Promise Rejection: " + event.reason);
  });

  // Network already patched → just works

  console.log("✅ Custom console ready (capturing logs, errors, rejections, network).");
});





// Prevent dragging/panning outside main content
document.addEventListener('touchmove', function(e) {
  if (!e.target.closest('main')) {
    e.preventDefault();
  }
}, { passive: false });

// Optional: prevent double-tap zoom on iOS
let lastTouch = 0;
document.addEventListener('touchend', function(e) {
  const now = new Date().getTime();
  if (now - lastTouch <= 300) {
    e.preventDefault();
  }
  lastTouch = now;
}, false);


document.addEventListener("DOMContentLoaded", () => {
  const clearCacheBtn = document.getElementById("clearCacheBtn");
  const confirmModal = document.getElementById("confirmModal");
  const cancelBtn = document.getElementById("cancelBtn");
  const confirmBtn = document.getElementById("confirmBtn");

  const testMode = false; // <-- set to true to auto-show modal

  // Show modal if testMode is true
  if (testMode) {
    confirmModal.style.display = "flex"; // make sure CSS allows display:flex
  }

  clearCacheBtn.addEventListener("click", () => {
    confirmModal.style.display = "flex";
  });

  cancelBtn.addEventListener("click", () => {
    confirmModal.style.display = "none";
  });

  confirmBtn.addEventListener("click", async () => {
    confirmModal.style.display = "none";
    await clearAppCache();
  });
});



async function clearAppCache() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      console.log("✅ All CacheStorage cleared");
    }

    localStorage.clear();
    sessionStorage.clear();
    console.log("✅ localStorage & sessionStorage cleared");

    if (window.indexedDB && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map(db => indexedDB.deleteDatabase(db.name)));
      console.log("✅ IndexedDB cleared");
    }

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let reg of regs) {
        await reg.unregister();
        console.log("✅ Service Worker unregistered:", reg.scope);
      }
    }

    
    location.reload(true);

  } catch (err) {
    console.error("❌ Error clearing app cache:", err);
    alert("Failed to clear cache. Check console for details.");
  }
}






