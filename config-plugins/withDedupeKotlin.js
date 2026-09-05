const { withAppBuildGradle } = require('@expo/config-plugins');

const KOTLIN_APPLY = /^\s*apply\s+plugin:\s*("kotlin-android"|"org\.jetbrains\.kotlin\.android")\s*$/;

module.exports = function withDedupeKotlin(config) {
  return withAppBuildGradle(config, (newConfig) => {
    const { modResults } = newConfig;
    const cleaned = modResults.contents
      .split('\n')
      .filter((line) => !KOTLIN_APPLY.test(line))
      .join('\n');
    const withKotlin = cleaned.replace(
      /(apply\s+plugin:\s*"com\.android\.application"\r?\n)/,
      '$1apply plugin: "kotlin-android"\n'
    );
    modResults.contents = withKotlin;
    return newConfig;
  });
};