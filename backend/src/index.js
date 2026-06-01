const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");
const memorialRoutes = require("./routes/memorials");
const contributeRoutes = require("./routes/contribute");
const aiRoutes = require("./routes/ai");
const shareRoutes = require("./routes/share");
const waitlistRoutes = require("./routes/waitlist"); // add with other requires
// ← ADDED

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/memorials", memorialRoutes);
app.use("/contribute", contributeRoutes);
app.use("/ai", aiRoutes);
app.use("/share", shareRoutes);
app.use("/waitlist", waitlistRoutes); // add with other app.use calls                    // ← ADDED

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Remember API running on port ${PORT}`);
});
