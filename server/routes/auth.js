import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/admin/login", async (req, res) => {
  const { password } = req.body ?? {};

  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password required" });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    return res.status(500).json({ error: "Server misconfigured — set ADMIN_PASSWORD_HASH" });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    // Consistent timing to avoid timing attacks
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token });
});

export default router;
