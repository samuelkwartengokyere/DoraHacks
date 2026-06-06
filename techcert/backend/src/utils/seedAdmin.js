const Admin = require("../models/Admin");

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@signalforge.ai";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await Admin.findOne({ email });
  if (existing) return;

  await Admin.create({ email, password, name: "SignalForge Operator" });
  console.log(`Default operator seeded: ${email}`);
}

module.exports = seedAdmin;
