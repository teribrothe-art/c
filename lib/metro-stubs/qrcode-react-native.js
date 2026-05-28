/**
 * React Native용 qrcode 경량 엔트리 — Node fs/canvas 경로 제외
 */
const core = require('qrcode/lib/core/qrcode');

module.exports = {
  create: core.create,
};
