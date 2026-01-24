const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const FileStore = require("session-file-store")(session);

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= ADMIN CREDENTIALS ================= */
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

/* ================= ENSURE FOLDERS ================= */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("sessions")) fs.mkdirSync("sessions");
if (!fs.existsSync("reports.json")) fs.writeFileSync("reports.json", "[]");

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new FileStore({ path: "./sessions" }),
    secret: "waste-management-secret",
    resave: false,
    saveUninitialized: false
  })
);

/* ================= STATIC FILES ================= */
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* ================= FIRST PAGE ================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "role-select.html"));
});

/* ================= MULTER CONFIG ================= */
const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

/* ================= DATA HELPERS ================= */
const REPORTS_FILE = "reports.json";

function readReports() {
  return JSON.parse(fs.readFileSync(REPORTS_FILE));
}

function writeReports(data) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(data, null, 2));
}

/* ================= USER: SUBMIT REPORT ================= */
app.post("/submit-report", upload.single("image"), (req, res) => {
  const { latitude, longitude } = req.body;

  if (!req.file || !latitude || !longitude) {
    return res.status(400).json({ success: false });
  }

  const reports = readReports();
  const reportId = "WR-" + Date.now();

  reports.push({
    reportId,
    image: req.file.filename,
    location: {
      latitude,
      longitude
    },
    status: "Pending",
    createdAt: new Date().toISOString()
  });

  writeReports(reports);

  res.json({
    success: true,
    reportId
  });
});

/* ================= USER: TRACK REPORT ================= */
app.get("/track/:id", (req, res) => {
  const reports = readReports();
  const report = reports.find(r => r.reportId === req.params.id);

  if (!report) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json(report);
});

/* ================= ADMIN AUTH ================= */
function adminAuth(req, res, next) {
  if (req.session.admin) return next();
  res.status(401).json({ message: "Unauthorized" });
}

/* ================= ADMIN LOGIN ================= */
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = true;
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

/* ================= ADMIN LOGOUT ================= */
app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

/* ================= ADMIN: GET REPORTS ================= */
app.get("/admin/reports", adminAuth, (req, res) => {
  res.json(readReports());
});

/* ================= ADMIN: UPDATE STATUS ================= */
app.post("/admin/update-status", adminAuth, (req, res) => {
  const { reportId, status } = req.body;

  const reports = readReports();
  const report = reports.find(r => r.reportId === reportId);

  if (!report) {
    return res.status(404).json({ success: false });
  }

  report.status = status;
  writeReports(reports);

  res.json({ success: true });
});

/* ================= ADMIN: CLEAR COMPLETED ================= */
app.post("/admin/clear-completed", adminAuth, (req, res) => {
  const reports = readReports().filter(r => r.status !== "Completed");
  writeReports(reports);
  res.json({ success: true });
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
