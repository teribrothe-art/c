/**
 * react-native-qrcode-svg는 QRCode.create()만 사용 — Node fs/canvas 경로 제외
 */
const core = require('qrcode/lib/core/qrcode');

module.exports = {
  create: core.create,
};
