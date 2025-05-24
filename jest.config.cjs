import { describe, it, expect } from "@jest/globals";

export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
    "^.+\\.ts$": "ts-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!dependency1|dependency2|dependency3)/"
  ]
};

{
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true
  }
}