/* DAWSheet Proxy UI */
(function () {
  const jobsEl = document.getElementById("jobs");
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  const liveDot = document.getElementById("liveDot");
  const liveText = document.getElementById("liveText");
  const statusFilter = document.getElementById("statusFilter");
  const searchJobs = document.getElementById("searchJobs");
  const toasts = document.getElementById("toasts");
  const clearBtn = document.getElementById("clearCompleted");

  function setLive(connected, mode) {
    liveDot.className = "dot" + (connected ? " ok" : "");
    liveText.textContent =
      (connected ? "Connected" : "Disconnected") + " (" + mode + ")";
  }
  function statusClass(s) {
    if (!s) return "st-queued";
    s = s.toString().toLowerCase();
    if (s === "running") return "st-running";
    if (s === "cancelling") return "st-cancelling";
    if (s === "queued") return "st-queued";
    if (s === "done") return "st-done";
    if (s === "cancelled") return "st-cancelled";
    if (s === "error") return "st-error";
    return "st-queued";
  }
  function rowClass(s) {
    if (!s) return "";
    s = s.toString().toLowerCase();
    if (s === "running") return "running";
    if (s === "cancelling") return "cancelling";
    if (s === "done") return "done";
    if (s === "cancelled") return "cancelled";
    if (s === "error") return "error";
    return "";
  }

  async function fetchJobs() {
    try {
      const r = await fetch("/playback");
      const j = await r.json();
      renderJobs(j);
    } catch (e) {
      jobsEl.innerText = "Failed to load jobs: " + e;
    }
  }

  function renderJobs(j) {
    if (!Array.isArray(j)) {
      jobsEl.innerText = JSON.stringify(j);
      return;
    }
    // apply filters
    const sf = ((statusFilter && statusFilter.value) || "")
      .trim()
      .toLowerCase();
    const q = ((searchJobs && searchJobs.value) || "").trim().toLowerCase();
    let list = j;
    if (sf)
      list = list.filter((it) => String(it.status || "").toLowerCase() === sf);
    if (q)
      list = list.filter((it) => JSON.stringify(it).toLowerCase().includes(q));

    if (list.length === 0) {
      jobsEl.innerHTML = "<i>No jobs</i>";
      return;
    }
    let html =
      '<table class="grid"><tr><th>enqueue_id</th><th>status</th><th>progress</th><th>device_id</th><th>commands_count</th><th>ts</th></tr>';
    for (const it of list) {
      const st = it.status || "";
      const cls = rowClass(st);
      const badge =
        '<span class="status-badge ' +
        statusClass(st) +
        '">' +
        (st || "") +
        "</span>";
      html +=
        '<tr class="clickable ' +
        cls +
        '" data-id="' +
        (it.id || it.enqueue_id || "") +
        '">' +
        "<td>" +
        (it.enqueue_id || "") +
        "</td>" +
        "<td>" +
        badge +
        "</td>" +
        "<td>" +
        (it.progress || 0) +
        "%</td>" +
        "<td>" +
        (it.device_id || "") +
        "</td>" +
        "<td>" +
        (it.commands_count || 0) +
        "</td>" +
        "<td>" +
        (it.ts || "") +
        "</td>" +
        "</tr>";
    }
    html += "</table>";
    jobsEl.innerHTML = html;
    document
      .querySelectorAll("tr.clickable")
      .forEach((r) =>
        r.addEventListener("click", () => openDetail(r.getAttribute("data-id")))
      );
  }

  function showModal(html) {
    modalBody.innerHTML = html;
    modal.style.display = "flex";
  }
  function closeModal() {
    modal.style.display = "none";
  }
  async function openDetail(id) {
    try {
      const r = await fetch("/playback/" + encodeURIComponent(id));
      const j = await r.json();
      let detail = "<h3>Job " + id + "</h3>";
      detail += "<div>Status: <strong>" + (j.status || "") + "</strong></div>";
      detail += "<pre>" + JSON.stringify(j, null, 2) + "</pre>";
      showModal(detail);
      document.getElementById("cancelJob").onclick = async () => {
        if (!confirm("Cancel job " + id + "?")) return;
        try {
          const resp = await fetch(
            "/playback/" + encodeURIComponent(id) + "/cancel",
            { method: "POST" }
          );
          const jr = await resp.json();
          alert("Cancel response: " + JSON.stringify(jr));
          closeModal();
          fetchJobs();
        } catch (e) {
          alert("Cancel failed: " + e);
        }
      };
    } catch (e) {
      alert("Failed to load job: " + e);
    }
  }

  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("refresh").addEventListener("click", fetchJobs);
  document.getElementById("enqueue").addEventListener("click", async () => {
    const note = document.getElementById("note").value || "C4";
    const vel = parseInt(document.getElementById("velocity").value || "100");
    const dur = parseFloat(document.getElementById("duration").value || "0.2");
    const envelope = {
      cmd: "PLAYBACK.ENQUEUE",
      id: null,
      body: {
        description: "ui-enqueue",
        device_id: "",
        commands: [
          {
            type: "NOTE.PLAY",
            payload: { note, velocity: vel, durationSec: dur },
          },
        ],
        intervalMs: 200,
      },
    };
    try {
      const r = await fetch("/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      });
      const res = await r.json();
      alert("Enqueue response: " + JSON.stringify(res));
      fetchJobs();
    } catch (e) {
      alert("Enqueue failed: " + e);
    }
  });

  function toast(msg, kind) {
    if (!toasts) return alert(msg);
    const t = document.createElement("div");
    t.className = "toast" + (kind ? " " + kind : "");
    t.textContent = msg;
    toasts.appendChild(t);
    setTimeout(() => {
      t.remove();
    }, 2500);
  }

  if (statusFilter) statusFilter.addEventListener("change", fetchJobs);
  if (searchJobs) searchJobs.addEventListener("input", fetchJobs);
  if (clearBtn)
    clearBtn.addEventListener("click", async () => {
      try {
        const r = await fetch("/playback/prune", { method: "POST" });
        const jr = await r.json();
        toast(`Removed ${jr.removed} items`, "ok");
        fetchJobs();
      } catch (e) {
        toast("Prune failed: " + e, "err");
      }
    });

  // SSE / Polling
  let es = null,
    pollTimer = null;
  function stopSSE() {
    if (es) {
      try {
        es.close();
      } catch (_) {}
      es = null;
    }
  }
  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }
  function startSSE() {
    stopPolling();
    if (!window.EventSource) {
      startPolling();
      document.getElementById("toggleSSE").checked = false;
      return;
    }
    try {
      es = new EventSource("/events");
      es.onopen = () => setLive(true, "SSE");
      es.addEventListener("snapshot", (ev) => {
        try {
          const data = JSON.parse(ev.data);
          renderJobs(data);
        } catch (e) {}
      });
      es.addEventListener("ping", () => {
        fetchJobs();
      });
      es.onerror = () => {
        setLive(false, "SSE");
      };
    } catch (e) {
      setLive(false, "SSE");
      startPolling();
      document.getElementById("toggleSSE").checked = false;
    }
  }
  function startPolling() {
    stopSSE();
    setLive(true, "Polling");
    pollTimer = setInterval(fetchJobs, 2000);
  }
  document.getElementById("toggleSSE").addEventListener("change", (ev) => {
    if (ev.target.checked) {
      startSSE();
    } else {
      startPolling();
    }
  });

  // REAPER controls
  document
    .querySelectorAll("[data-reaper]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        sendReaper({ cmd: btn.getAttribute("data-reaper") })
      )
    );
  document.getElementById("gotoIdx").addEventListener("click", () =>
    sendReaper({
      cmd: "REAPER.GOTO.MARKER_INDEX",
      body: {
        index: parseInt(document.getElementById("mkIndex").value || "1"),
      },
    })
  );
  document.getElementById("gotoName").addEventListener("click", () =>
    sendReaper({
      cmd: "REAPER.GOTO.MARKER_NAME",
      body: { name: document.getElementById("mkName").value || "" },
    })
  );
  document.getElementById("gotoTime").addEventListener("click", () =>
    sendReaper({
      cmd: "REAPER.SET.TIME_SECONDS",
      body: {
        seconds: parseFloat(document.getElementById("mkTime").value || "0"),
      },
    })
  );
  document.getElementById("trkMuteBtn").addEventListener("click", () =>
    sendReaper({
      cmd: "REAPER.TRACK.MUTE",
      body: {
        index: parseInt(document.getElementById("trkIndex").value || "1"),
        on: !!document.getElementById("trkMute").checked,
      },
    })
  );
  async function sendReaper({ cmd, body }) {
    try {
      const res = await fetch("/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd, id: null, body: body || {} }),
      });
      const jr = await res.json();
      alert(JSON.stringify(jr));
    } catch (e) {
      alert("REAPER command failed: " + e);
    }
  }

  // Arrangement validate
  document.getElementById("validate").addEventListener("click", async () => {
    const txt = document.getElementById("arrText").value;
    try {
      const obj = JSON.parse(txt);
      const r = await fetch("/arrangement/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj),
      });
      const jr = await r.json();
      document.getElementById("arrResult").textContent = JSON.stringify(
        jr,
        null,
        2
      );
    } catch (e) {
      document.getElementById("arrResult").textContent = "Invalid JSON: " + e;
    }
  });

  // init
  fetchJobs();
  startSSE();
})();
