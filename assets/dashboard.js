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

  // Computes the same six breakdowns used by the on-screen charts, as plain
  // data (label -> count maps) rather than DOM elements, so both the live
  // dashboard charts and the printable summary report can use one source
  // of truth instead of duplicating the counting logic.
  function computeChartData(records) {
    const turnoverLabelsLocal = {};
    TURNOVER_BANDS.forEach((b) => (turnoverLabelsLocal[b.value] = b.label));

    const statusCounts = { Formal: 0, Informal: 0, "No business": 0 };
    const turnoverCounts = {};
    const activityCounts = {};
    const cropCounts = {};
    const trainingCounts = {};
    const loanCounts = { "Has loan access": 0, "No loan access": 0, "Not answered": 0 };

    records.forEach((s) => {
      statusCounts[businessStatusLabel(businessStatusOf(s))]++;

      if (s.turnover_band) {
        const label = turnoverLabelsLocal[s.turnover_band] || s.turnover_band;
        turnoverCounts[label] = (turnoverCounts[label] || 0) + 1;
      }
      if (s.business_activities && typeof s.business_activities === "object") {
        Object.keys(s.business_activities).forEach((k) => {
          if (s.business_activities[k]) activityCounts[k] = (activityCounts[k] || 0) + 1;
        });
      }
      if (s.cash_crops && typeof s.cash_crops === "object") {
        Object.keys(s.cash_crops).forEach((crop) => {
          cropCounts[crop] = (cropCounts[crop] || 0) + 1;
        });
      }
      if (s.training_required && typeof s.training_required === "object") {
        Object.keys(s.training_required).forEach((t) => {
          if (s.training_required[t]) trainingCounts[t] = (trainingCounts[t] || 0) + 1;
        });
      }
      if (s.has_business_loan === true) loanCounts["Has loan access"]++;
      else if (s.has_business_loan === false) loanCounts["No loan access"]++;
      else loanCounts["Not answered"]++;
    });

    return { statusCounts, turnoverCounts, activityCounts, cropCounts, trainingCounts, loanCounts };
  }

  function renderCharts() {
    const data = computeChartData(filtered);
    renderBarChart(document.getElementById("chartBusinessStatus"), data.statusCounts);
    renderBarChart(document.getElementById("chartTurnover"), data.turnoverCounts);
    renderBarChart(document.getElementById("chartActivities"), data.activityCounts, { limit: 8 });
    renderBarChart(document.getElementById("chartCashCrops"), data.cropCounts);
    renderBarChart(document.getElementById("chartTraining"), data.trainingCounts);
    renderBarChart(document.getElementById("chartLoans"), data.loanCounts);
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

      <div class="detail-section detail-danger-zone">
        <button class="btn-delete" id="deleteSurveyBtn" data-id="${survey.id}">Delete this record</button>
        <p class="hint">This permanently removes the record — there's no undo.</p>
      </div>
    `;

    const deleteBtn = document.getElementById("deleteSurveyBtn");
    deleteBtn.addEventListener("click", () => handleDeleteSurvey(survey));
  }

  async function handleDeleteSurvey(survey) {
    const label = survey.household_no
      ? `Household No. ${survey.household_no}`
      : (survey.village || "this record");
    const confirmed = window.confirm(
      `Delete ${label} permanently? This cannot be undone.`
    );
    if (!confirmed) return;

    const deleteBtn = document.getElementById("deleteSurveyBtn");
    deleteBtn.disabled = true;
    deleteBtn.textContent = "Deleting…";

    try {
      const { error } = await supabase.from("surveys").delete().eq("id", survey.id);
      if (error) throw error;

      backdrop.classList.remove("show");
      allSurveys = allSurveys.filter((s) => s.id !== survey.id);
      applyFilters(); // re-renders KPIs, charts, and the table from the updated allSurveys
      showToast("Record deleted.", "success");
    } catch (err) {
      console.error(err);
      showToast("Could not delete: " + (err.message || "unknown error") + ". If this persists, check that the delete permission was added in Supabase (see sql/migration_add_delete.sql).", "error");
      deleteBtn.disabled = false;
      deleteBtn.textContent = "Delete this record";
    }
  }

  document.getElementById("detailClose").addEventListener("click", () => backdrop.classList.remove("show"));
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.classList.remove("show"); });

  // ---------------- CSV export ----------------

  // Maps each database column back to the lettered section it belongs to in
  // the original paper form (A-G), so the exported CSV's headers show their
  // origin without breaking the flat row/column structure CSV needs to stay
  // usable in Excel/Sheets (filtering, sorting, pivoting).
  const COLUMN_SECTION_MAP = {
    id: "META", created_at: "META",
    district: "A", llg: "A", village: "A", ward: "A", household_no: "A",
    date_collected: "A", contact_person: "A", contact_mobile: "A", postal_address: "A",
    num_employed_family: "B", num_unemployed_qualified_comments: "B", has_business: "B", business_sector: "B",
    business_activities: "C", business_activity_other: "C", business_name: "C", business_date_commenced: "C",
    business_owner: "C", other_business_location: "C", ipa_registered: "C", ipa_registration_forms: "C",
    licenses: "C", licenses_comment: "C", has_business_loan: "C", loans: "C", no_loan_reasons: "C",
    training_attended: "D", training_required: "D", training_other: "D",
    assistance_required: "D", assistance_other: "D", section_d_comment: "D",
    num_casuals: "E", casuals_years_employed: "E", num_permanent: "E", permanent_years_employed: "E",
    wages_casual_fortnightly: "E", wages_permanent_fortnightly: "E", turnover_band: "E", turnover_amount: "E",
    expenses_band: "E", expenses_amount: "E", initial_capital: "E", value_of_assets: "E",
    other_investments: "E", other_investments_specify: "E",
    cash_crops: "F", cash_crops_comment: "F",
    informal_business_owners: "G", informal_comment: "G",
    notes: "META"
  };

  function sectionedHeader(column) {
    const section = COLUMN_SECTION_MAP[column];
    return section && section !== "META" ? `${section}_${column}` : column;
  }

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
    const rows = [columns.map(sectionedHeader).join(",")];
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

  // ---------------- PDF export (print-friendly HTML in a new tab) ----------------
  function escapeHtml(v) {
    if (v === null || v === undefined) return "";
    return String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function checkedKeysInline(obj) {
    if (!obj || typeof obj !== "object") return "—";
    const keys = Object.keys(obj).filter((k) => obj[k]);
    return keys.length ? keys.map(escapeHtml).join(", ") : "—";
  }

  function fieldRow(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return `<div class="field"><span class="field-label">${escapeHtml(label)}</span><span class="field-value">${value}</span></div>`;
  }

  const exportPdfBtn = document.getElementById("exportPdf");

  exportPdfBtn.addEventListener("click", async () => {
    if (!allSurveys.length) {
      showToast("No records to export yet.", "error");
      return;
    }
    if (!supabase) {
      showToast("Not connected — set up the connection first.", "error");
      return;
    }

    const originalLabel = exportPdfBtn.textContent;
    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = "Preparing report…";

    // Fetch every household's employed/unemployed family member rows up
    // front in two bulk queries (rather than one query per household) so
    // Section B can be filled in for each household block below.
    let employedByHousehold = {};
    let unemployedByHousehold = {};
    try {
      const surveyIds = allSurveys.map((s) => s.id);
      const [employedRes, unemployedRes] = await Promise.all([
        supabase.from("employed_family_members").select("*").in("survey_id", surveyIds),
        supabase.from("unemployed_qualified_members").select("*").in("survey_id", surveyIds)
      ]);
      (employedRes.data || []).forEach((row) => {
        (employedByHousehold[row.survey_id] = employedByHousehold[row.survey_id] || []).push(row);
      });
      (unemployedRes.data || []).forEach((row) => {
        (unemployedByHousehold[row.survey_id] = unemployedByHousehold[row.survey_id] || []).push(row);
      });
    } catch (e) {
      console.error("Could not load family member detail tables for export:", e);
      // Continue without them rather than blocking the whole export — those
      // sub-tables will just show as empty further down.
    }

    const turnoverLabels = {};
    TURNOVER_BANDS.forEach((b) => (turnoverLabels[b.value] = b.label));
    const expensesLabels = {};
    EXPENSES_BANDS.forEach((b) => (expensesLabels[b.value] = b.label));

    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const householdBlocks = allSurveys.map((s, idx) => {
      const status = businessStatusOf(s);
      const employed = employedByHousehold[s.id] || [];
      const unemployed = unemployedByHousehold[s.id] || [];

      const employedRowsHtml = employed.length
        ? employed.map((e) => `
            <tr>
              <td>${escapeHtml(e.name) || "—"}</td>
              <td>${escapeHtml(e.highest_qualification) || "—"}</td>
              <td>${escapeHtml(e.institution) || "—"}</td>
              <td>${escapeHtml(e.year_graduated) || "—"}</td>
              <td>${escapeHtml(e.employer_location) || "—"}</td>
              <td>${e.gross_monthly_pay !== null && e.gross_monthly_pay !== undefined ? "K" + escapeHtml(e.gross_monthly_pay) : "—"}</td>
            </tr>
          `).join("")
        : `<tr><td colspan="6" class="empty-cell">None recorded</td></tr>`;

      const unemployedRowsHtml = unemployed.length
        ? unemployed.map((e) => `
            <tr>
              <td>${escapeHtml(e.name) || "—"}</td>
              <td>${escapeHtml(e.highest_qualification) || "—"}</td>
              <td>${escapeHtml(e.institution) || "—"}</td>
              <td>${escapeHtml(e.year_graduated) || "—"}</td>
              <td>${escapeHtml(e.comments) || "—"}</td>
            </tr>
          `).join("")
        : `<tr><td colspan="5" class="empty-cell">None recorded</td></tr>`;

      const licensesHtml = Array.isArray(s.licenses) && s.licenses.length
        ? s.licenses.map((l) => escapeHtml(l.type) + (l.tick ? "" : " (not held)")).join(", ")
        : "—";

      const loansHtml = Array.isArray(s.loans) && s.loans.length
        ? s.loans.map((l) => `${escapeHtml(l.institution) || "—"} — K${escapeHtml(l.amount) || "0"}`).join("; ")
        : "—";

      const cashCropsHtml = s.cash_crops && Object.keys(s.cash_crops).length
        ? Object.entries(s.cash_crops).map(([crop, v]) =>
            `${escapeHtml(crop)}${v && (v.blocks || v.trees) ? ` (${v.blocks || 0} blocks, ${v.trees || 0} trees)` : ""}`
          ).join(", ")
        : "—";

      const informalOwnersHtml = Array.isArray(s.informal_business_owners) && s.informal_business_owners.length
        ? s.informal_business_owners.map((o) =>
            `${escapeHtml(o.name) || "—"} (${escapeHtml(o.activity_type) || "—"}, est. ${escapeHtml(o.year_established) || "—"}, K${escapeHtml(o.monthly_turnover) || "0"}/mo)`
          ).join("; ")
        : "—";

      const showCDE = status === "formal";
      const showG = status === "informal";

      return `
        <section class="household ${idx > 0 ? "page-break" : ""}">
          <div class="household-title">
            <h2>Household ${idx + 1}${s.household_no ? " — No. " + escapeHtml(s.household_no) : ""}</h2>
            <span class="badge-status">${businessStatusLabel(status)}</span>
          </div>

          <div class="section-block">
            <h3>A) Location</h3>
            <div class="field-grid">
              ${fieldRow("District", escapeHtml(s.district))}
              ${fieldRow("LLG", escapeHtml(s.llg))}
              ${fieldRow("Village", escapeHtml(s.village))}
              ${fieldRow("Ward", escapeHtml(s.ward))}
              ${fieldRow("Household No.", escapeHtml(s.household_no))}
              ${fieldRow("Date Collected", escapeHtml(s.date_collected))}
              ${fieldRow("Contact Person", escapeHtml(s.contact_person))}
              ${fieldRow("Mobile", escapeHtml(s.contact_mobile))}
              ${fieldRow("Postal Address", escapeHtml(s.postal_address))}
            </div>
          </div>

          <div class="section-block">
            <h3>B) Employment &amp; Education Information</h3>
            <div class="field-grid">
              ${fieldRow("Family members formally employed", s.num_employed_family)}
              ${fieldRow("Runs a business?", businessStatusLabel(status))}
            </div>
            <p class="sub-label">Table 1 — Employed Family Members</p>
            <table class="mini-table">
              <thead><tr><th>Name</th><th>Qualification</th><th>Institution</th><th>Year</th><th>Employer &amp; Location</th><th>Monthly Pay</th></tr></thead>
              <tbody>${employedRowsHtml}</tbody>
            </table>
            <p class="sub-label">Table 2 — Unemployed Qualified Family Members</p>
            <table class="mini-table">
              <thead><tr><th>Name</th><th>Qualification</th><th>Institution</th><th>Year</th><th>Comments</th></tr></thead>
              <tbody>${unemployedRowsHtml}</tbody>
            </table>
          </div>

          ${showCDE ? `
          <div class="section-block">
            <h3>C) Business Background Information</h3>
            <div class="field-grid">
              ${fieldRow("Business Activities", checkedKeysInline(s.business_activities))}
              ${fieldRow("Other Activity", escapeHtml(s.business_activity_other))}
              ${fieldRow("Business Name", escapeHtml(s.business_name))}
              ${fieldRow("Date Commenced", escapeHtml(s.business_date_commenced))}
              ${fieldRow("Business Owner", escapeHtml(s.business_owner))}
              ${fieldRow("Other Business Location", escapeHtml(s.other_business_location))}
              ${fieldRow("IPA Registered", s.ipa_registered === true ? "Yes" : s.ipa_registered === false ? "No" : "—")}
              ${fieldRow("Licenses", licensesHtml)}
              ${fieldRow("Has Business Loan", s.has_business_loan === true ? "Yes" : s.has_business_loan === false ? "No" : "—")}
              ${fieldRow("Loans", loansHtml)}
              ${fieldRow("Reasons (no loan)", escapeHtml(s.no_loan_reasons))}
            </div>
          </div>

          <div class="section-block">
            <h3>D) Business Development Assistance</h3>
            <div class="field-grid">
              ${fieldRow("Training Required", checkedKeysInline(s.training_required))}
              ${fieldRow("Other Training", escapeHtml(s.training_other))}
              ${fieldRow("Assistance Required", checkedKeysInline(s.assistance_required))}
              ${fieldRow("Other Assistance", escapeHtml(s.assistance_other))}
              ${fieldRow("Comment", escapeHtml(s.section_d_comment))}
            </div>
          </div>

          <div class="section-block">
            <h3>E) Economic Output Development</h3>
            <div class="field-grid">
              ${fieldRow("No. of Casuals", s.num_casuals)}
              ${fieldRow("Years Employed (Casuals)", s.casuals_years_employed)}
              ${fieldRow("No. of Permanent", s.num_permanent)}
              ${fieldRow("Years Employed (Permanent)", s.permanent_years_employed)}
              ${fieldRow("Fortnightly Wages (Casual)", s.wages_casual_fortnightly !== null ? "K" + escapeHtml(s.wages_casual_fortnightly) : null)}
              ${fieldRow("Fortnightly Wages (Permanent)", s.wages_permanent_fortnightly !== null ? "K" + escapeHtml(s.wages_permanent_fortnightly) : null)}
              ${fieldRow("Monthly Turnover", escapeHtml(turnoverLabels[s.turnover_band]))}
              ${fieldRow("Monthly Expenses", escapeHtml(expensesLabels[s.expenses_band]))}
              ${fieldRow("Initial Capital", s.initial_capital !== null ? "K" + escapeHtml(s.initial_capital) : null)}
              ${fieldRow("Value of Assets", s.value_of_assets !== null ? "K" + escapeHtml(s.value_of_assets) : null)}
              ${fieldRow("Other Investments", s.other_investments !== null ? "K" + escapeHtml(s.other_investments) : null)}
            </div>
          </div>
          ` : ""}

          <div class="section-block">
            <h3>F) Cash Crops</h3>
            <div class="field-grid">
              ${fieldRow("Cash Crops", cashCropsHtml)}
              ${fieldRow("Comment", escapeHtml(s.cash_crops_comment))}
            </div>
          </div>

          ${showG ? `
          <div class="section-block">
            <h3>G) Informal Business Sector</h3>
            <div class="field-grid">
              ${fieldRow("Business Owners", informalOwnersHtml)}
              ${fieldRow("Comment", escapeHtml(s.informal_comment))}
            </div>
          </div>
          ` : ""}

          ${s.notes ? `<div class="section-block"><h3>Notes</h3><p>${escapeHtml(s.notes)}</p></div>` : ""}
        </section>
      `;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <title>ENB Economic & MSME Survey — Records Export</title>
      <style>
        @page { size: A4; margin: 14mm 12mm; }
        * { box-sizing: border-box; }
        body {
          font-family: Georgia, "Times New Roman", serif;
          color: #241F12;
          margin: 0;
          padding: 0 0 30px;
        }
        header {
          border-bottom: 2px solid #7A0E1C;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .eyebrow {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7A0E1C;
          margin: 0 0 4px;
          font-family: Arial, sans-serif;
        }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .meta { font-size: 11px; color: #5C5340; font-family: Arial, sans-serif; }

        .household { margin-bottom: 26px; }
        .page-break { break-before: page; page-break-before: always; }

        .household-title {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          border-bottom: 1.5px solid #7A0E1C;
          padding-bottom: 6px;
          margin-bottom: 12px;
        }
        .household-title h2 {
          font-size: 16px;
          margin: 0;
        }
        .badge-status {
          font-family: Arial, sans-serif;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          background: #FBF3DC;
          color: #7A0E1C;
          padding: 3px 10px;
          border-radius: 999px;
        }

        .section-block {
          margin-bottom: 14px;
          break-inside: avoid;
        }
        .section-block h3 {
          font-size: 12.5px;
          margin: 0 0 6px;
          color: #7A0E1C;
          border-bottom: 1px solid #DCC889;
          padding-bottom: 3px;
        }

        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 16px;
          font-family: Arial, sans-serif;
          font-size: 10.5px;
        }
        .field { display: flex; flex-direction: column; gap: 1px; }
        .field-label {
          font-size: 8.5px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: #5C5340;
        }
        .field-value { color: #241F12; }

        .sub-label {
          font-family: Arial, sans-serif;
          font-size: 9.5px;
          font-weight: 700;
          color: #5C5340;
          margin: 8px 0 4px;
        }

        .mini-table, table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5px;
          font-family: Arial, sans-serif;
          margin-bottom: 4px;
        }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        th, td {
          border: 1px solid #DCC889;
          padding: 4px 6px;
          text-align: left;
        }
        th {
          background: #FBF3DC;
          font-size: 8.5px;
          text-transform: uppercase;
        }
        .empty-cell {
          color: #5C5340;
          font-style: italic;
          text-align: center;
        }

        footer {
          margin-top: 16px;
          font-size: 9.5px;
          color: #5C5340;
          font-family: Arial, sans-serif;
        }
        .print-btn-row { margin-bottom: 18px; }
        .print-btn {
          font-family: Arial, sans-serif;
          font-size: 14px;
          font-weight: 700;
          background: #C99A1E;
          color: #fff;
          border: none;
          padding: 12px 22px;
          border-radius: 8px;
          cursor: pointer;
        }
        .print-btn:active { opacity: 0.85; }
        @media print {
          .print-btn-row { display: none; }
        }
      </style>
      </head>
      <body>
        <div class="print-btn-row">
          <button class="print-btn" onclick="window.print()">&#128424;&#65039; Print / Save as PDF</button>
        </div>
        <header>
          <p class="eyebrow">East New Britain Provincial Administration — Division of Commerce &amp; Industry</p>
          <h1>Economic &amp; MSME Survey — All Records</h1>
          <p class="meta">Exported ${today} &nbsp;•&nbsp; ${allSurveys.length} household${allSurveys.length === 1 ? "" : "s"} total</p>
        </header>
        ${householdBlocks}
        <footer>Generated from the ENB Economic &amp; MSME Survey digital tool.</footer>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);

    const reportWindow = window.open(blobUrl, "_blank");
    if (!reportWindow) {
      // Fall back to a direct navigation if the browser blocked window.open
      // entirely (common on some mobile browsers) — at least get the report
      // open somehow rather than failing silently.
      showToast("Pop-up was blocked — opening the report in this tab instead.", "error");
      window.location.href = blobUrl;
      exportPdfBtn.disabled = false;
      exportPdfBtn.textContent = originalLabel;
      return;
    }
    // Release the blob URL once the new tab has had a chance to load it.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    exportPdfBtn.disabled = false;
    exportPdfBtn.textContent = originalLabel;
  });

  // ---------------- Summary report (PDF-via-print, one-page overview) ----------------

  function staticBarChartHtml(dataMap, limit = 8) {
    const entries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]).slice(0, limit);
    if (!entries.length) return `<p class="report-chart-empty">No data recorded.</p>`;
    const max = Math.max(...entries.map((e) => e[1]));
    return entries.map(([label, value]) => {
      const pct = max ? Math.round((value / max) * 100) : 0;
      return `
        <div class="report-bar-row">
          <span class="report-bar-label">${escapeHtml(label)}</span>
          <span class="report-bar-track"><span class="report-bar-fill" style="width:${pct}%"></span></span>
          <span class="report-bar-value">${value}</span>
        </div>
      `;
    }).join("");
  }

  document.getElementById("exportSummary").addEventListener("click", () => {
    if (!allSurveys.length) {
      showToast("No records to summarise yet.", "error");
      return;
    }

    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const data = computeChartData(allSurveys);

    const totalCount = allSurveys.length;
    const formalCount = allSurveys.filter((s) => businessStatusOf(s) === "formal").length;
    const informalCount = allSurveys.filter((s) => businessStatusOf(s) === "informal").length;
    const noBizCount = allSurveys.filter((s) => businessStatusOf(s) === "none").length;
    const villageCount = uniqueSorted(allSurveys.map((s) => s.village)).length;
    const districtCount = uniqueSorted(allSurveys.map((s) => s.district)).length;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <title>ENB Economic & MSME Survey — Summary Report</title>
      <style>
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; }
        body {
          font-family: Georgia, "Times New Roman", serif;
          color: #241F12;
          margin: 0;
          padding: 0 0 30px;
        }
        header {
          border-bottom: 2px solid #7A0E1C;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .eyebrow {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7A0E1C;
          margin: 0 0 4px;
          font-family: Arial, sans-serif;
        }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta { font-size: 11px; color: #5C5340; font-family: Arial, sans-serif; }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .kpi-box {
          border: 1px solid #DCC889;
          border-radius: 8px;
          padding: 12px 14px;
          font-family: Arial, sans-serif;
        }
        .kpi-box .num { font-size: 22px; font-weight: 700; color: #7A0E1C; font-family: Georgia, serif; }
        .kpi-box .lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.03em; color: #5C5340; }

        .report-section { margin-bottom: 22px; break-inside: avoid; }
        .report-section h2 {
          font-size: 13.5px;
          color: #7A0E1C;
          border-bottom: 1px solid #DCC889;
          padding-bottom: 4px;
          margin: 0 0 10px;
        }

        .report-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .report-bar-row {
          display: grid;
          grid-template-columns: 130px 1fr 36px;
          align-items: center;
          gap: 8px;
          margin-bottom: 7px;
          font-family: Arial, sans-serif;
          font-size: 10.5px;
        }
        .report-bar-label { color: #5C5340; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .report-bar-track { height: 11px; background: #F0E8D8; border-radius: 4px; overflow: hidden; }
        .report-bar-fill { height: 100%; background: #7A0E1C; border-radius: 4px; }
        .report-bar-value { text-align: right; color: #5C5340; }
        .report-chart-empty { font-size: 10.5px; font-style: italic; color: #5C5340; font-family: Arial, sans-serif; }

        footer {
          margin-top: 16px;
          font-size: 9.5px;
          color: #5C5340;
          font-family: Arial, sans-serif;
        }
        .print-btn-row { margin-bottom: 18px; }
        .print-btn {
          font-family: Arial, sans-serif;
          font-size: 14px;
          font-weight: 700;
          background: #C99A1E;
          color: #fff;
          border: none;
          padding: 12px 22px;
          border-radius: 8px;
          cursor: pointer;
        }
        .print-btn:active { opacity: 0.85; }
        @media print {
          .print-btn-row { display: none; }
        }
      </style>
      </head>
      <body>
        <div class="print-btn-row">
          <button class="print-btn" onclick="window.print()">&#128424;&#65039; Print / Save as PDF</button>
        </div>
        <header>
          <p class="eyebrow">East New Britain Provincial Administration — Division of Commerce &amp; Industry</p>
          <h1>Economic &amp; MSME Survey — Summary Report</h1>
          <p class="meta">Generated ${today} &nbsp;•&nbsp; ${totalCount} household${totalCount === 1 ? "" : "s"} recorded across ${districtCount} district${districtCount === 1 ? "" : "s"} and ${villageCount} village${villageCount === 1 ? "" : "s"}</p>
        </header>

        <div class="kpi-grid">
          <div class="kpi-box"><div class="num">${totalCount}</div><div class="lbl">Total Households</div></div>
          <div class="kpi-box"><div class="num">${formalCount}</div><div class="lbl">Formal Businesses</div></div>
          <div class="kpi-box"><div class="num">${informalCount}</div><div class="lbl">Informal Businesses</div></div>
          <div class="kpi-box"><div class="num">${noBizCount}</div><div class="lbl">No Business</div></div>
          <div class="kpi-box"><div class="num">${villageCount}</div><div class="lbl">Villages Covered</div></div>
          <div class="kpi-box"><div class="num">${districtCount}</div><div class="lbl">Districts Covered</div></div>
        </div>

        <div class="report-grid-2">
          <div class="report-section">
            <h2>Business Status</h2>
            ${staticBarChartHtml(data.statusCounts)}
          </div>
          <div class="report-section">
            <h2>Monthly Turnover Bands</h2>
            ${staticBarChartHtml(data.turnoverCounts)}
          </div>
          <div class="report-section">
            <h2>Top Business Activities</h2>
            ${staticBarChartHtml(data.activityCounts, 8)}
          </div>
          <div class="report-section">
            <h2>Cash Crop Prevalence</h2>
            ${staticBarChartHtml(data.cropCounts)}
          </div>
          <div class="report-section">
            <h2>Training Required</h2>
            ${staticBarChartHtml(data.trainingCounts)}
          </div>
          <div class="report-section">
            <h2>Loan Access</h2>
            ${staticBarChartHtml(data.loanCounts)}
          </div>
        </div>

        <footer>Generated from the ENB Economic &amp; MSME Survey digital tool. This summary reflects all households recorded in the database at the time of generation, regardless of any filters applied on the dashboard.</footer>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    const reportWindow = window.open(blobUrl, "_blank");
    if (!reportWindow) {
      showToast("Pop-up was blocked — opening the report in this tab instead.", "error");
      window.location.href = blobUrl;
      return;
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
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
