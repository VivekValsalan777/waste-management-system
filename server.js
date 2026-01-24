const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Data file
const REPORTS_FILE = "reports.json";

// Helper: read reports
function readReports() {
  if (!fs.existsSync(REPORTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(REPORTS_FILE));
}

// Helper: write reports
function writeReports(data) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(data, null, 2));
}

// ===============================
// SUBMIT REPORT
// ===============================
app.post("/submit-report", upload.single("image"), (req, res) => {
  const { latitude, longitude } = req.body;

  if (!req.file || !latitude || !longitude) {
    return res.status(400).json({ message: "Missing data" });
  }

  const reports = readReports();

  const reportId = "WR-" + Date.now();

  const newReport = {
    reportId,
    image: req.file.filename,
    location: {
      latitude,
      longitude
    },
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  reports.push(newReport);
  writeReports(reports);

  res.json({
    success: true,
    reportId
  });
});

// ===============================
// TRACK REPORT
// ===============================
app.get("/track/:reportId", (req, res) => {
  const { reportId } = req.params;
  const reports = readReports();

  const report = reports.find(r => r.reportId === reportId);

  if (!report) {
    return res.status(404).json({ message: "Report not found" });
  }

  res.json(report);
});

// ===============================
// ADMIN: GET ALL REPORTS
// ===============================
app.get("/admin/reports", (req, res) => {
  res.json(readReports());
});

// ===============================
// ADMIN: UPDATE STATUS
// ===============================
app.post("/admin/update-status", (req, res) => {
  const { reportId, status } = req.body;
  const reports = readReports();

  const report = reports.find(r => r.reportId === reportId);
  if (!report) {
    return res.status(404).json({ message: "Report not found" });
  }

  report.status = status;
  writeReports(reports);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
