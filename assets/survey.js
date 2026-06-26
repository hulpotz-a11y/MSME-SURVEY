/* ============================================================
   ENB Economic & MSME Survey — form logic
   ============================================================ */

(function () {
  "use strict";

  let supabase = null;
  try {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.error("Supabase library did not load — submissions will fail until this is fixed.");
    }
  } catch (err) {
    console.error("Could not initialise Supabase client:", err);
  }

  const form = document.getElementById("surveyForm");
  const toastEl = document.getElementById("toast");
  const sections = ["A", "B", "C", "D", "E", "F", "G"];

  let rowCounter = 0;
  const nextId = (prefix) => `${prefix}_${++rowCounter}`;

  // ---------------- Toast ----------------
  let toastTimer;
  function showToast(message, type = "") {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.className = "toast show" + (type ? " " + type : "");
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  // ---------------- Checkbox grid builder ----------------
  function buildCheckList(container, items, namePrefix) {
    container.innerHTML = "";
    items.forEach((item) => {
      const id = `${namePrefix}_${item.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const label = document.createElement("label");
      label.className = "check-item";
      label.innerHTML = `<input type="checkbox" id="${id}" data-label="${item}"><span>${item}</span>`;
      const input = label.querySelector("input");
      input.addEventListener("change", () => label.classList.toggle("checked", input.checked));
      container.appendChild(label);
    });
  }

  function buildGroupedCheckList(container, groupedItems, namePrefix) {
    container.innerHTML = "";
    Object.entries(groupedItems).forEach(([group, items]) => {
      const groupLabel = document.createElement("p");
      groupLabel.className = "subgroup-label";
      groupLabel.textContent = group;
      container.appendChild(groupLabel);
      const wrap = document.createElement("div");
      wrap.className = "check-list";
      buildCheckList(wrap, items, namePrefix);
      container.appendChild(wrap);
    });
  }

  function getCheckedLabels(container) {
    const result = {};
    container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      if (cb.checked) result[cb.dataset.label] = true;
    });
    return result;
  }

  // Build Section C activities (grouped)
  buildGroupedCheckList(document.getElementById("businessActivitiesWrap"), BUSINESS_ACTIVITIES, "biz_act");

  // Section D training required / assistance required (flat lists)
  buildCheckList(document.getElementById("trainingRequiredWrap"), TRAINING_REQUIRED_TYPES, "train_req");
  buildCheckList(document.getElementById("assistanceWrap"), ASSISTANCE_TYPES, "assist_req");

  // Turnover / expenses band selects
  function fillSelect(selectEl, options) {
    options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      selectEl.appendChild(o);
    });
  }
  fillSelect(document.getElementById("turnover_band"), TURNOVER_BANDS);
  fillSelect(document.getElementById("expenses_band"), EXPENSES_BANDS);

  // ---------------- Repeatable row tables ----------------

  function addRow(tbody, fieldsHtml) {
    const tr = document.createElement("tr");
    tr.dataset.rowId = nextId("row");
    tr.innerHTML = fieldsHtml + `<td><button type="button" class="row-remove" aria-label="Remove row">&times;</button></td>`;
    tr.querySelector(".row-remove").addEventListener("click", () => tr.remove());
    tbody.appendChild(tr);
    return tr;
  }

  function rowValues(tr, fieldNames) {
    const inputs = tr.querySelectorAll("input, select");
    const vals = {};
    fieldNames.forEach((name, i) => { vals[name] = inputs[i] ? inputs[i].value.trim() : ""; });
    return vals;
  }

  function rowHasAnyValue(vals) {
    return Object.values(vals).some((v) => v !== "" && v !== false);
  }

  // -- Table 1: employed family members --
  const employedBody = document.getElementById("employedTableBody");
  function addEmployedRow() {
    addRow(employedBody, `
      <td><input type="text" placeholder="Name"></td>
      <td><input type="text" placeholder="Qualification"></td>
      <td><input type="text" placeholder="Institution"></td>
      <td><input type="text" placeholder="Year"></td>
      <td><input type="text" placeholder="Employer & location"></td>
      <td><input type="number" placeholder="0.00" step="0.01" min="0"></td>
    `);
  }
  document.getElementById("addEmployedRow").addEventListener("click", addEmployedRow);
  addEmployedRow();

  // -- Table 2: unemployed qualified members --
  const unemployedBody = document.getElementById("unemployedTableBody");
  function addUnemployedRow() {
    addRow(unemployedBody, `
      <td><input type="text" placeholder="Name"></td>
      <td><input type="text" placeholder="Qualification"></td>
      <td><input type="text" placeholder="Institution"></td>
      <td><input type="text" placeholder="Year"></td>
      <td><input type="text" placeholder="Comments"></td>
    `);
  }
  document.getElementById("addUnemployedRow").addEventListener("click", addUnemployedRow);
  addUnemployedRow();

  // -- IPA registration forms (fixed list, not user-addable) --
  const ipaBody = document.getElementById("ipaFormsTableBody");
  REGISTRATION_FORMS.forEach((formName) => {
    const tr = document.createElement("tr");
    tr.dataset.formName = formName;
    tr.innerHTML = `
      <td>${formName}</td>
      <td><input type="date"></td>
      <td><input type="text" placeholder="Reg. No."></td>
      <td><input type="date"></td>
    `;
    ipaBody.appendChild(tr);
  });

  // -- Licenses (fixed list with checkbox) --
  const licensesBody = document.getElementById("licensesTableBody");
  LICENSE_TYPES.forEach((type) => {
    const tr = document.createElement("tr");
    tr.dataset.licenseType = type;
    tr.innerHTML = `
      <td><input type="checkbox"></td>
      <td>${type}</td>
      <td><input type="text" placeholder="Receipt No."></td>
      <td><input type="date"></td>
    `;
    licensesBody.appendChild(tr);
  });

  // -- Loans (user-addable) --
  const loansBody = document.getElementById("loansTableBody");
  function addLoanRow() {
    addRow(loansBody, `
      <td><input type="text" placeholder="Bank / institution"></td>
      <td><input type="number" placeholder="0.00" step="0.01" min="0"></td>
      <td><input type="date"></td>
      <td>
        <select style="min-width:90px">
          <option value="">—</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </td>
      <td><input type="text" placeholder="Comments"></td>
    `);
  }
  document.getElementById("addLoanRow").addEventListener("click", addLoanRow);
  addLoanRow();

  // -- Training attended (fixed list) --
  const trainingAttendedBody = document.getElementById("trainingAttendedTableBody");
  TRAINING_ATTENDED_TYPES.forEach((type) => {
    const tr = document.createElement("tr");
    tr.dataset.trainingType = type;
    tr.innerHTML = `
      <td><input type="checkbox"></td>
      <td>${type}</td>
      <td><input type="text" placeholder="Facilitator"></td>
    `;
    trainingAttendedBody.appendChild(tr);
  });

  // -- Cash crops (fixed list) --
  const cashCropsBody = document.getElementById("cashCropsTableBody");
  CASH_CROPS.forEach((crop) => {
    const tr = document.createElement("tr");
    tr.dataset.crop = crop;
    tr.innerHTML = `
      <td>${crop}</td>
      <td><input type="number" min="0" step="1" placeholder="0"></td>
      <td><input type="number" min="0" step="1" placeholder="0"></td>
    `;
    cashCropsBody.appendChild(tr);
  });

  // -- Informal business sector (user-addable) --
  const informalBody = document.getElementById("informalTableBody");
  function addInformalRow() {
    addRow(informalBody, `
      <td><input type="text" placeholder="Name of owner"></td>
      <td><input type="text" placeholder="Type of business activity"></td>
      <td><input type="text" placeholder="Year established"></td>
      <td><input type="number" placeholder="0.00" step="0.01" min="0"></td>
    `);
  }
  document.getElementById("addInformalRow").addEventListener("click", addInformalRow);
  addInformalRow();

  // ---------------- Branching logic ----------------

  const sectionC = document.getElementById("sectionC");
  const sectionD = document.getElementById("sectionD");
  const sectionE = document.getElementById("sectionE");
  const sectionF = document.getElementById("sectionF");
  const sectionG = document.getElementById("sectionG");
  const branchExplainer = document.getElementById("branchExplainer");

  const loanYesBlock = document.getElementById("loanYesBlock");
  const loanNoBlock = document.getElementById("loanNoBlock");

  function applyBranching() {
    const choice = form.querySelector('input[name="has_business"]:checked');
    const val = choice ? choice.value : null;

    const showCDE = val === "yes";
    const showG = val === "informal";
    const showF = val !== null; // shown once household status is known

    sectionC.style.display = showCDE ? "" : "none";
    sectionD.style.display = showCDE ? "" : "none";
    sectionE.style.display = showCDE ? "" : "none";
    sectionG.style.display = showG ? "" : "none";
    sectionF.style.display = showF ? "" : "none";

    // C8 (loan question) also applies to informal businesses per the paper
    // form's instruction. Since Section C is otherwise hidden for informal,
    // surface just the loan block inline above Section G.
    let informalLoanBlock = document.getElementById("informalLoanBlock");
    if (showG) {
      if (!informalLoanBlock) {
        informalLoanBlock = document.createElement("div");
        informalLoanBlock.id = "informalLoanBlock";
        informalLoanBlock.className = "section";
        informalLoanBlock.innerHTML = `
          <div class="section-head"><span class="section-letter">C8</span><h2 class="section-title">Access to Business Loan (informal sector)</h2></div>
          <div class="section-body" id="informalLoanBody"></div>
        `;
        sectionG.parentNode.insertBefore(informalLoanBlock, sectionG);
      }
      informalLoanBlock.style.display = "";
      const loanField = document.getElementById("hasLoanGroup").closest(".field-group");
      const body = document.getElementById("informalLoanBody");
      if (loanField.parentElement !== body) body.appendChild(loanField);
    } else if (informalLoanBlock) {
      const loanField = document.getElementById("hasLoanGroup").closest(".field-group");
      const sectionCBody = sectionC.querySelector(".section-body");
      if (loanField.parentElement !== sectionCBody) sectionCBody.appendChild(loanField);
      informalLoanBlock.style.display = "none";
    }

    if (val === "yes") {
      branchExplainer.style.display = "";
      branchExplainer.textContent = "Formal business: continue to Sections C, D, E (and F if you have cash crops).";
    } else if (val === "informal") {
      branchExplainer.style.display = "";
      branchExplainer.textContent = "Informal business: continue to the business loan question, Section F (cash crops), and Section G (informal business sector).";
    } else if (val === "no") {
      branchExplainer.style.display = "";
      branchExplainer.textContent = "No business: skip to Section F (cash crops) if applicable.";
    } else {
      branchExplainer.style.display = "none";
    }

    updateProgress();
  }

  form.querySelectorAll('input[name="has_business"]').forEach((r) =>
    r.addEventListener("change", applyBranching)
  );

  // Loan yes/no sub-branch
  function applyLoanBranch() {
    const choice = form.querySelector('input[name="has_business_loan"]:checked');
    const val = choice ? choice.value : null;
    loanYesBlock.style.display = val === "yes" ? "" : "none";
    loanNoBlock.style.display = val === "no" ? "" : "none";
  }
  form.addEventListener("change", (e) => {
    if (e.target.name === "has_business_loan") applyLoanBranch();
  });

  // ---------------- Progress bar ----------------
  function visibleSections() {
    return sections
      .map((s) => document.querySelector(`[data-section="${s}"]`))
      .filter((el) => el && el.style.display !== "none");
  }

  function updateProgress() {
    const visible = visibleSections();
    const total = visible.length || 1;
    const filledCount = visible.filter((sec) => {
      const inputs = sec.querySelectorAll("input, textarea, select");
      return Array.from(inputs).some((i) => {
        if (i.type === "checkbox" || i.type === "radio") return i.checked;
        return i.value && i.value.trim() !== "";
      });
    }).length;
    const pct = Math.round((filledCount / total) * 100);
    document.getElementById("progressFill").style.width = pct + "%";
    document.getElementById("progressPercent").textContent = pct + "%";
    document.getElementById("progressText").textContent = `${visible.length} section${visible.length === 1 ? "" : "s"} active`;
  }

  form.addEventListener("input", updateProgress);
  form.addEventListener("change", updateProgress);

  // ---------------- Validation ----------------
  function validate() {
    let valid = true;
    form.querySelectorAll("[required]").forEach((el) => {
      const group = el.closest(".field-group");
      let filled;
      if (el.type === "radio") {
        filled = form.querySelector(`input[name="${el.name}"]:checked`);
      } else {
        filled = el.value && el.value.trim() !== "";
      }
      if (!filled) {
        valid = false;
        if (group) group.classList.add("field-error");
      } else if (group) {
        group.classList.remove("field-error");
      }
    });
    return valid;
  }

  form.querySelectorAll("[required]").forEach((el) => {
    el.addEventListener("blur", () => {
      const group = el.closest(".field-group");
      if (!group) return;
      const filled = el.type === "radio"
        ? form.querySelector(`input[name="${el.name}"]:checked`)
        : el.value && el.value.trim() !== "";
      group.classList.toggle("field-error", !filled);
    });
  });

  // ---------------- Data collection ----------------

  function collectPayload() {
    const val = (id) => {
      const el = document.getElementById(id);
      return el ? (el.value.trim() === "" ? null : el.value.trim()) : null;
    };
    const numOrNull = (id) => {
      const v = val(id);
      return v === null ? null : Number(v);
    };
    const radioVal = (name) => {
      const el = form.querySelector(`input[name="${name}"]:checked`);
      return el ? el.value : null;
    };

    const hasBusinessChoice = radioVal("has_business");

    // Licenses
    const licenses = [];
    licensesBody.querySelectorAll("tr").forEach((tr) => {
      const checked = tr.querySelector('input[type="checkbox"]').checked;
      const [receiptEl, expiryEl] = tr.querySelectorAll("input:not([type=checkbox])");
      if (checked || receiptEl.value || expiryEl.value) {
        licenses.push({
          type: tr.dataset.licenseType,
          tick: checked,
          receipt_no: receiptEl.value.trim() || null,
          expiry_date: expiryEl.value || null
        });
      }
    });

    // IPA forms
    const ipaForms = [];
    ipaBody.querySelectorAll("tr").forEach((tr) => {
      const inputs = tr.querySelectorAll("input");
      const [dateReg, regNo, expiry] = inputs;
      if (dateReg.value || regNo.value || expiry.value) {
        ipaForms.push({
          form: tr.dataset.formName,
          date_reg: dateReg.value || null,
          reg_no: regNo.value.trim() || null,
          expiry_date: expiry.value || null
        });
      }
    });

    // Loans
    const loans = [];
    loansBody.querySelectorAll("tr").forEach((tr) => {
      const [institution, amount, date] = tr.querySelectorAll("input");
      const onSchedule = tr.querySelector("select");
      const comments = tr.querySelectorAll("input")[3];
      if (institution.value || amount.value) {
        loans.push({
          institution: institution.value.trim() || null,
          amount: amount.value ? Number(amount.value) : null,
          date: date.value || null,
          on_schedule: onSchedule.value || null,
          comments: comments ? comments.value.trim() || null : null
        });
      }
    });

    // Training attended
    const trainingAttended = [];
    trainingAttendedBody.querySelectorAll("tr").forEach((tr) => {
      const checked = tr.querySelector('input[type="checkbox"]').checked;
      const facilitator = tr.querySelector('input[type="text"]');
      if (checked || facilitator.value) {
        trainingAttended.push({
          type: tr.dataset.trainingType,
          attended: checked,
          facilitator: facilitator.value.trim() || null
        });
      }
    });

    // Cash crops
    const cashCrops = {};
    cashCropsBody.querySelectorAll("tr").forEach((tr) => {
      const [blocks, trees] = tr.querySelectorAll("input");
      if (blocks.value || trees.value) {
        cashCrops[tr.dataset.crop] = {
          blocks: blocks.value ? Number(blocks.value) : null,
          trees: trees.value ? Number(trees.value) : null
        };
      }
    });
    const cashCropOther = val("cash_crops_other");
    if (cashCropOther) cashCrops["Other: " + cashCropOther] = {};

    // Informal business owners
    const informalOwners = [];
    informalBody.querySelectorAll("tr").forEach((tr) => {
      const rowVals = rowValues(tr, ["name", "activity_type", "year_established", "monthly_turnover"]);
      if (rowHasAnyValue(rowVals)) {
        informalOwners.push({
          name: rowVals.name || null,
          activity_type: rowVals.activity_type || null,
          year_established: rowVals.year_established || null,
          monthly_turnover: rowVals.monthly_turnover ? Number(rowVals.monthly_turnover) : null
        });
      }
    });

    const payload = {
      district: val("district"),
      llg: val("llg"),
      village: val("village"),
      ward: val("ward"),
      household_no: val("household_no"),
      date_collected: val("date_collected"),
      contact_person: val("contact_person"),
      contact_mobile: val("contact_mobile"),
      postal_address: val("postal_address"),

      num_employed_family: numOrNull("num_employed_family"),

      has_business: hasBusinessChoice === "yes" ? true : (hasBusinessChoice === "no" || hasBusinessChoice === "informal") ? false : null,
      business_sector: hasBusinessChoice === "yes" ? "formal" : hasBusinessChoice === "informal" ? "informal" : null,

      business_activities: getCheckedLabels(document.getElementById("businessActivitiesWrap")),
      business_activity_other: val("business_activity_other"),
      business_name: val("business_name"),
      business_date_commenced: val("business_date_commenced"),
      business_owner: val("business_owner"),
      other_business_location: val("other_business_location"),
      ipa_registered: radioVal("ipa_registered") === "yes" ? true : radioVal("ipa_registered") === "no" ? false : null,
      ipa_registration_forms: ipaForms,
      licenses: licenses,
      licenses_comment: val("licenses_comment"),
      has_business_loan: radioVal("has_business_loan") === "yes" ? true : radioVal("has_business_loan") === "no" ? false : null,
      loans: loans,
      no_loan_reasons: val("no_loan_reasons"),

      training_attended: trainingAttended,
      training_required: getCheckedLabels(document.getElementById("trainingRequiredWrap")),
      training_other: val("training_other"),
      assistance_required: getCheckedLabels(document.getElementById("assistanceWrap")),
      assistance_other: val("assistance_other"),
      section_d_comment: val("section_d_comment"),

      num_casuals: numOrNull("num_casuals"),
      casuals_years_employed: numOrNull("casuals_years_employed"),
      num_permanent: numOrNull("num_permanent"),
      permanent_years_employed: numOrNull("permanent_years_employed"),
      wages_casual_fortnightly: numOrNull("wages_casual_fortnightly"),
      wages_permanent_fortnightly: numOrNull("wages_permanent_fortnightly"),
      turnover_band: val("turnover_band"),
      turnover_amount: numOrNull("turnover_amount"),
      expenses_band: val("expenses_band"),
      expenses_amount: numOrNull("expenses_amount"),
      initial_capital: numOrNull("initial_capital"),
      value_of_assets: numOrNull("value_of_assets"),
      other_investments: numOrNull("other_investments"),
      other_investments_specify: val("other_investments_specify"),

      cash_crops: cashCrops,
      cash_crops_comment: val("cash_crops_comment"),

      informal_business_owners: informalOwners,
      informal_comment: val("informal_comment"),

      notes: val("notes")
    };

    const employedRows = [];
    employedBody.querySelectorAll("tr").forEach((tr) => {
      const rowVals = rowValues(tr, ["name", "highest_qualification", "institution", "year_graduated", "employer_location", "gross_monthly_pay"]);
      if (rowHasAnyValue(rowVals)) {
        employedRows.push({
          name: rowVals.name || null,
          highest_qualification: rowVals.highest_qualification || null,
          institution: rowVals.institution || null,
          year_graduated: rowVals.year_graduated || null,
          employer_location: rowVals.employer_location || null,
          gross_monthly_pay: rowVals.gross_monthly_pay ? Number(rowVals.gross_monthly_pay) : null
        });
      }
    });

    const unemployedRows = [];
    unemployedBody.querySelectorAll("tr").forEach((tr) => {
      const rowVals = rowValues(tr, ["name", "highest_qualification", "institution", "year_graduated", "comments"]);
      if (rowHasAnyValue(rowVals)) {
        unemployedRows.push({
          name: rowVals.name || null,
          highest_qualification: rowVals.highest_qualification || null,
          institution: rowVals.institution || null,
          year_graduated: rowVals.year_graduated || null,
          comments: rowVals.comments || null
        });
      }
    });

    return { payload, employedRows, unemployedRows };
  }

  // ---------------- Save Draft ----------------
  // Note: per project convention, browser storage (localStorage/sessionStorage)
  // is not used here. "Save Draft" simply confirms the current answers are
  // intact in the form — nothing is cleared — so the enumerator can keep
  // working. Submitting to Supabase is the durable way to persist a record.
  document.getElementById("saveDraftBtn").addEventListener("click", () => {
    showToast("Your answers are still here — keep filling in the form, then Submit when ready.");
  });

  // ---------------- Submit ----------------
  const submitBtn = document.getElementById("submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validate()) {
      showToast("Please fill in the required fields highlighted in red.", "error");
      const firstError = form.querySelector(".field-error");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!supabase) {
      showToast("Connection to the database isn't set up. Check assets/config.js.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    try {
      const { payload, employedRows, unemployedRows } = collectPayload();

      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .insert(payload)
        .select()
        .single();

      if (surveyError) throw surveyError;

      const surveyId = surveyData.id;

      if (employedRows.length) {
        const { error } = await supabase
          .from("employed_family_members")
          .insert(employedRows.map((r) => ({ ...r, survey_id: surveyId })));
        if (error) throw error;
      }

      if (unemployedRows.length) {
        const { error } = await supabase
          .from("unemployed_qualified_members")
          .insert(unemployedRows.map((r) => ({ ...r, survey_id: surveyId })));
        if (error) throw error;
      }

      form.style.display = "none";
      document.querySelector(".progress-wrap").style.display = "none";
      document.getElementById("successScreen").style.display = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      showToast("Could not submit: " + (err.message || "unknown error"), "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Survey";
    }
  });

  document.getElementById("newSurveyBtn").addEventListener("click", () => {
    window.location.reload();
  });

  // ---------------- init ----------------
  applyBranching();
  updateProgress();
})();
