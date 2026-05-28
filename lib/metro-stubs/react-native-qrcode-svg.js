/**
 * 레거시 import 차단 — 실제 QR은 invite-qr-code(View 그리드) 사용
 */
const React = require('react');
const { View } = require('react-native');

function StubQrCode() {
  return React.createElement(View, { style: { width: 1, height: 1 } });
}

module.exports = StubQrCode;
module.exports.default = StubQrCode;
