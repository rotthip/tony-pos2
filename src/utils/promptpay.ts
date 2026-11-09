/**
 * EMVCo PromptPay Dynamic QR Code Generator
 * Conforms to Bank of Thailand (BOT) QR Standard
 */

// Helper to format EMVCo Tag-Length-Value (TLV)
function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// CRC16-CCITT calculation (Polynomial 0x1021, Initial 0xFFFF)
export function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    crc ^= code << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Format target ID (mobile phone or National ID) for PromptPay AID
 */
export function formatPromptPayTarget(target: string): { subTag: string; formatted: string } {
  // Strip non-digits
  const cleaned = target.replace(/[^0-9]/g, '');

  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Mobile number: Thai mobile 08x/09x/06x -> 00668x
    const intl = '0066' + cleaned.substring(1);
    return {
      subTag: '01',
      formatted: intl,
    };
  } else if (cleaned.length === 13) {
    // National ID or Tax ID: 13 digits
    return {
      subTag: '02',
      formatted: cleaned,
    };
  } else if (cleaned.length === 15) {
    // E-Wallet ID: 15 digits
    return {
      subTag: '03',
      formatted: cleaned,
    };
  } else {
    // Default fallback to 01 (mobile) or 02
    return {
      subTag: cleaned.length <= 10 ? '01' : '02',
      formatted: cleaned.startsWith('0') ? '0066' + cleaned.substring(1) : cleaned,
    };
  }
}

/**
 * Generate full EMVCo PromptPay QR string
 * @param target PromptPay ID (Mobile e.g. "0812345678" or National ID e.g. "1100200300400")
 * @param amount Optional amount in THB (e.g. 150.00). If provided, generates dynamic QR (tag 01=12).
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  const { subTag, formatted } = formatPromptPayTarget(target);

  // 00: Payload Format Indicator (01)
  const f00 = formatTLV('00', '01');

  // 01: Point of Initiation Method: 11 = Static, 12 = Dynamic (with amount)
  const isDynamic = typeof amount === 'number' && amount > 0;
  const f01 = formatTLV('01', isDynamic ? '12' : '11');

  // 29: Merchant Account Information (PromptPay AID)
  // SubTag 00: AID A000000677010111
  const aidSubTag = formatTLV('00', 'A000000677010111');
  const targetSubTag = formatTLV(subTag, formatted);
  const f29 = formatTLV('29', aidSubTag + targetSubTag);

  // 53: Transaction Currency: 764 (THB)
  const f53 = formatTLV('53', '764');

  // 54: Transaction Amount (if present, formatted with 2 decimals)
  let f54 = '';
  if (isDynamic && amount !== undefined) {
    const formattedAmount = Number(amount).toFixed(2);
    f54 = formatTLV('54', formattedAmount);
  }

  // 58: Country Code: TH
  const f58 = formatTLV('58', 'TH');

  // Assembled string before CRC (with 6304 appended)
  const payloadWithoutCRC = `${f00}${f01}${f29}${f53}${f54}${f58}6304`;
  const checksum = crc16(payloadWithoutCRC);

  return `${payloadWithoutCRC}${checksum}`;
}
