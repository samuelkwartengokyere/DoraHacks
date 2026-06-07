const connectDB = require("./config/db");
const seedAdmin = require("./utils/seedAdmin");
const migrateLegacyOwnership = require("./utils/migrateLegacyOwnership");

let readyPromise = null;

async function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await connectDB();
      await seedAdmin();
      await migrateLegacyOwnership();
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}

module.exports = { ensureReady };
