export function formatFileSize(bytes = 0) {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) < 0) return "Unknown size";
  if (Number(bytes) < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = Number(bytes) / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}
