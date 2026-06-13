import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/admin/login", async (req, res) => {
  const { password } = req.body ?? {};

  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password required" });
  }

  // Support plain ADMIN_PASSWORD (easy to set in Railway) or bcrypt hash
  const plainPassword = process.env.ADMIN_PASSWORD;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Server misconfigured - set JWT_SECRET" });
  }

  if (!plainPassword && !hash) {
    return res.status(500).json({ error: "Server misconfigured — set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH" });
  }

  let valid = false;
  if (plainPassword) {
    valid = password === plainPassword;
  } else {
    valid = await bcrypt.compare(password, hash);
  }

  if (!valid) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token });
});

export default router;
