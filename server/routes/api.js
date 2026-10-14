const express = require("express");
const router = express.Router();

const {
  getMap,
  findRoute,
  getLocations,
  getStats,
} = require("../controllers/routeController");

router.get("/map", getMap);
router.get("/locations", getLocations);
router.post("/route", findRoute);
router.get("/stats", getStats);

module.exports = router;    
