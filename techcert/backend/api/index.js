const app = require("../src/app");
const { ensureReady } = require("../src/bootstrap");

module.exports = async (req, res) => {
  await ensureReady();
  return app(req, res);
};
