const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

router.post("/", async (req, res) => {
  const { firstName, lastName, email, phone, interview } = req.body;

  const { error } = await supabase.from("waitlist").insert({
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone || null,
    interview: interview,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
});

module.exports = router;
