module.exports = {
  preset: "jest-expo",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
  collectCoverageFrom: ["src/lib/**/*.ts", "!src/lib/auth/**", "!src/lib/config.ts"],
};
