const express = require("express");
const router = express.Router();
const { aiShortlist } = require("../controllers/ai.controller");
const { auth, isCompany } = require("../middlewares/auth.middleware");
const aiController = require("../controllers/ai.controller");

router.post("/bulk/:jobId", auth, isCompany, aiController.aiShortlist);
module.exports = router;