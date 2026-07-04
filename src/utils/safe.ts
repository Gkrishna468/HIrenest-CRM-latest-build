/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const safeArray = <T = any>(val: any): T[] =>
  Array.isArray(val) ? val : [];

export const safeString = (val: any): string =>
  typeof val === 'string' ? val : (val ? String(val) : '');

export const safeNumber = (val: any): number => {
  const n = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(n) ? 0 : n;
};

export const safeObject = (val: any): Record<string, any> =>
  val && typeof val === 'object' ? val : {};

export const safeDate = (val: any): string => {
  if (!val) return '';
  try {
    const date = new Date(val);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  } catch {
    return '';
  }
};

export const safeISOString = (val: any): string => {
  if (!val) return new Date().toISOString();
  // Handle Firestore Timestamp
  if (val && typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  // Handle Timestamp representation as object with seconds/nanoseconds
  if (val && typeof val === 'object' && ('seconds' in val || '_seconds' in val)) {
    try {
      const s = val.seconds ?? val._seconds ?? 0;
      const n = val.nanoseconds ?? val._nanoseconds ?? 0;
      return new Date(s * 1000 + n / 1000000).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

export const safeDateShort = (val: any): string => {
  if (!val) return '';
  try {
    const date = new Date(val);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export const safeJSONParse = (str: string, fallback: any = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

export const safeReplace = (str: string, search: string | RegExp, replace: string): string =>
  safeString(str).replace(search, replace);

export const safeSkills = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

export const safeBudget = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    const amount = val.amount ?? '';
    const currency = val.currency ?? '';
    const period = val.period ?? '';
    const currencyStr = currency ? String(currency) : '';
    const amountStr = amount !== undefined && amount !== null ? String(amount) : '';
    const periodStr = period ? String(period) : '';
    
    let result = '';
    if (currencyStr && amountStr) {
      result = `${currencyStr}${amountStr}`;
    } else {
      result = amountStr || currencyStr;
    }
    if (periodStr) {
      result = `${result} ${periodStr}`;
    }
    return result.trim();
  }
  return String(val);
};

export async function retry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    return retry(fn, retries - 1);
  }
}
