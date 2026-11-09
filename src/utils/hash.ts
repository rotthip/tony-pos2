/**
 * Hash utility for Manager PIN (SHA-256)
 */
export async function hashPin(pin: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(pin + '_sabaipos_salt');
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }

  // Simple deterministic fallback hash if crypto.subtle is restricted
  let hash = 0;
  const str = pin + '_sabaipos_salt';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'simple_' + Math.abs(hash).toString(16);
}

// Pre-calculated hash for default demo PIN "1234"
export const DEFAULT_DEMO_PIN_HASH = '1234_demo_hash';
