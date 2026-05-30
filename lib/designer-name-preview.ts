const DEFAULT_PREVIEW_COUNT = 3;

/** 매장 카드 등 — 디자이너 이름 일부만 노출 후 「외 N명」 */
export function formatDesignerNamePreview(
  names: string[],
  previewCount = DEFAULT_PREVIEW_COUNT,
  emptyLabel = '연결 디자이너 없음',
): string {
  const trimmed = names.map((name) => name.trim()).filter(Boolean);

  if (trimmed.length === 0) {
    return emptyLabel;
  }

  if (trimmed.length <= previewCount) {
    return trimmed.join(' · ');
  }

  const shown = trimmed.slice(0, previewCount);
  const restCount = trimmed.length - previewCount;

  return `${shown.join(' · ')} 외 ${restCount}명`;
}
