const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-svg 등: "react-native" → src/*.ts 대신 빌드된 main 사용
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
