// src/sleep.ts
var sleep_default = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

// src/hashObject.ts
import hash from "object-hash";
function hashObject_default(object) {
  return hash(object);
}

// src/generateId.ts
import crypto from "crypto";
var UNMISTAKABLE_CHARS = "23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghjkmnopqrstuvwxyz";
var hexString = function(digits) {
  var numBytes = Math.ceil(digits / 2);
  var bytes;
  try {
    bytes = crypto.randomBytes(numBytes);
  } catch (e) {
    bytes = crypto.pseudoRandomBytes(numBytes);
  }
  var result = bytes.toString("hex");
  return result.substring(0, digits);
};
var fraction = function() {
  var numerator = parseInt(hexString(8), 16);
  return numerator * 23283064365386963e-26;
};
var choice = function(arrayOrString) {
  var index = Math.floor(fraction() * arrayOrString.length);
  if (typeof arrayOrString === "string") return arrayOrString.substr(index, 1);
  else return arrayOrString[index];
};
var randomString = function(charsCount, alphabet) {
  var digits = [];
  for (var i = 0; i < charsCount; i++) {
    digits[i] = choice(alphabet);
  }
  return digits.join("");
};
function generateId(charsCount, chars = UNMISTAKABLE_CHARS) {
  if (!charsCount) {
    charsCount = 17;
  }
  return randomString(charsCount, chars);
}

// src/createMap.ts
function createMap(array, key = "_id") {
  const map = {};
  for (const item of array) {
    map[item[key]] = item;
  }
  return map;
}

// src/createMapArray.ts
function createMapArray(array, key = "_id") {
  const map = {};
  for (const item of array) {
    map[item[key]] = map[item[key]] || [];
    map[item[key]].push(item);
  }
  return map;
}

// src/Errors/OrionError.ts
var OrionError = class extends Error {
  isOrionError = true;
  isUserError;
  isPermissionsError;
  code;
  extra;
  /**
   * Returns a standardized representation of the error information.
   * @returns An object containing error details in a consistent format
   */
  getInfo;
};

// src/Errors/PermissionsError.ts
var PermissionsError = class extends OrionError {
  /**
   * Creates a new PermissionsError instance.
   * 
   * @param permissionErrorType - Identifies the specific permission that was violated
   *                              (e.g., 'read', 'write', 'admin')
   * @param extra - Additional error context or metadata. Can include a custom message
   *                via the message property.
   * 
   * @example
   * // Basic usage
   * throw new PermissionsError('delete_document')
   * 
   * @example
   * // With custom message
   * throw new PermissionsError('access_admin', { message: 'Admin access required' })
   * 
   * @example
   * // With additional context
   * throw new PermissionsError('edit_user', { 
   *   userId: 'user123',
   *   requiredRole: 'admin'
   * })
   */
  constructor(permissionErrorType, extra = {}) {
    const message = extra.message || `Client is not allowed to perform this action [${permissionErrorType}]`;
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.isOrionError = true;
    this.isPermissionsError = true;
    this.code = "PermissionsError";
    this.extra = extra;
    this.getInfo = () => {
      return {
        ...extra,
        error: "PermissionsError",
        message,
        type: permissionErrorType
      };
    };
  }
};

// src/Errors/UserError.ts
var UserError = class extends OrionError {
  /**
   * Creates a new UserError instance.
   * 
   * @param code - Error code identifier. If only one parameter is provided,
   *               this will be used as the message and code will default to 'error'.
   * @param message - Human-readable error message. Optional if code is provided.
   * @param extra - Additional error context or metadata.
   * 
   * @example
   * // Basic usage
   * throw new UserError('invalid_input', 'The provided email is invalid')
   * 
   * @example
   * // Using only a message (code will be 'error')
   * throw new UserError('Input validation failed')
   * 
   * @example
   * // With extra metadata
   * throw new UserError('rate_limit', 'Too many requests', { maxRequests: 100 })
   */
  constructor(code, message, extra) {
    if (!message && code) {
      message = code;
      code = "error";
    }
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.isOrionError = true;
    this.isUserError = true;
    this.code = code;
    this.extra = extra;
    this.getInfo = () => {
      return {
        error: code,
        message,
        extra
      };
    };
  }
};

// src/Errors/index.ts
function isOrionError(error) {
  return Boolean(error && typeof error === "object" && error.isOrionError === true);
}
function isUserError(error) {
  return Boolean(
    error && typeof error === "object" && error.isOrionError === true && error.isUserError === true
  );
}
function isPermissionsError(error) {
  return Boolean(
    error && typeof error === "object" && error.isOrionError === true && error.isPermissionsError === true
  );
}

// src/composeMiddlewares.ts
function composeMiddlewares(middleware) {
  if (!Array.isArray(middleware)) throw new TypeError("Middleware stack must be an array!");
  for (const fn of middleware) {
    if (typeof fn !== "function") throw new TypeError("Middleware must be composed of functions!");
  }
  return function(context, next) {
    let index = -1;
    return dispatch(0);
    function dispatch(i) {
      if (i <= index) return Promise.reject(new Error("next() called multiple times"));
      index = i;
      let fn = middleware[i];
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve();
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
}

// src/retries.ts
function executeWithRetries(fn, retries, timeout) {
  return new Promise((resolve, reject) => {
    const retry = async (retries2) => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        if (retries2 > 0) {
          setTimeout(() => retry(retries2 - 1), timeout);
        } else {
          reject(error);
        }
      }
    };
    retry(retries);
  });
}

// ../../node_modules/uuid/dist/esm-node/rng.js
import crypto2 from "crypto";
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    crypto2.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// ../../node_modules/uuid/dist/esm-node/regex.js
var regex_default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

// ../../node_modules/uuid/dist/esm-node/validate.js
function validate(uuid) {
  return typeof uuid === "string" && regex_default.test(uuid);
}
var validate_default = validate;

// ../../node_modules/uuid/dist/esm-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).substr(1));
}
function stringify(arr, offset = 0) {
  const uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
  if (!validate_default(uuid)) {
    throw TypeError("Stringified UUID is invalid");
  }
  return uuid;
}
var stringify_default = stringify;

// ../../node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return stringify_default(rnds);
}
var v4_default = v4;

// src/generateUUID.ts
function generateUUID() {
  return v4_default();
}
function generateUUIDWithPrefix(prefix) {
  return `${prefix}-${generateUUID()}`;
}

// src/normalize.ts
function removeAccentsOnly(text) {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function removeAccentsAndTrim(text) {
  if (!text) return "";
  return removeAccentsOnly(text).trim();
}
function normalizeForSearch(text) {
  if (!text) return "";
  return removeAccentsAndTrim(text).toLowerCase();
}
function normalizeForCompactSearch(text) {
  if (!text) return "";
  return normalizeForSearch(text).replace(/\s/g, "");
}
function normalizeForSearchToken(text) {
  if (!text) return "";
  return normalizeForSearch(text).replace(/[^0-9a-z]/gi, " ");
}
function normalizeForFileKey(text) {
  if (!text) return "";
  return removeAccentsOnly(text).replace(/[^a-zA-Z0-9-._]/g, "-").replace(/-+/g, "-").trim().replace(/^-+|-+$/g, "");
}

// src/searchTokens.ts
function getSearchTokens(text, meta) {
  const stringArray = Array.isArray(text) ? text : [text];
  const tokens = stringArray.filter(Boolean).map((text2) => String(text2)).flatMap((word) => {
    return normalizeForSearchToken(word).split(" ").filter(Boolean);
  });
  if (meta) {
    for (const key in meta) {
      tokens.push(`_${key}:${meta[key]}`);
    }
  }
  return tokens;
}
function getSearchQueryForTokens(params = {}, _options = {}) {
  const searchTokens = [];
  if (params.filter) {
    const filterTokens = getSearchTokens(params.filter).map((token) => new RegExp(`^${token}`));
    searchTokens.push(...filterTokens);
  }
  for (const key in params) {
    if (key === "filter") continue;
    if (!params[key]) continue;
    searchTokens.push(`_${key}:${params[key]}`);
  }
  return { $all: searchTokens };
}

// src/shortenMongoId.ts
function lastOfString(string, last) {
  return string.substring(string.length - last, string.length);
}
function shortenMongoId(string) {
  return lastOfString(string, 5).toUpperCase();
}
export {
  OrionError,
  PermissionsError,
  UserError,
  composeMiddlewares,
  createMap,
  createMapArray,
  executeWithRetries,
  generateId,
  generateUUID,
  generateUUIDWithPrefix,
  getSearchQueryForTokens,
  getSearchTokens,
  hashObject_default as hashObject,
  isOrionError,
  isPermissionsError,
  isUserError,
  normalizeForCompactSearch,
  normalizeForFileKey,
  normalizeForSearch,
  normalizeForSearchToken,
  removeAccentsAndTrim,
  removeAccentsOnly,
  shortenMongoId,
  sleep_default as sleep
};
//# sourceMappingURL=index.js.map