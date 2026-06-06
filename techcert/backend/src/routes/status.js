const express = require("express");
const { getIntegrationStatus } = require("../utils/integrationStatus");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const deep = req.query.deep === "true";
    const status = await getIntegrationStatus({ deep });
    res.json(status);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
