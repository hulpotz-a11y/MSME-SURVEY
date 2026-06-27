/* ============================================================
   ENB Economic & MSME Survey — dashboard logic
   ============================================================ */

(function () {
  "use strict";

  // See assets/connection.js — credentials are saved per-device via
  // localStorage instead of being hardcoded into this file.
  let supabase = window.ENBConnection.getClient();

  let allSurveys = [];
  let filtered = [];

  const toastEl = document.getElementById("toast");
  let toastTimer;
  function showToast(message, type = "") {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.className = "toast show" + (type ? " " + type : "");
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  function businessStatusOf(s) {
    if (s.business_sector === "formal") return "formal";
    if (s.business_sector === "informal") return "informal";
    return "none";
  }

  function businessStatusLabel(status) {
    return { formal: "Formal", informal: "Informal", none: "No business" }[status] || "—";
  }

  // ---------------- Fetch ----------------
  async function loadData() {
    if (!supabase) {
      window.ENBConnection.showSetupScreen((client) => {
        supabase = client;
        loadData();
      });
      return;
    }

    const { data, error } = await supabase
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Could not load data: " + error.message, "error");
      document.getElementById("dataTableBody").innerHTML =
        `<tr><td colspan="10" class="empty-row">Could not load records. Check your Supabase config in assets/config.js.</td></tr>`;
      return;
    }

    allSurveys = data || [];
    populateFilterOptions();
    applyFilters();
  }

  // ---------------- Filters ----------------
  function uniqueSorted(arr) {
    return [...new Set(arr.filter(Boolean))].sort();
  }

  function populateFilterOptions() {
    const districtSel = document.getElementById("filterDistrict");
    const llgSel = document.getElementById("filterLlg");
    const villageSel = document.getElementById("filterVillage");

    fillOptions(districtSel, uniqueSorted(allSurveys.map((s) => s.district)));
    fillOptions(llgSel, uniqueSorted(allSurveys.map((s) => s.llg)));
    fillOptions(villageSel, uniqueSorted(allSurveys.map((s) => s.village)));
  }

  function fillOptions(selectEl, values) {
    const current = selectEl.value;
    selectEl.innerHTML = '<option value="">All</option>';
    values.forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      selectEl.appendChild(o);
    });
    if (values.includes(current)) selectEl.value = current;
  }

  function applyFilters() {
    const district = document.getElementById("filterDistrict").value;
    const llg = document.getElementById("filterLlg").value;
    const village = document.getElementById("filterVillage").value;
    const business = document.getElementById("filterBusiness").value;
    const from = document.getElementById("filterFrom").value;
    const to = document.getElementById("filterTo").value;

    filtered = allSurveys.filter((s) => {
      if (district && s.district !== district) return false;
      if (llg && s.llg !== llg) return false;
      if (village && s.village !== village) return false;
      if (business && businessStatusOf(s) !== business) return false;
      if (from && s.date_collected && s.date_collected < from) return false;
      if (to && s.date_collected && s.date_collected > to) return false;
      return true;
    });

    renderKpis();
    renderCharts();
    renderTable();
  }

  ["filterDistrict", "filterLlg", "filterVillage", "filterBusiness", "filterFrom", "filterTo"].forEach((id) => {
    document.getElementById(id).addEventListener("change", applyFilters);
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    ["filterDistrict", "filterLlg", "filterVillage", "filterBusiness", "filterFrom", "filterTo"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    applyFilters();
  });

  // ---------------- KPIs ----------------
  function renderKpis() {
    document.getElementById("kpiTotal").textContent = filtered.length;
    document.getElementById("kpiFormal").textContent = filtered.filter((s) => businessStatusOf(s) === "formal").length;
    document.getElementById("kpiInformal").textContent = filtered.filter((s) => businessStatusOf(s) === "informal").length;
    document.getElementById("kpiNoBiz").textContent = filtered.filter((s) => businessStatusOf(s) === "none").length;
    document.getElementById("kpiVillages").textContent = uniqueSorted(filtered.map((s) => s.village)).length;
  }

  // ---------------- Simple horizontal bar chart renderer ----------------
  function renderBarChart(containerEl, dataMap, opts = {}) {
    const entries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]).slice(0, opts.limit || 8);
    containerEl.innerHTML = "";
    if (!entries.length) {
      containerEl.innerHTML = '<div class="chart-empty">No data for current filters</div>';
      return;
    }
    const max = Math.max(...entries.map((e) => e[1]));
    entries.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "bar-row";
      const pct = max ? Math.round((value / max) * 100) : 0;
      row.innerHTML = `
        <span class="bar-label" title="${label}">${label}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
        <span class="bar-value">${value}</span>
      `;
      containerEl.appendChild(row);
    });
  }

  function renderCharts() {
    // Business status
    const statusCounts = { Formal: 0, Informal: 0, "No business": 0 };
    filtered.forEach((s) => {
      const st = businessStatusOf(s);
      statusCounts[businessStatusLabel(st)]++;
    });
    renderBarChart(document.getElementById("chartBusinessStatus"), statusCounts);

    // Turnover bands
    const turnoverLabels = {};
    TURNOVER_BANDS.forEach((b) => (turnoverLabels[b.value] = b.label));
    const turnoverCounts = {};
    filtered.forEach((s) => {
      if (s.turnover_band) {
        const label = turnoverLabels[s.turnover_band] || s.turnover_band;
        turnoverCounts[label] = (turnoverCounts[label] || 0) + 1;
      }
    });
    renderBarChart(document.getElementById("chartTurnover"), turnoverCounts);

    // Business activities
    const activityCounts = {};
    filtered.forEach((s) => {
      if (s.business_activities && typeof s.business_activities === "object") {
        Object.keys(s.business_activities).forEach((k) => {
          if (s.business_activities[k]) activityCounts[k] = (activityCounts[k] || 0) + 1;
        });
      }
    });
    renderBarChart(document.getElementById("chartActivities"), activityCounts, { limit: 8 });

    // Cash crops
    const cropCounts = {};
    filtered.forEach((s) => {
      if (s.cash_crops && typeof s.cash_crops === "object") {
        Object.keys(s.cash_crops).forEach((crop) => {
          cropCounts[crop] = (cropCounts[crop] || 0) + 1;
        });
      }
    });
    renderBarChart(document.getElementById("chartCashCrops"), cropCounts);

    // Training required
    const trainingCounts = {};
    filtered.forEach((s) => {
      if (s.training_required && typeof s.training_required === "object") {
        Object.keys(s.training_required).forEach((t) => {
          if (s.training_required[t]) trainingCounts[t] = (trainingCounts[t] || 0) + 1;
        });
      }
    });
    renderBarChart(document.getElementById("chartTraining"), trainingCounts);

    // Loan access
    const loanCounts = { "Has loan access": 0, "No loan access": 0, "Not answered": 0 };
    filtered.forEach((s) => {
      if (s.has_business_loan === true) loanCounts["Has loan access"]++;
      else if (s.has_business_loan === false) loanCounts["No loan access"]++;
      else loanCounts["Not answered"]++;
    });
    renderBarChart(document.getElementById("chartLoans"), loanCounts);
  }

  // ---------------- Table ----------------
  function renderTable() {
    const tbody = document.getElementById("dataTableBody");
    document.getElementById("tableCount").textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-row">No records match the current filters.</td></tr>`;
      return;
    }

    const turnoverLabels = {};
    TURNOVER_BANDS.forEach((b) => (turnoverLabels[b.value] = b.label));

    tbody.innerHTML = "";
    filtered.forEach((s) => {
      const tr = document.createElement("tr");
      const status = businessStatusOf(s);
      tr.innerHTML = `
        <td>${s.date_collected || "—"}</td>
        <td>${s.district || "—"}</td>
        <td>${s.llg || "—"}</td>
        <td>${s.village || "—"}</td>
        <td>${s.ward || "—"}</td>
        <td>${s.household_no || "—"}</td>
        <td><span class="badge badge-${status}">${businessStatusLabel(status)}</span></td>
        <td>${s.business_name || "—"}</td>
        <td>${turnoverLabels[s.turnover_band] || "—"}</td>
        <td><button class="btn-view" data-id="${s.id}">View</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-view").forEach((btn) => {
      btn.addEventListener("click", () => openDetail(btn.dataset.id));
    });
  }

  // ---------------- Detail modal ----------------
  const backdrop = document.getElementById("detailBackdrop");
  const detailContent = document.getElementById("detailContent");

  function kv(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return `<div class="k">${label}</div><div class="v">${value}</div>`;
  }

  function checkedKeysList(obj) {
    if (!obj || typeof obj !== "object") return "";
    const keys = Object.keys(obj).filter((k) => obj[k]);
    if (!keys.length) return "<p class='hint'>None recorded.</p>";
    return `<ul class="detail-list">${keys.map((k) => `<li>${k}</li>`).join("")}</ul>`;
  }

  async function openDetail(id) {
    const survey = allSurveys.find((s) => s.id === id);
    if (!survey) return;

    detailContent.innerHTML = `<p class="hint">Loading…</p>`;
    backdrop.classList.add("show");

    const { data: employed } = await supabase.from("employed_family_members").select("*").eq("survey_id", id);
    const { data: unemployed } = await supabase.from("unemployed_qualified_members").select("*").eq("survey_id", id);

    const turnoverLabels = {};
    TURNOVER_BANDS.forEach((b) => (turnoverLabels[b.value] = b.label));

    const status = businessStatusOf(survey);

    detailContent.innerHTML = `
      <div class="detail-section">
        <h4>Location</h4>
        <div class="detail-grid">
          ${kv("District", survey.district)}
          ${kv("LLG", survey.llg)}
          ${kv("Village", survey.village)}
          ${kv("Ward", survey.ward)}
          ${kv("Household No.", survey.household_no)}
          ${kv("Date Collected", survey.date_collected)}
          ${kv("Contact", survey.contact_person)}
          ${kv("Mobile", survey.contact_mobile)}
        </div>
      </div>

      <div class="detail-section">
        <h4>Business Status</h4>
        <div class="detail-grid">
          ${kv("Status", `<span class="badge badge-${status}">${businessStatusLabel(status)}</span>`)}
          ${kv("Business Name", survey.business_name)}
          ${kv("Owner", survey.business_owner)}
          ${kv("Date Commenced", survey.business_date_commenced)}
        </div>
      </div>

      ${status !== "none" ? `
      <div class="detail-section">
        <h4>Business Activities</h4>
        ${checkedKeysList(survey.business_activities)}
      </div>` : ""}

      <div class="detail-section">
        <h4>Economic Output</h4>
        <div class="detail-grid">
          ${kv("Turnover Band", turnoverLabels[survey.turnover_band] || survey.turnover_band)}
          ${kv("Turnover Amount", survey.turnover_amount ? "K" + survey.turnover_amount : null)}
          ${kv("Expenses Band", survey.expenses_band)}
          ${kv("Initial Capital", survey.initial_capital ? "K" + survey.initial_capital : null)}
          ${kv("Value of Assets", survey.value_of_assets ? "K" + survey.value_of_assets : null)}
          ${kv("No. Casuals", survey.num_casuals)}
          ${kv("No. Permanent", survey.num_permanent)}
        </div>
      </div>

      <div class="detail-section">
        <h4>Cash Crops</h4>
        ${survey.cash_crops && Object.keys(survey.cash_crops).length
          ? `<ul class="detail-list">${Object.entries(survey.cash_crops).map(([crop, v]) =>
              `<li>${crop}${v.blocks || v.trees ? ` — ${v.blocks || 0} blocks, ${v.trees || 0} trees` : ""}</li>`).join("")}</ul>`
          : "<p class='hint'>None recorded.</p>"}
      </div>

      <div class="detail-section">
        <h4>Employed Family Members</h4>
        ${employed && employed.length
          ? `<ul class="detail-list">${employed.map((e) => `<li>${e.name || "—"} — ${e.highest_qualification || "—"}, ${e.employer_location || "—"}</li>`).join("")}</ul>`
          : "<p class='hint'>None recorded.</p>"}
      </div>

      <div class="detail-section">
        <h4>Unemployed Qualified Members</h4>
        ${unemployed && unemployed.length
          ? `<ul class="detail-list">${unemployed.map((e) => `<li>${e.name || "—"} — ${e.highest_qualification || "—"}</li>`).join("")}</ul>`
          : "<p class='hint'>None recorded.</p>"}
      </div>

      ${survey.notes ? `<div class="detail-section"><h4>Notes</h4><p>${survey.notes}</p></div>` : ""}
    `;
  }

  document.getElementById("detailClose").addEventListener("click", () => backdrop.classList.remove("show"));
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.classList.remove("show"); });

  // ---------------- CSV export ----------------
  function toCsvValue(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") v = JSON.stringify(v);
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }

  document.getElementById("exportCsv").addEventListener("click", () => {
    if (!filtered.length) {
      showToast("No records to export for the current filters.", "error");
      return;
    }
    const columns = Object.keys(filtered[0]);
    const rows = [columns.join(",")];
    filtered.forEach((s) => {
      rows.push(columns.map((c) => toCsvValue(s[c])).join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enb_msme_survey_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} record${filtered.length === 1 ? "" : "s"} to CSV.`, "success");
  });

  // ---------------- Connection settings link ----------------
  const changeConnLink = document.getElementById("changeConnectionLink");
  if (changeConnLink) {
    changeConnLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.ENBConnection.showSetupScreen((client) => {
        supabase = client;
        showToast("Connection updated.", "success");
        loadData();
      });
    });
  }

  // ---------------- init ----------------
  loadData();
})();
