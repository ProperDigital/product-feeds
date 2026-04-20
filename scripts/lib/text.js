export function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareNumericStrings(left, right) {
  const leftBigInt = toBigInt(left);
  const rightBigInt = toBigInt(right);

  if (leftBigInt !== null && rightBigInt !== null) {
    if (leftBigInt < rightBigInt) return -1;
    if (leftBigInt > rightBigInt) return 1;
    return 0;
  }

  return String(left ?? "").localeCompare(String(right ?? ""), "en");
}

function toBigInt(value) {
  const text = String(value ?? "");
  return /^\d+$/.test(text) ? BigInt(text) : null;
}
