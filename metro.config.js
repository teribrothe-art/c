const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve: metroResolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const stubsRoot = path.join(projectRoot, 'lib', 'metro-stubs');

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

const stubPath = (name) => path.join(stubsRoot, name);

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

  return metroResolve(context, moduleName, platform);
};

module.exports = config;
