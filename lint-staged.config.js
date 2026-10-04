export default {
  "*.{ts,tsx,js}": ["eslint --fix --max-warnings=0 --no-warn-ignored", "prettier --write"],
  "*.{css,json,md,yml,yaml}": "prettier --write",
};
