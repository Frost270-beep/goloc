const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "votes.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    fair: 0,
    dice: 0,
    voters: []
  }, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readVotes() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function writeVotes(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function getClientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (forwarded ? forwarded.split(",")[0] : req.socket.remoteAddress) || "unknown";
  return String(ip).replace(/^::ffff:/, "");
}

app.get("/api/results", (req, res) => {
  const data = readVotes();
  res.json({ fair: data.fair, dice: data.dice, total: data.fair + data.dice });
});

app.post("/api/vote", (req, res) => {
  const party = req.body && req.body.party;
  if (party !== "fair" && party !== "dice") {
    return res.status(400).json({ error: "Неверная партия." });
  }

  const data = readVotes();
  const voterKey = getClientKey(req);

  // Дополнительная защита: один голос с одного IP.
  if (data.voters.includes(voterKey)) {
    return res.status(409).json({ error: "С этого устройства/сети голос уже был учтён." });
  }

  data[party]++;
  data.voters.push(voterKey);
  writeVotes(data);

  res.json({ fair: data.fair, dice: data.dice, total: data.fair + data.dice });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);
});
