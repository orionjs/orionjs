var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// ../../node_modules/object-hash/index.js
var require_object_hash = __commonJS((exports2, module2) => {
  var crypto = require("crypto");
  exports2 = module2.exports = objectHash;
  function objectHash(object, options) {
    options = applyDefaults(object, options);
    return hash(object, options);
  }
  exports2.sha1 = function(object) {
    return objectHash(object);
  };
  exports2.keys = function(object) {
    return objectHash(object, { excludeValues: true, algorithm: "sha1", encoding: "hex" });
  };
  exports2.MD5 = function(object) {
    return objectHash(object, { algorithm: "md5", encoding: "hex" });
  };
  exports2.keysMD5 = function(object) {
    return objectHash(object, { algorithm: "md5", encoding: "hex", excludeValues: true });
  };
  var hashes = crypto.getHashes ? crypto.getHashes().slice() : ["sha1", "md5"];
  hashes.push("passthrough");
  var encodings = ["buffer", "hex", "binary", "base64"];
  function applyDefaults(object, sourceOptions) {
    sourceOptions = sourceOptions || {};
    var options = {};
    options.algorithm = sourceOptions.algorithm || "sha1";
    options.encoding = sourceOptions.encoding || "hex";
    options.excludeValues = sourceOptions.excludeValues ? true : false;
    options.algorithm = options.algorithm.toLowerCase();
    options.encoding = options.encoding.toLowerCase();
    options.ignoreUnknown = sourceOptions.ignoreUnknown !== true ? false : true;
    options.respectType = sourceOptions.respectType === false ? false : true;
    options.respectFunctionNames = sourceOptions.respectFunctionNames === false ? false : true;
    options.respectFunctionProperties = sourceOptions.respectFunctionProperties === false ? false : true;
    options.unorderedArrays = sourceOptions.unorderedArrays !== true ? false : true;
    options.unorderedSets = sourceOptions.unorderedSets === false ? false : true;
    options.unorderedObjects = sourceOptions.unorderedObjects === false ? false : true;
    options.replacer = sourceOptions.replacer || undefined;
    options.excludeKeys = sourceOptions.excludeKeys || undefined;
    if (typeof object === "undefined") {
      throw new Error("Object argument required.");
    }
    for (var i = 0;i < hashes.length; ++i) {
      if (hashes[i].toLowerCase() === options.algorithm.toLowerCase()) {
        options.algorithm = hashes[i];
      }
    }
    if (hashes.indexOf(options.algorithm) === -1) {
      throw new Error('Algorithm "' + options.algorithm + '"  not supported. ' + "supported values: " + hashes.join(", "));
    }
    if (encodings.indexOf(options.encoding) === -1 && options.algorithm !== "passthrough") {
      throw new Error('Encoding "' + options.encoding + '"  not supported. ' + "supported values: " + encodings.join(", "));
    }
    return options;
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    var exp = /^function\s+\w*\s*\(\s*\)\s*{\s+\[native code\]\s+}$/i;
    return exp.exec(Function.prototype.toString.call(f)) != null;
  }
  function hash(object, options) {
    var hashingStream;
    if (options.algorithm !== "passthrough") {
      hashingStream = crypto.createHash(options.algorithm);
    } else {
      hashingStream = new PassThrough;
    }
    if (typeof hashingStream.write === "undefined") {
      hashingStream.write = hashingStream.update;
      hashingStream.end = hashingStream.update;
    }
    var hasher = typeHasher(options, hashingStream);
    hasher.dispatch(object);
    if (!hashingStream.update) {
      hashingStream.end("");
    }
    if (hashingStream.digest) {
      return hashingStream.digest(options.encoding === "buffer" ? undefined : options.encoding);
    }
    var buf = hashingStream.read();
    if (options.encoding === "buffer") {
      return buf;
    }
    return buf.toString(options.encoding);
  }
  exports2.writeToStream = function(object, options, stream) {
    if (typeof stream === "undefined") {
      stream = options;
      options = {};
    }
    options = applyDefaults(object, options);
    return typeHasher(options, stream).dispatch(object);
  };
  function typeHasher(options, writeTo, context) {
    context = context || [];
    var write = function(str) {
      if (writeTo.update) {
        return writeTo.update(str, "utf8");
      } else {
        return writeTo.write(str, "utf8");
      }
    };
    return {
      dispatch: function(value) {
        if (options.replacer) {
          value = options.replacer(value);
        }
        var type = typeof value;
        if (value === null) {
          type = "null";
        }
        return this["_" + type](value);
      },
      _object: function(object) {
        var pattern = /\[object (.*)\]/i;
        var objString = Object.prototype.toString.call(object);
        var objType = pattern.exec(objString);
        if (!objType) {
          objType = "unknown:[" + objString + "]";
        } else {
          objType = objType[1];
        }
        objType = objType.toLowerCase();
        var objectNumber = null;
        if ((objectNumber = context.indexOf(object)) >= 0) {
          return this.dispatch("[CIRCULAR:" + objectNumber + "]");
        } else {
          context.push(object);
        }
        if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
          write("buffer:");
          return write(object);
        }
        if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
          if (this["_" + objType]) {
            this["_" + objType](object);
          } else if (options.ignoreUnknown) {
            return write("[" + objType + "]");
          } else {
            throw new Error('Unknown object type "' + objType + '"');
          }
        } else {
          var keys = Object.keys(object);
          if (options.unorderedObjects) {
            keys = keys.sort();
          }
          if (options.respectType !== false && !isNativeFunction(object)) {
            keys.splice(0, 0, "prototype", "__proto__", "constructor");
          }
          if (options.excludeKeys) {
            keys = keys.filter(function(key) {
              return !options.excludeKeys(key);
            });
          }
          write("object:" + keys.length + ":");
          var self = this;
          return keys.forEach(function(key) {
            self.dispatch(key);
            write(":");
            if (!options.excludeValues) {
              self.dispatch(object[key]);
            }
            write(",");
          });
        }
      },
      _array: function(arr, unordered) {
        unordered = typeof unordered !== "undefined" ? unordered : options.unorderedArrays !== false;
        var self = this;
        write("array:" + arr.length + ":");
        if (!unordered || arr.length <= 1) {
          return arr.forEach(function(entry) {
            return self.dispatch(entry);
          });
        }
        var contextAdditions = [];
        var entries = arr.map(function(entry) {
          var strm = new PassThrough;
          var localContext = context.slice();
          var hasher = typeHasher(options, strm, localContext);
          hasher.dispatch(entry);
          contextAdditions = contextAdditions.concat(localContext.slice(context.length));
          return strm.read().toString();
        });
        context = context.concat(contextAdditions);
        entries.sort();
        return this._array(entries, false);
      },
      _date: function(date) {
        return write("date:" + date.toJSON());
      },
      _symbol: function(sym) {
        return write("symbol:" + sym.toString());
      },
      _error: function(err) {
        return write("error:" + err.toString());
      },
      _boolean: function(bool) {
        return write("bool:" + bool.toString());
      },
      _string: function(string) {
        write("string:" + string.length + ":");
        write(string.toString());
      },
      _function: function(fn) {
        write("fn:");
        if (isNativeFunction(fn)) {
          this.dispatch("[native]");
        } else {
          this.dispatch(fn.toString());
        }
        if (options.respectFunctionNames !== false) {
          this.dispatch("function-name:" + String(fn.name));
        }
        if (options.respectFunctionProperties) {
          this._object(fn);
        }
      },
      _number: function(number) {
        return write("number:" + number.toString());
      },
      _xml: function(xml) {
        return write("xml:" + xml.toString());
      },
      _null: function() {
        return write("Null");
      },
      _undefined: function() {
        return write("Undefined");
      },
      _regexp: function(regex) {
        return write("regex:" + regex.toString());
      },
      _uint8array: function(arr) {
        write("uint8array:");
        return this.dispatch(Array.prototype.slice.call(arr));
      },
      _uint8clampedarray: function(arr) {
        write("uint8clampedarray:");
        return this.dispatch(Array.prototype.slice.call(arr));
      },
      _int8array: function(arr) {
        write("uint8array:");
        return this.dispatch(Array.prototype.slice.call(arr));
      },
      _uint16array: function(arr) {
        write("uint16array:");
        return this.dispatch(Array.prototype.slice.call(arr));
      },
      _int16array: function(arr) {
        write("uint16array:");
        return this.dispatch(Array.prototype.slice.call(arr));
      },
      _uint32array: function(arr) {
        write("uint32array:");
        return this.dispatch(Array.prototype.slice.call(arr));
      },
      _int32array: function(arr) {
        write("uint32array:");
        return this.dispatch(Array.prototype.slice.call(arr));
      },
      _float32array: function(arr) {
        write("float32array:");
        return this.dispatch(Array.prototype.slice.call(arr));
      },
      _float64array: function(arr) {
        write("float64array:");
        return this.dispatch(Array.prototype.slice.call(arr));
      },
      _arraybuffer: function(arr) {
        write("arraybuffer:");
        return this.dispatch(new Uint8Array(arr));
      },
      _url: function(url) {
        return write("url:" + url.toString(), "utf8");
      },
      _map: function(map) {
        write("map:");
        var arr = Array.from(map);
        return this._array(arr, options.unorderedSets !== false);
      },
      _set: function(set) {
        write("set:");
        var arr = Array.from(set);
        return this._array(arr, options.unorderedSets !== false);
      },
      _file: function(file) {
        write("file:");
        return this.dispatch([file.name, file.size, file.type, file.lastModfied]);
      },
      _blob: function() {
        if (options.ignoreUnknown) {
          return write("[blob]");
        }
        throw Error(`Hashing Blob objects is currently not supported
` + `(see https://github.com/puleos/object-hash/issues/26)
` + `Use "options.replacer" or "options.ignoreUnknown"
`);
      },
      _domwindow: function() {
        return write("domwindow");
      },
      _bigint: function(number) {
        return write("bigint:" + number.toString());
      },
      _process: function() {
        return write("process");
      },
      _timer: function() {
        return write("timer");
      },
      _pipe: function() {
        return write("pipe");
      },
      _tcp: function() {
        return write("tcp");
      },
      _udp: function() {
        return write("udp");
      },
      _tty: function() {
        return write("tty");
      },
      _statwatcher: function() {
        return write("statwatcher");
      },
      _securecontext: function() {
        return write("securecontext");
      },
      _connection: function() {
        return write("connection");
      },
      _zlib: function() {
        return write("zlib");
      },
      _context: function() {
        return write("context");
      },
      _nodescript: function() {
        return write("nodescript");
      },
      _httpparser: function() {
        return write("httpparser");
      },
      _dataview: function() {
        return write("dataview");
      },
      _signal: function() {
        return write("signal");
      },
      _fsevent: function() {
        return write("fsevent");
      },
      _tlswrap: function() {
        return write("tlswrap");
      }
    };
  }
  function PassThrough() {
    return {
      buf: "",
      write: function(b) {
        this.buf += b;
      },
      end: function(b) {
        this.buf += b;
      },
      read: function() {
        return this.buf;
      }
    };
  }
});

// ../../node_modules/uuid/dist/rng.js
var require_rng = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  exports2.default = rng;
  var _crypto = _interopRequireDefault(require("crypto"));
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function rng() {
    return _crypto.default.randomBytes(16);
  }
});

// ../../node_modules/uuid/dist/bytesToUuid.js
var require_bytesToUuid = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  exports2.default = undefined;
  var byteToHex = [];
  for (i = 0;i < 256; ++i) {
    byteToHex[i] = (i + 256).toString(16).substr(1);
  }
  var i;
  function bytesToUuid(buf, offset) {
    var i2 = offset || 0;
    var bth = byteToHex;
    return [bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], "-", bth[buf[i2++]], bth[buf[i2++]], "-", bth[buf[i2++]], bth[buf[i2++]], "-", bth[buf[i2++]], bth[buf[i2++]], "-", bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]], bth[buf[i2++]]].join("");
  }
  var _default = bytesToUuid;
  exports2.default = _default;
});

// ../../node_modules/uuid/dist/v1.js
var require_v1 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  exports2.default = undefined;
  var _rng = _interopRequireDefault(require_rng());
  var _bytesToUuid = _interopRequireDefault(require_bytesToUuid());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  var _nodeId;
  var _clockseq;
  var _lastMSecs = 0;
  var _lastNSecs = 0;
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];
    options = options || {};
    var node = options.node || _nodeId;
    var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;
    if (node == null || clockseq == null) {
      var seedBytes = options.random || (options.rng || _rng.default)();
      if (node == null) {
        node = _nodeId = [seedBytes[0] | 1, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
      }
      if (clockseq == null) {
        clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
      }
    }
    var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();
    var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;
    var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
    if (dt < 0 && options.clockseq === undefined) {
      clockseq = clockseq + 1 & 16383;
    }
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
      nsecs = 0;
    }
    if (nsecs >= 1e4) {
      throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
    }
    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;
    msecs += 12219292800000;
    var tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
    b[i++] = tl >>> 24 & 255;
    b[i++] = tl >>> 16 & 255;
    b[i++] = tl >>> 8 & 255;
    b[i++] = tl & 255;
    var tmh = msecs / 4294967296 * 1e4 & 268435455;
    b[i++] = tmh >>> 8 & 255;
    b[i++] = tmh & 255;
    b[i++] = tmh >>> 24 & 15 | 16;
    b[i++] = tmh >>> 16 & 255;
    b[i++] = clockseq >>> 8 | 128;
    b[i++] = clockseq & 255;
    for (var n = 0;n < 6; ++n) {
      b[i + n] = node[n];
    }
    return buf ? buf : (0, _bytesToUuid.default)(b);
  }
  var _default = v1;
  exports2.default = _default;
});

// ../../node_modules/uuid/dist/v35.js
var require_v35 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  exports2.default = _default;
  exports2.URL = exports2.DNS = undefined;
  var _bytesToUuid = _interopRequireDefault(require_bytesToUuid());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function uuidToBytes(uuid) {
    var bytes = [];
    uuid.replace(/[a-fA-F0-9]{2}/g, function(hex) {
      bytes.push(parseInt(hex, 16));
    });
    return bytes;
  }
  function stringToBytes(str) {
    str = unescape(encodeURIComponent(str));
    var bytes = new Array(str.length);
    for (var i = 0;i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes;
  }
  var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  exports2.DNS = DNS;
  var URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  exports2.URL = URL;
  function _default(name, version, hashfunc) {
    var generateUUID = function(value, namespace, buf, offset) {
      var off = buf && offset || 0;
      if (typeof value == "string")
        value = stringToBytes(value);
      if (typeof namespace == "string")
        namespace = uuidToBytes(namespace);
      if (!Array.isArray(value))
        throw TypeError("value must be an array of bytes");
      if (!Array.isArray(namespace) || namespace.length !== 16)
        throw TypeError("namespace must be uuid string or an Array of 16 byte values");
      var bytes = hashfunc(namespace.concat(value));
      bytes[6] = bytes[6] & 15 | version;
      bytes[8] = bytes[8] & 63 | 128;
      if (buf) {
        for (var idx = 0;idx < 16; ++idx) {
          buf[off + idx] = bytes[idx];
        }
      }
      return buf || (0, _bytesToUuid.default)(bytes);
    };
    try {
      generateUUID.name = name;
    } catch (err) {
    }
    generateUUID.DNS = DNS;
    generateUUID.URL = URL;
    return generateUUID;
  }
});

// ../../node_modules/uuid/dist/md5.js
var require_md5 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  exports2.default = undefined;
  var _crypto = _interopRequireDefault(require("crypto"));
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function md5(bytes) {
    if (Array.isArray(bytes)) {
      bytes = Buffer.from(bytes);
    } else if (typeof bytes === "string") {
      bytes = Buffer.from(bytes, "utf8");
    }
    return _crypto.default.createHash("md5").update(bytes).digest();
  }
  var _default = md5;
  exports2.default = _default;
});

// ../../node_modules/uuid/dist/v3.js
var require_v3 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  exports2.default = undefined;
  var _v = _interopRequireDefault(require_v35());
  var _md = _interopRequireDefault(require_md5());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  var v3 = (0, _v.default)("v3", 48, _md.default);
  var _default = v3;
  exports2.default = _default;
});

// ../../node_modules/uuid/dist/v4.js
var require_v4 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  exports2.default = undefined;
  var _rng = _interopRequireDefault(require_rng());
  var _bytesToUuid = _interopRequireDefault(require_bytesToUuid());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function v4(options, buf, offset) {
    var i = buf && offset || 0;
    if (typeof options == "string") {
      buf = options === "binary" ? new Array(16) : null;
      options = null;
    }
    options = options || {};
    var rnds = options.random || (options.rng || _rng.default)();
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    if (buf) {
      for (var ii = 0;ii < 16; ++ii) {
        buf[i + ii] = rnds[ii];
      }
    }
    return buf || (0, _bytesToUuid.default)(rnds);
  }
  var _default = v4;
  exports2.default = _default;
});

// ../../node_modules/uuid/dist/sha1.js
var require_sha1 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  exports2.default = undefined;
  var _crypto = _interopRequireDefault(require("crypto"));
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function sha1(bytes) {
    if (Array.isArray(bytes)) {
      bytes = Buffer.from(bytes);
    } else if (typeof bytes === "string") {
      bytes = Buffer.from(bytes, "utf8");
    }
    return _crypto.default.createHash("sha1").update(bytes).digest();
  }
  var _default = sha1;
  exports2.default = _default;
});

// ../../node_modules/uuid/dist/v5.js
var require_v5 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  exports2.default = undefined;
  var _v = _interopRequireDefault(require_v35());
  var _sha = _interopRequireDefault(require_sha1());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  var v5 = (0, _v.default)("v5", 80, _sha.default);
  var _default = v5;
  exports2.default = _default;
});

// ../../node_modules/uuid/dist/index.js
var require_dist = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", {
    value: true
  });
  Object.defineProperty(exports2, "v1", {
    enumerable: true,
    get: function() {
      return _v.default;
    }
  });
  Object.defineProperty(exports2, "v3", {
    enumerable: true,
    get: function() {
      return _v2.default;
    }
  });
  Object.defineProperty(exports2, "v4", {
    enumerable: true,
    get: function() {
      return _v3.default;
    }
  });
  Object.defineProperty(exports2, "v5", {
    enumerable: true,
    get: function() {
      return _v4.default;
    }
  });
  var _v = _interopRequireDefault(require_v1());
  var _v2 = _interopRequireDefault(require_v3());
  var _v3 = _interopRequireDefault(require_v4());
  var _v4 = _interopRequireDefault(require_v5());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
});

// src/index.ts
var exports_src = {};
__export(exports_src, {
  sleep: () => sleep_default,
  shortenMongoId: () => shortenMongoId,
  removeAccentsOnly: () => removeAccentsOnly,
  removeAccentsAndTrim: () => removeAccentsAndTrim,
  normalizeForSearchToken: () => normalizeForSearchToken,
  normalizeForSearch: () => normalizeForSearch,
  normalizeForFileKey: () => normalizeForFileKey,
  normalizeForCompactSearch: () => normalizeForCompactSearch,
  isUserError: () => isUserError,
  isPermissionsError: () => isPermissionsError,
  isOrionError: () => isOrionError,
  hashObject: () => hashObject_default,
  getSearchTokens: () => getSearchTokens,
  getSearchQueryForTokens: () => getSearchQueryForTokens,
  generateUUIDWithPrefix: () => generateUUIDWithPrefix,
  generateUUID: () => generateUUID,
  generateId: () => generateId,
  executeWithRetries: () => executeWithRetries,
  createMapArray: () => createMapArray,
  createMap: () => createMap,
  composeMiddlewares: () => composeMiddlewares,
  UserError: () => UserError,
  PermissionsError: () => PermissionsError,
  OrionError: () => OrionError
});
module.exports = __toCommonJS(exports_src);

// src/sleep.ts
var sleep_default = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

// src/hashObject.ts
var import_object_hash = __toESM(require_object_hash());
function hashObject_default(object) {
  return import_object_hash.default(object);
}

// src/generateId.ts
var import_crypto = __toESM(require("crypto"));
var UNMISTAKABLE_CHARS = "23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghjkmnopqrstuvwxyz";
var hexString = function(digits) {
  var numBytes = Math.ceil(digits / 2);
  var bytes;
  try {
    bytes = import_crypto.default.randomBytes(numBytes);
  } catch (e) {
    bytes = import_crypto.default.pseudoRandomBytes(numBytes);
  }
  var result = bytes.toString("hex");
  return result.substring(0, digits);
};
var fraction = function() {
  var numerator = parseInt(hexString(8), 16);
  return numerator * 0.00000000023283064365386963;
};
var choice = function(arrayOrString) {
  var index = Math.floor(fraction() * arrayOrString.length);
  if (typeof arrayOrString === "string")
    return arrayOrString.substr(index, 1);
  else
    return arrayOrString[index];
};
var randomString = function(charsCount, alphabet) {
  var digits = [];
  for (var i = 0;i < charsCount; i++) {
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
class OrionError extends Error {
  isOrionError = true;
  isUserError;
  isPermissionsError;
  code;
  extra;
  getInfo;
}

// src/Errors/PermissionsError.ts
class PermissionsError extends OrionError {
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
}

// src/Errors/UserError.ts
class UserError extends OrionError {
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
}

// src/Errors/index.ts
function isOrionError(error) {
  return Boolean(error && typeof error === "object" && error.isOrionError === true);
}
function isUserError(error) {
  return Boolean(error && typeof error === "object" && error.isOrionError === true && error.isUserError === true);
}
function isPermissionsError(error) {
  return Boolean(error && typeof error === "object" && error.isOrionError === true && error.isPermissionsError === true);
}

// src/composeMiddlewares.ts
function composeMiddlewares(middleware) {
  if (!Array.isArray(middleware))
    throw new TypeError("Middleware stack must be an array!");
  for (const fn of middleware) {
    if (typeof fn !== "function")
      throw new TypeError("Middleware must be composed of functions!");
  }
  return function(context, next) {
    let index = -1;
    return dispatch(0);
    function dispatch(i) {
      if (i <= index)
        return Promise.reject(new Error("next() called multiple times"));
      index = i;
      let fn = middleware[i];
      if (i === middleware.length)
        fn = next;
      if (!fn)
        return Promise.resolve();
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
// ../../node_modules/uuid/wrapper.mjs
var import_dist = __toESM(require_dist());
var v1 = import_dist.default.v1;
var v3 = import_dist.default.v3;
var v4 = import_dist.default.v4;
var v5 = import_dist.default.v5;

// src/generateUUID.ts
function generateUUID() {
  return v4();
}
function generateUUIDWithPrefix(prefix) {
  return `${prefix}-${generateUUID()}`;
}
// src/normalize.ts
function removeAccentsOnly(text) {
  if (!text)
    return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function removeAccentsAndTrim(text) {
  if (!text)
    return "";
  return removeAccentsOnly(text).trim();
}
function normalizeForSearch(text) {
  if (!text)
    return "";
  return removeAccentsAndTrim(text).toLowerCase();
}
function normalizeForCompactSearch(text) {
  if (!text)
    return "";
  return normalizeForSearch(text).replace(/\s/g, "");
}
function normalizeForSearchToken(text) {
  if (!text)
    return "";
  return normalizeForSearch(text).replace(/[^0-9a-z]/gi, " ");
}
function normalizeForFileKey(text) {
  if (!text)
    return "";
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
    if (key === "filter")
      continue;
    if (!params[key])
      continue;
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
