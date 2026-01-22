const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- FOLDERS -------------------- */
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "reports.json");

/* Create folders/files if missing */
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

/* -------------------- STATIC FILES -------------------- */
app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

/* -------------------- HOME ROUTE -------------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

/* -------------------- FILE UPLOAD SETUP -------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

/* -------------------- USER REPORT API -------------------- */
app.post("/api/report", upload.single("photo"), (req, res) => {
  try {
    const { latitude, longitude, description } = req.body;

    if (!req.file || !latitude || !longitude) {
      return res.status(400).json({ message: "Missing data" });
    }

    const reports = JSON.parse(fs.readFileSync(DATA_FILE));

    const newReport = {
      id: Date.now(),
      image: `/uploads/${req.file.filename}`,
      latitude,
      longitude,
      description: description || "",
      status: "Pending",
      createdAt: new Date()
    };

    reports.push(newReport);
    fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));

    res.json({ message: "Report submitted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------- ADMIN LOGIN -------------------- */
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  // CHANGE THESE IN PRODUCTION
  if (username === "admin" && password === "admin123") {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

/* -------------------- ADMIN GET REPORTS -------------------- */
app.get("/api/admin/reports", (req, res) => {
  const reports = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(reports);
});

/* -------------------- UPDATE REPORT STATUS -------------------- */
app.post("/api/admin/update", (req, res) => {
  const { id, status } = req.body;
  const reports = JSON.parse(fs.readFileSync(DATA_FILE));

  const report = reports.find(r => r.id == id);
  if (!report) return res.status(404).json({ message: "Not found" });

  report.status = status;
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));

  res.json({ message: "Status updated" });
});

/* -------------------- PORT -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
