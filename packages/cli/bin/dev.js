#!/usr/bin/env node

const path = require("path");

require("dotenv").config();
require("ts-node").register({
  project: path.join(__dirname, "..", "tsconfig.json"),
});
require("../src/index.ts");
