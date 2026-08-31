import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  // Give integration tests (real DB) a generous timeout.
  testTimeout: 15000,
};

export default config;
