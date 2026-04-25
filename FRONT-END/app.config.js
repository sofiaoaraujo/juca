const dotenv = require('dotenv');
dotenv.config();

const geminiKey = process.env.EXPO_PUBLIC_GEMINI_KEY || '';

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    geminiApiKey: geminiKey,
  },
});
