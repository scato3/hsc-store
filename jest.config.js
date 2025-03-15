module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom", // DOM 환경이 필요한 테스트를 위해
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  roots: ["<rootDir>/tests"],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  testMatch: null, // testRegex를 사용하므로 testMatch는 사용하지 않음
};
