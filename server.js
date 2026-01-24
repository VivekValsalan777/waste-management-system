const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Role selection as home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "role-select.html"));
});

// Static folders
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Multer config
const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

const REPORTS_FILE = "reports.json";

// Helpers
const readReports = () =>
  fs.existsSync(REPORTS_FILE)
    ? JSON.parse(fs.readFileSync(REPORTS_FILE))
    : [];

const writeReports = data =>
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(data, null, 2));

// Submit report
app.post("/submit-report", upload.single("image"), (req, res) => {
  const { latitude, longitude } = req.body;
  if (!req.file || !latitude || !longitude)
    return res.status(400).json({ success: false });

  const reports = readReports();
  const reportId = "WR-" + Date.now();

  reports.push({
    reportId,
    image: req.file.filename,
    location: { latitude, longitude },
    status: "Pending",
    createdAt: new Date().toISOString()
  });

  writeReports(reports);
  res.json({ success: true, reportId });
});

// Track report
app.get("/track/:reportId", (req, res) => {
  const report = readReports().find(r => r.reportId === req.params.reportId);
  if (!report) return res.status(404).json({ message: "Report not found" });
  res.json(report);
});

// Admin APIs
app.get("/admin/reports", (req, res) => {
  res.json(readReports());
});

app.post("/admin/update-status", (req, res) => {
  const { reportId, status } = req.body;
  const reports = readReports();
  const report = reports.find(r => r.reportId === reportId);
  if (!report) return res.status(404).json({ message: "Not found" });

  report.status = status;
  writeReports(reports);
  res.json({ success: true });
});

// Clear completed reports
app.post("/admin/clear-completed", (req, res) => {
  const activeReports = readReports().filter(r => r.status !== "Completed");
  writeReports(activeReports);
  res.json({ success: true });
});

app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);
