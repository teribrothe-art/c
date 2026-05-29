/**
 * React Native용 qrcode 엔트리 — Node fs/canvas 경로 제외, create()만 노출
 */
const core = require('qrcode/lib/core/qrcode');

module.exports = {
  create: core.create,
};
