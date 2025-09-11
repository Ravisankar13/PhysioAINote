/**
 * Lazy PDF-lib loader to prevent module resolution issues during server startup
 */
export async function getPdfLib() {
  try {
    // Use dynamic import to avoid startup-time loading
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    return req('pdf-lib');
  } catch (error) {
    // Fallback to ESM import if createRequire fails
    console.warn('createRequire failed, trying ESM import:', error);
    return await import('pdf-lib');
  }
}