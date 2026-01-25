type LogArgs = unknown[];

const isBrowser = typeof window !== 'undefined';
const isDev = (() => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return Boolean((import.meta as any).env.DEV);
    }
  } catch {
    // ignore
  }

  if (typeof process !== 'undefined') {
    return process.env?.NODE_ENV !== 'production';
  }

  return true;
})();

const shouldLog = !isBrowser || isDev;

export const logger = {
  debug: (...args: LogArgs) => {
    if (shouldLog) console.log(...args);
  },
  info: (...args: LogArgs) => {
    if (shouldLog) console.info(...args);
  },
  warn: (...args: LogArgs) => {
    if (shouldLog) console.warn(...args);
  }
};
