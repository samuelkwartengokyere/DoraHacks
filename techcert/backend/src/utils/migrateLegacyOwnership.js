const Admin = require("../models/Admin");
const Agent = require("../models/Agent");
const StrategyRun = require("../models/StrategyRun");

async function migrateLegacyOwnership() {
  const email = process.env.ADMIN_EMAIL || "admin@signalforge.ai";
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) return;

  await Agent.updateMany({ ownerId: { $exists: false } }, { ownerId: admin._id });
  await StrategyRun.updateMany({ ownerId: { $exists: false } }, { ownerId: admin._id });
}

module.exports = migrateLegacyOwnership;
