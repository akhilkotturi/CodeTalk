import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testTimeout: 15000,
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "e2e/tsconfig.json" }],
  },
};

export default config;
