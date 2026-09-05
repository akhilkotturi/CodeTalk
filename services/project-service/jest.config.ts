import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { module: "commonjs", esModuleInterop: true } }],
  },
};

export default config;