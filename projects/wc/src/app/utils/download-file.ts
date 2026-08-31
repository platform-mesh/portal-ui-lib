export function downloadFile(
  contents: BlobPart,
  filename: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
