#!/usr/bin/env node

import { Command } from "commander";
import { DatabaseManager } from "../storage/database";
import { GitAnalyzer } from "../core/git-analyzer";
import { DataAggregator } from "../core/data-aggregator";
import { addRepositoryCommands, addSummaryCommands } from "./commands";

const program = new Command();
const db = new DatabaseManager();
const gitAnalyzer = new GitAnalyzer(db);
const dataAggregator = new DataAggregator(db);

program
  .name("git-summary")
  .description("AI-powered git activity analyzer and summarizer")
  .version("1.0.0");

// Add all command groups
addRepositoryCommands(program, db, gitAnalyzer);
addSummaryCommands(program, dataAggregator);

// Global error handling
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\n👋 Goodbye!");
  db.close();
  process.exit(0);
});

// Parse command line arguments
program.parse();
