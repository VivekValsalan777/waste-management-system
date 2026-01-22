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

/* -------------------- PATHS -------------------- */
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "reports.json");

/* -------------------- ENSURE FILES/FOLDERS EXIST -------------------- */
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

/* -------------------- STATIC FILE SERVING -------------------- */
app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

/* -------------------- HOME ROUTE (ROLE SELECT) -------------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "role-select.html"));
});

/* -------------------- FILE UPLOAD CONFIG -------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

/* -------------------- USER: SUBMIT REPORT -------------------- */
app.post("/api/report", upload.single("photo"), (req, res) => {
  try {
    const { latitude, longitude, description } = req.body;

    if (!req.file || !latitude || !longitude) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const reports = JSON.parse(fs.readFileSync(DATA_FILE));

    const newReport = {
      id: Date.now(),
      image: `/uploads/${req.file.filename}`,
      latitude,
      longitude,
      description: description || "",
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    reports.push(newReport);
    fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));

    res.json({ message: "Report submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------- ADMIN: GET ALL REPORTS -------------------- */
app.get("/api/admin/reports", (req, res) => {
  const reports = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(reports);
});

/* -------------------- ADMIN: UPDATE STATUS -------------------- */
app.post("/api/admin/update", (req, res) => {
  const { id, status } = req.body;

  const reports = JSON.parse(fs.readFileSync(DATA_FILE));
  const report = reports.find(r => r.id == id);

  if (!report) {
    return res.status(404).json({ message: "Report not found" });
  }

  report.status = status;
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));

  res.json({ message: "Status updated" });
});

/* -------------------- SERVER START -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
