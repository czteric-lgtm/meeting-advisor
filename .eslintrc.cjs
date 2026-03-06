module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname
  },
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    "next",
    "next/core-web-vitals",
    "airbnb",
    "airbnb-typescript",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  plugins: ["@typescript-eslint", "react-hooks"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/jsx-props-no-spreading": "off",
    "react/require-default-props": "off",
    "import/prefer-default-export": "off",
    "import/no-extraneous-dependencies": "off"
  },
  ignorePatterns: ["dist/", ".next/", "drizzle/"]
};

