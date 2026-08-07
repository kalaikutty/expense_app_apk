export interface ParsedSmsEntry {
  id: string;
  originalText: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  title: string;
  category: string;
  date: string; // ISO date string (YYYY-MM-DD)
  referenceNo?: string;
  selected: boolean;
  bankName?: string;
}

export const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transport',
  'Bills & Utilities',
  'Entertainment',
  'Salary',
  'Health',
  'Investment',
  'Other',
];

// Marketing/promotional phrasing that indicates the SMS is NOT an actual transaction
const PROMOTIONAL_PATTERNS: RegExp[] = [
  /\bclick here\b/i,
  /\bapply now\b/i,
  /\bsign[\s-]?up\b/i,
  /\bsubscribe\b/i,
  /\bunsubscribe\b/i,
  /t&c(s)?\s*apply/i,
  /terms\s*(and|&)\s*conditions\s*apply/i,
  /\d+\s*%\s*off/i,
  /\bflat\s*(rs\.?|inr|₹)?\s*[\d,]+\s*off/i,
  /\bsale\b/i,
  /\bdiscount(s|ed)?\b/i,
  /\bcoupon\b/i,
  /\bpromo\s*code\b/i,
  /\buse code\b/i,
  /offer\s*(valid|ends|expires)/i,
  /\bexclusive\s*offer\b/i,
  /\blimited\s*(period|time)\b/i,
  /\bwin\b\s*(exciting|rs|inr|₹|a\b|prizes)/i,
  /\bwinner\b/i,
  /lucky\s*draw/i,
  /\blottery\b/i,
  /\bprize(s)?\b/i,
  /congratulations,?\s*you/i,
  /pre[- ]?approved/i,
  /loan\s*(up\s*to|offer|starting|available)/i,
  /interest\s*rate\s*(as\s*low|starting)/i,
  /emi\s*(option|starting|available)/i,
  /insurance\s*plan/i,
  /\bshop now\b/i,
  /\bbook now\b/i,
  /\bbuy now\b/i,
  /\binstall now\b/i,
  /refer\s*(and|&)\s*earn/i,
  /new\s*user\s*offer/i,
  /download\s*(the|our)?\s*app/i,
  /\brate us\b/i,
  /give\s*feedback/i,
  /\bsurvey\b/i,
  /https?:\/\//i,
  /\bwww\./i,
  /bit\.ly/i,
  /\bhurry\b/i,
  /valid\s*(till|until)\b/i,
  /best\s*price/i,
  /mega\s*sale/i,
  /festival\s*offer/i,
  /season\s*sale/i,
  /cashback\s*(up\s*to|upto|on your|of\s*upto|worth)/i,
  /get\s*(up\s*to\s*)?(rs\.?|inr|₹)?\s*[\d,]*\s*cashback/i,
  /earn\s*(rewards?|points)/i,
  /gift\s*(card|voucher)/i,
];

/**
  Parse a single bank SMS message string into structured transaction data.
 */
export function parseBankSms(smsText: string, defaultDate: string = new Date().toISOString().slice(0, 10)): ParsedSmsEntry | null {
  if (!smsText || typeof smsText !== 'string') return null;

  const text = smsText.trim();
  if (text.length < 10) return null;

  // Reject promotional/marketing SMS before attempting to treat it as a transaction
  if (PROMOTIONAL_PATTERNS.some((re) => re.test(text))) {
    return null;
  }

  const lowerText = text.toLowerCase();

  // Determine Type (DEBIT vs CREDIT)
  let type: 'DEBIT' | 'CREDIT' = 'DEBIT';
  const creditKeywords = ['credited', 'received', 'refund', 'refunded', 'deposited', 'cashback', 'added to a/c', 'cr '];
  const debitKeywords = ['debited', 'paid', 'spent', 'sent', 'purchase', 'withdrawn', 'deducted', 'dr '];

  const hasCredit = creditKeywords.some((k) => lowerText.includes(k));
  const hasDebit = debitKeywords.some((k) => lowerText.includes(k));

  // A genuine transaction SMS must explicitly state a debit or credit action
  if (!hasCredit && !hasDebit) {
    return null;
  }

  if (hasCredit && !hasDebit) {
    type = 'CREDIT';
  } else if (hasDebit) {
    type = 'DEBIT';
  }

  // Extract Amount (e.g. Rs. 450.00, Rs 1,200, INR 350, ₹ 500)
  let amount = 0;
  const amountRegexes = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i,
    /(?:amt|amount)\s*(?:of)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /debited\s*(?:by)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /credited\s*(?:by)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  if (amount <= 0) {
    return null; // Not a valid financial SMS
  }

  // Extract Bank Name if present
  let bankName = 'Bank SMS';
  if (/hdfc/i.test(text)) bankName = 'HDFC Bank';
  else if (/sbi|state bank/i.test(text)) bankName = 'SBI';
  else if (/icici/i.test(text)) bankName = 'ICICI Bank';
  else if (/axis/i.test(text)) bankName = 'Axis Bank';
  else if (/kotak/i.test(text)) bankName = 'Kotak Bank';
  else if (/paytm/i.test(text)) bankName = 'Paytm';
  else if (/phonepe/i.test(text)) bankName = 'PhonePe';
  else if (/gpay|google pay/i.test(text)) bankName = 'Google Pay';

  // Extract Date
  let dateStr = defaultDate;
  // Match patterns like 05-Aug-26, 05/08/2026, 05-08-2026, 05Aug2026
  const dateRegexes = [
    /(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})/, // 05-Aug-2026 or 05-Aug-26
    /(\d{1,2})([A-Za-z]{3})(\d{2,4})/,          // 05Aug26
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/,      // 05/08/2026 or 05-08-26
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,      // 2026-08-05
  ];

  const monthsMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  for (const reg of dateRegexes) {
    const match = text.match(reg);
    if (match) {
      if (isNaN(Number(match[2]))) {
        // Month name format (e.g. 05-Aug-26)
        const day = parseInt(match[1], 10);
        const mStr = match[2].toLowerCase().slice(0, 3);
        const month = monthsMap[mStr] !== undefined ? monthsMap[mStr] : new Date().getMonth();
        let yr = parseInt(match[3], 10);
        if (yr < 100) yr += 2000;
        const dObj = new Date(yr, month, day, 12, 0, 0);
        if (!isNaN(dObj.getTime())) {
          dateStr = dObj.toISOString().slice(0, 10);
          break;
        }
      } else {
        // Numeric date format (e.g. 05/08/2026 or 2026-08-05)
        let day = parseInt(match[1], 10);
        let month = parseInt(match[2], 10) - 1;
        let yr = parseInt(match[3], 10);
        if (match[1].length === 4) {
          // YYYY-MM-DD
          yr = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
          day = parseInt(match[3], 10);
        } else if (yr < 100) {
          yr += 2000;
        }
        const dObj = new Date(yr, month, day, 12, 0, 0);
        if (!isNaN(dObj.getTime())) {
          dateStr = dObj.toISOString().slice(0, 10);
          break;
        }
      }
    }
  }

  // Extract Reference No
  let referenceNo = '';
  const refMatch = text.match(/(?:ref|rrn|txn|id|upi ref|ref no)[.:\s]*([a-zA-Z0-9]+)/i);
  if (refMatch && refMatch[1]) {
    referenceNo = refMatch[1];
  }

  // Extract Title / Merchant
  let title = 'Bank Transaction';
  const toAtForMatch = text.match(/(?:to|at|for|credited to|transfer to|paid to)\s+([A-Za-z0-9\s&.-]+?)(?=\s+(?:on|ref|via|avail|bal|a\/c|from|date|$))/i);
  if (toAtForMatch && toAtForMatch[1] && toAtForMatch[1].trim().length > 2) {
    title = toAtForMatch[1].trim();
  } else if (type === 'CREDIT') {
    const fromMatch = text.match(/(?:from|by)\s+([A-Za-z0-9\s&.-]+?)(?=\s+(?:on|ref|via|avail|bal|a\/c|$))/i);
    if (fromMatch && fromMatch[1] && fromMatch[1].trim().length > 2) {
      title = fromMatch[1].trim();
    } else {
      title = 'Credit / Refund';
    }
  }

  // Clean up title
  title = title.replace(/^(hdfc|sbi|icici|axis|kotak|bank|vpa|upi)\s+/i, '');
  title = title.replace(/\s+(ref|rrn|avail|bal|a\/c).*$/i, '').trim();
  if (!title || title.length < 2) {
    title = type === 'DEBIT' ? 'Debit Purchase' : 'Credit Received';
  }

  // Auto Categorize
  let category = 'Other';
  const lowerTitle = (title + ' ' + text).toLowerCase();

  if (/swiggy|zomato|chai|coffee|starbucks|restaurant|food|mcdonald|domino|kfc|dine|bakery/i.test(lowerTitle)) {
    category = 'Food & Dining';
  } else if (/amazon|flipkart|myntra|tata|mart|reliance|blinkit|zepto|instamart|grocery|supermarket|mall/i.test(lowerTitle)) {
    category = 'Shopping';
  } else if (/uber|ola|rapido|petrol|fuel|shell|metro|toll|indian oil|bpcl|hpcl|cab|auto|transport/i.test(lowerTitle)) {
    category = 'Transport';
  } else if (/electricity|water|broadband|airtel|jio|vi|recharge|bill|gas|bescom|tneb|cesc/i.test(lowerTitle)) {
    category = 'Bills & Utilities';
  } else if (/netflix|spotify|prime|pvr|inox|movie|cinema|game|steam/i.test(lowerTitle)) {
    category = 'Entertainment';
  } else if (/salary|stipend|payroll|employer/i.test(lowerTitle)) {
    category = 'Salary';
  } else if (/pharmacy|apollo|hospital|doctor|clinic|medical|health|1mg|practo/i.test(lowerTitle)) {
    category = 'Health';
  } else if (/zerodha|groww|mutual fund|sip|stock|investment|lic|insurance/i.test(lowerTitle)) {
    category = 'Investment';
  }

  return {
    id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    originalText: text,
    type,
    amount,
    title,
    category,
    date: dateStr,
    referenceNo,
    selected: true,
    bankName,
  };
}

/**
 * Sample bank SMS messages for testing/demonstration in web or sandbox environment.
 */
export const SAMPLE_BANK_SMS_MESSAGES = [
  'Sent Rs. 450.00 from HDFC Bank A/c xx1234 to SWIGGY on 05-Aug-26. Ref: 42193181',
  'Rs 1,200.00 debited from A/C X7890 at AMAZON INDIA on 04/08/2026. Avail Bal: Rs 15,400.',
  'Your A/C XXX1234 Credited by Rs 25,000.00 on 01-08-2026 by SALARY CREDIT.',
  'INR 350.00 debited for Uber trip on 06-Aug-2026 via UPI',
  'Paid Rs. 120 to Chai Point on 03-08-2026 via Google Pay',
  'Your a/c no. XX9012 is debited for Rs. 890.00 on 02Aug26 and credited to ZOMATO. (UPI Ref no 321890).',
  'Dear SBI User, A/c 4321 debited by Rs 249.00 on 01Aug26 transfer to Netflix. Ref 890123',
  'INR 5,000.00 credited to account 4321 on 02-08-2026 - Refund from Flipkart.',
];
