const storageKeys = {
  users: "sdp-users",
  session: "sdp-session",
  records: "sdp-records",
};

let records = loadRecords();
let editingId = null;

const authPanel = document.querySelector("#authPanel");
const dashboard = document.querySelector("#dashboard");
const toast = document.querySelector("#toast");

const getUsers = () => JSON.parse(localStorage.getItem(storageKeys.users) || "[]");
const setUsers = (users) => localStorage.setItem(storageKeys.users, JSON.stringify(users));

function loadRecords() {
  return JSON.parse(localStorage.getItem(storageKeys.records) || "[]");
}

function saveRecords() {
  localStorage.setItem(storageKeys.records, JSON.stringify(records));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function switchAuthTab(tabName) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === tabName);
  });

  document.querySelectorAll(".auth-form").forEach((form) => form.classList.remove("active"));
  document.querySelector(`#${tabName}Form`).classList.add("active");
}

function setSession(email) {
  localStorage.setItem(storageKeys.session, email);
  renderSession();
}

function renderSession() {
  const email = localStorage.getItem(storageKeys.session);
  authPanel.classList.toggle("hidden", Boolean(email));
  dashboard.classList.toggle("hidden", !email);

  if (email) {
    const user = getUsers().find((item) => item.email === email);
    document.querySelector("#signedInUser").textContent = user ? user.name : email;
    renderRecords();
  }
}

function serializeForm() {
  return {
    id: editingId || crypto.randomUUID(),
    serialNo: document.querySelector("#serialNo").value.trim(),
    regNo: document.querySelector("#regNo").value.trim(),
    courseNo: document.querySelector("#courseNo").value.trim(),
    programCode: document.querySelector("#programCode").value.trim(),
    passingYear: document.querySelector("#passingYear").value.trim(),
    studentName: document.querySelector("#studentName").value.trim(),
    status: document.querySelector("#status").value,
    notes: document.querySelector("#notes").value.trim(),
    submittedAt: editingId ? records.find((record) => record.id === editingId)?.submittedAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function populateForm(record) {
  editingId = record.id;
  document.querySelector("#serialNo").value = record.serialNo;
  document.querySelector("#regNo").value = record.regNo;
  document.querySelector("#courseNo").value = record.courseNo;
  document.querySelector("#programCode").value = record.programCode;
  document.querySelector("#passingYear").value = record.passingYear;
  document.querySelector("#studentName").value = record.studentName;
  document.querySelector("#status").value = record.status;
  document.querySelector("#notes").value = record.notes || "";
  document.querySelector("#saveRecordBtn").textContent = "Update record";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  editingId = null;
  document.querySelector("#recordForm").reset();
  document.querySelector("#saveRecordBtn").textContent = "Save record";
}

function renderRecords() {
  const query = document.querySelector("#searchInput").value.trim().toLowerCase();
  const filtered = records.filter((record) => {
    return Object.values(record).join(" ").toLowerCase().includes(query);
  });

  const table = document.querySelector("#recordsTable");
  table.innerHTML = filtered
    .map(
      (record) => `
        <tr>
          <td>${escapeHtml(record.serialNo)}</td>
          <td>${escapeHtml(record.regNo)}</td>
          <td>${escapeHtml(record.courseNo)}</td>
          <td>${escapeHtml(record.programCode)}</td>
          <td>${escapeHtml(record.passingYear)}</td>
          <td>${escapeHtml(record.studentName)}</td>
          <td>${escapeHtml(record.status)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-button" data-edit="${record.id}" type="button" title="Edit">Edit</button>
              <button class="icon-button" data-delete="${record.id}" type="button" title="Delete">Del</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  const emptyState = document.querySelector("#emptyState");
  emptyState.style.display = filtered.length ? "none" : "grid";
  document.querySelector("#recordCount").textContent = `${filtered.length} of ${records.length} records shown`;
  document.querySelector("#totalRecords").textContent = records.length;
  document.querySelector("#totalPrograms").textContent = new Set(records.map((record) => record.programCode).filter(Boolean)).size;
  document.querySelector("#latestYear").textContent = records.length
    ? Math.max(...records.map((record) => Number(record.passingYear) || 0))
    : "-";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
  });
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function toCsv(data) {
  const headers = ["serialNo", "regNo", "courseNo", "programCode", "passingYear", "studentName", "status", "notes", "submittedAt"];
  const rows = data.map((record) =>
    headers
      .map((header) => {
        const value = String(record[header] ?? "");
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function parseCsv(text) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim()));

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => normalizeHeader(header));
  return rows.slice(1).map((cells) => {
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    return {
      id: crypto.randomUUID(),
      serialNo: row.serialNo || row.serial || "",
      regNo: row.regNo || row.registrationNo || "",
      courseNo: row.courseNo || "",
      programCode: row.programCode || "",
      passingYear: row.passingYear || row.year || "",
      studentName: row.studentName || row.name || "",
      status: row.status || "Submitted",
      notes: row.notes || "",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

function normalizeHeader(header) {
  const cleaned = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  const map = {
    serialno: "serialNo",
    serial: "serial",
    regno: "regNo",
    registrationno: "registrationNo",
    courseno: "courseNo",
    programcode: "programCode",
    yearofpassing: "passingYear",
    passingyear: "passingYear",
    year: "year",
    studentname: "studentName",
    name: "name",
    status: "status",
    notes: "notes",
  };
  return map[cleaned] || cleaned;
}

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
});

document.querySelector("#signupForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const users = getUsers();
  const name = document.querySelector("#signupName").value.trim();
  const email = document.querySelector("#signupEmail").value.trim().toLowerCase();
  const password = document.querySelector("#signupPassword").value;

  if (users.some((user) => user.email === email)) {
    showToast("This email already has an account.");
    return;
  }

  users.push({ name, email, password });
  setUsers(users);
  setSession(email);
  showToast("Account created successfully.");
});

document.querySelector("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
  const password = document.querySelector("#loginPassword").value;
  const user = getUsers().find((item) => item.email === email && item.password === password);

  if (!user) {
    showToast("Email or password is incorrect.");
    return;
  }

  setSession(email);
  showToast("Logged in successfully.");
});

document.querySelector("#forgotForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#forgotEmail").value.trim().toLowerCase();
  const users = getUsers();
  const user = users.find((item) => item.email === email);

  if (!user) {
    showToast("No account was found for this email.");
    return;
  }

  user.password = "Temp@123";
  setUsers(users);
  showToast("Temporary password set to Temp@123.");
  switchAuthTab("login");
});

document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(storageKeys.session);
  renderSession();
});

document.querySelector("#recordForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const record = serializeForm();
  const duplicate = records.some((item) => item.regNo.toLowerCase() === record.regNo.toLowerCase() && item.id !== record.id);

  if (duplicate) {
    showToast("Registration number already exists.");
    return;
  }

  records = editingId ? records.map((item) => (item.id === editingId ? record : item)) : [record, ...records];
  saveRecords();
  clearForm();
  renderRecords();
  showToast(editingId ? "Record updated." : "Record saved.");
});

document.querySelector("#recordsTable").addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const record = records.find((item) => item.id === editId);
    if (record) populateForm(record);
  }

  if (deleteId && confirm("Delete this record from database?")) {
    records = records.filter((item) => item.id !== deleteId);
    saveRecords();
    renderRecords();
    showToast("Record deleted.");
  }
});

document.querySelector("#clearFormBtn").addEventListener("click", clearForm);
document.querySelector("#searchInput").addEventListener("input", renderRecords);

document.querySelector("#downloadCsvBtn").addEventListener("click", () => {
  downloadFile("student-records.csv", toCsv(records), "text/csv");
});

document.querySelector("#downloadJsonBtn").addEventListener("click", () => {
  downloadFile("student-records.json", JSON.stringify(records, null, 2), "application/json");
});

document.querySelector("#clearDatabaseBtn").addEventListener("click", () => {
  if (!records.length) {
    showToast("Database is already empty.");
    return;
  }

  if (confirm("Clear all submitted records from this browser database?")) {
    records = [];
    saveRecords();
    renderRecords();
    showToast("Database cleared.");
  }
});

document.querySelector("#csvInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const imported = parseCsv(await file.text());
  records = [...imported, ...records];
  saveRecords();
  renderRecords();
  showToast(`${imported.length} records uploaded.`);
  event.target.value = "";
});

if (!getUsers().length) {
  setUsers([{ name: "Demo Admin", email: "admin@example.com", password: "admin123" }]);
}

renderSession();
