import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          module: "commonjs",
          moduleResolution: "node",
        },
      },
    ],
  },
  moduleNameMapper: {
    "\\.(css|less|scss)$": "identity-obj-proxy",
    "^@CodeTalk/types$": "<rootDir>/../../shared/types/dist/index.js",
    "^@excalidraw/excalidraw$": "<rootDir>/src/test/mocks/excalidraw.tsx",
    "^@hocuspocus/provider$": "<rootDir>/src/test/mocks/hocuspocusProvider.ts",
    "^@tiptap/react$": "<rootDir>/src/test/mocks/tiptapReact.tsx",
    "^@tiptap/(starter-kit|extension-.+)$": "<rootDir>/src/test/mocks/tiptapExtension.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/src/test/setupTests.ts"],
};

export default config;
