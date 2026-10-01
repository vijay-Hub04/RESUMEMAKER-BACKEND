const express = require("express");
const router = express.Router();
const postresume = require("../controllers/resumes");



router.post("/", postresume);


module.exports = router;