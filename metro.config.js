const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve: metroResolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

const stubPath = (name) => path.join(projectRoot, 'lib', 'metro-stubs', name);

config.resolver.extraNodeModules = {
  fs: stubPath('empty.js'),
  path: stubPath('empty.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'qrcode') {
    return {
      type: 'sourceFile',
      filePath: stubPath('qrcode-react-native.js'),
    };
  }

  // 예전 react-native-qrcode-svg 잔여 autolink 방지 (RNSVG codegen 경고)
  if (
    moduleName === 'react-native-qrcode-svg' ||
    moduleName.startsWith('react-native-qrcode-svg/')
  ) {
    return {
      type: 'sourceFile',
      filePath: stubPath('empty.js'),
    };
  }

  return metroResolve(context, moduleName, platform);
};

module.exports = config;
