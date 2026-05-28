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
  if (moduleName === 'react-native-svg') {
    return {
      type: 'sourceFile',
      filePath: path.join(projectRoot, 'node_modules', 'react-native-svg', 'lib', 'commonjs', 'index.js'),
    };
  }

  if (moduleName === 'qrcode') {
    return {
      type: 'sourceFile',
      filePath: stubPath('qrcode-react-native.js'),
    };
  }

  if (moduleName === 'react-native-qrcode-svg') {
    return {
      type: 'sourceFile',
      filePath: stubPath('react-native-qrcode-svg.js'),
    };
  }

  return metroResolve(context, moduleName, platform);
};

module.exports = config;
