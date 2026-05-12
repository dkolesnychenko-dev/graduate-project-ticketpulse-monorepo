module.exports = {
  extends: ["eslint-config-custom"],
  ignorePatterns: ["build/", "generated/", "tests/"],
  rules: {
    // The Graph uses a specific AssemblyScript variant of TS
    // Sometimes standard TS rules clash, so we can disable them here if needed.
    "@typescript-eslint/ban-types": "off",
    "prefer-const": "off"
  }
};
