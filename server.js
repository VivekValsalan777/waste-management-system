const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const upload = multer({ dest: "uploads/" });
const DATA_FILE = "reports.json";

/* Helper functions */
function readReports() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeReports(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* Submit waste report */
app.post("/report", upload.single("photo"), (req, res) => {
  const { latitude, longitude } = req.body;

  const reports = readReports();
  reports.push({
    id: Date.now(),
    image: req.file.filename,
    latitude,
    longitude,
    status: "Pending",
    date: new Date().toISOString()
  });

  writeReports(reports);
  res.send({ message: "Report saved" });
});

/* Get all reports (dashboard) */
app.get("/reports", (req, res) => {
  res.json(readReports());
});

/* Update report status (admin) */
app.post("/update-status", (req, res) => {
  const { id, status } = req.body;
  const reports = readReports();

  const report = reports.find(r => r.id === id);
  if (report) report.status = status;

  writeReports(reports);
  res.send({ message: "Status updated" });
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
