import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    files: ['**/*.rules'],
    plugins: {
      'firebase-rules': firebaseRulesPlugin,
    },
    languageOptions: {
      parser: firebaseRulesPlugin.preprocessors['.rules'],
    },
    rules: {
      // Add rules if needed
    },
  },
];
