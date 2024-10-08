(() => {
  // node_modules/@firebase/util/dist/index.esm2017.js
  var stringToByteArray$1 = function(str) {
    const out = [];
    let p = 0;
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) {
        out[p++] = c;
      } else if (c < 2048) {
        out[p++] = c >> 6 | 192;
        out[p++] = c & 63 | 128;
      } else if ((c & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
        c = 65536 + ((c & 1023) << 10) + (str.charCodeAt(++i) & 1023);
        out[p++] = c >> 18 | 240;
        out[p++] = c >> 12 & 63 | 128;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      } else {
        out[p++] = c >> 12 | 224;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      }
    }
    return out;
  };
  var byteArrayToString = function(bytes) {
    const out = [];
    let pos = 0, c = 0;
    while (pos < bytes.length) {
      const c1 = bytes[pos++];
      if (c1 < 128) {
        out[c++] = String.fromCharCode(c1);
      } else if (c1 > 191 && c1 < 224) {
        const c2 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else if (c1 > 239 && c1 < 365) {
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        const c4 = bytes[pos++];
        const u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 65536;
        out[c++] = String.fromCharCode(55296 + (u >> 10));
        out[c++] = String.fromCharCode(56320 + (u & 1023));
      } else {
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
      }
    }
    return out.join("");
  };
  var base64 = {
    /**
     * Maps bytes to characters.
     */
    byteToCharMap_: null,
    /**
     * Maps characters to bytes.
     */
    charToByteMap_: null,
    /**
     * Maps bytes to websafe characters.
     * @private
     */
    byteToCharMapWebSafe_: null,
    /**
     * Maps websafe characters to bytes.
     * @private
     */
    charToByteMapWebSafe_: null,
    /**
     * Our default alphabet, shared between
     * ENCODED_VALS and ENCODED_VALS_WEBSAFE
     */
    ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    /**
     * Our default alphabet. Value 64 (=) is special; it means "nothing."
     */
    get ENCODED_VALS() {
      return this.ENCODED_VALS_BASE + "+/=";
    },
    /**
     * Our websafe alphabet.
     */
    get ENCODED_VALS_WEBSAFE() {
      return this.ENCODED_VALS_BASE + "-_.";
    },
    /**
     * Whether this browser supports the atob and btoa functions. This extension
     * started at Mozilla but is now implemented by many browsers. We use the
     * ASSUME_* variables to avoid pulling in the full useragent detection library
     * but still allowing the standard per-browser compilations.
     *
     */
    HAS_NATIVE_SUPPORT: typeof atob === "function",
    /**
     * Base64-encode an array of bytes.
     *
     * @param input An array of bytes (numbers with
     *     value in [0, 255]) to encode.
     * @param webSafe Boolean indicating we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeByteArray(input, webSafe) {
      if (!Array.isArray(input)) {
        throw Error("encodeByteArray takes an array as a parameter");
      }
      this.init_();
      const byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
      const output = [];
      for (let i = 0; i < input.length; i += 3) {
        const byte1 = input[i];
        const haveByte2 = i + 1 < input.length;
        const byte2 = haveByte2 ? input[i + 1] : 0;
        const haveByte3 = i + 2 < input.length;
        const byte3 = haveByte3 ? input[i + 2] : 0;
        const outByte1 = byte1 >> 2;
        const outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
        let outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
        let outByte4 = byte3 & 63;
        if (!haveByte3) {
          outByte4 = 64;
          if (!haveByte2) {
            outByte3 = 64;
          }
        }
        output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
      }
      return output.join("");
    },
    /**
     * Base64-encode a string.
     *
     * @param input A string to encode.
     * @param webSafe If true, we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeString(input, webSafe) {
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return btoa(input);
      }
      return this.encodeByteArray(stringToByteArray$1(input), webSafe);
    },
    /**
     * Base64-decode a string.
     *
     * @param input to decode.
     * @param webSafe True if we should use the
     *     alternative alphabet.
     * @return string representing the decoded value.
     */
    decodeString(input, webSafe) {
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return atob(input);
      }
      return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
    },
    /**
     * Base64-decode a string.
     *
     * In base-64 decoding, groups of four characters are converted into three
     * bytes.  If the encoder did not apply padding, the input length may not
     * be a multiple of 4.
     *
     * In this case, the last group will have fewer than 4 characters, and
     * padding will be inferred.  If the group has one or two characters, it decodes
     * to one byte.  If the group has three characters, it decodes to two bytes.
     *
     * @param input Input to decode.
     * @param webSafe True if we should use the web-safe alphabet.
     * @return bytes representing the decoded value.
     */
    decodeStringToByteArray(input, webSafe) {
      this.init_();
      const charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
      const output = [];
      for (let i = 0; i < input.length; ) {
        const byte1 = charToByteMap[input.charAt(i++)];
        const haveByte2 = i < input.length;
        const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
        ++i;
        const haveByte3 = i < input.length;
        const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        const haveByte4 = i < input.length;
        const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
          throw new DecodeBase64StringError();
        }
        const outByte1 = byte1 << 2 | byte2 >> 4;
        output.push(outByte1);
        if (byte3 !== 64) {
          const outByte2 = byte2 << 4 & 240 | byte3 >> 2;
          output.push(outByte2);
          if (byte4 !== 64) {
            const outByte3 = byte3 << 6 & 192 | byte4;
            output.push(outByte3);
          }
        }
      }
      return output;
    },
    /**
     * Lazy static initialization function. Called before
     * accessing any of the static map variables.
     * @private
     */
    init_() {
      if (!this.byteToCharMap_) {
        this.byteToCharMap_ = {};
        this.charToByteMap_ = {};
        this.byteToCharMapWebSafe_ = {};
        this.charToByteMapWebSafe_ = {};
        for (let i = 0; i < this.ENCODED_VALS.length; i++) {
          this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
          this.charToByteMap_[this.byteToCharMap_[i]] = i;
          this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
          this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
          if (i >= this.ENCODED_VALS_BASE.length) {
            this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
            this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
          }
        }
      }
    }
  };
  var DecodeBase64StringError = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "DecodeBase64StringError";
    }
  };
  var base64Encode = function(str) {
    const utf8Bytes = stringToByteArray$1(str);
    return base64.encodeByteArray(utf8Bytes, true);
  };
  var base64urlEncodeWithoutPadding = function(str) {
    return base64Encode(str).replace(/\./g, "");
  };
  var base64Decode = function(str) {
    try {
      return base64.decodeString(str, true);
    } catch (e) {
      console.error("base64Decode failed: ", e);
    }
    return null;
  };
  function getGlobal() {
    if (typeof self !== "undefined") {
      return self;
    }
    if (typeof window !== "undefined") {
      return window;
    }
    if (typeof global !== "undefined") {
      return global;
    }
    throw new Error("Unable to locate global object.");
  }
  var getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
  var getDefaultsFromEnvVariable = () => {
    if (typeof process === "undefined" || typeof process.env === "undefined") {
      return;
    }
    const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
    if (defaultsJsonString) {
      return JSON.parse(defaultsJsonString);
    }
  };
  var getDefaultsFromCookie = () => {
    if (typeof document === "undefined") {
      return;
    }
    let match;
    try {
      match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
    } catch (e) {
      return;
    }
    const decoded = match && base64Decode(match[1]);
    return decoded && JSON.parse(decoded);
  };
  var getDefaults = () => {
    try {
      return getDefaultsFromGlobal() || getDefaultsFromEnvVariable() || getDefaultsFromCookie();
    } catch (e) {
      console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
      return;
    }
  };
  var getDefaultEmulatorHost = (productName) => {
    var _a, _b;
    return (_b = (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.emulatorHosts) === null || _b === void 0 ? void 0 : _b[productName];
  };
  var getDefaultEmulatorHostnameAndPort = (productName) => {
    const host = getDefaultEmulatorHost(productName);
    if (!host) {
      return void 0;
    }
    const separatorIndex = host.lastIndexOf(":");
    if (separatorIndex <= 0 || separatorIndex + 1 === host.length) {
      throw new Error(`Invalid host ${host} with no separate hostname and port!`);
    }
    const port = parseInt(host.substring(separatorIndex + 1), 10);
    if (host[0] === "[") {
      return [host.substring(1, separatorIndex - 1), port];
    } else {
      return [host.substring(0, separatorIndex), port];
    }
  };
  var getDefaultAppConfig = () => {
    var _a;
    return (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.config;
  };
  var Deferred = class {
    constructor() {
      this.reject = () => {
      };
      this.resolve = () => {
      };
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
    /**
     * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */
    wrapCallback(callback) {
      return (error, value) => {
        if (error) {
          this.reject(error);
        } else {
          this.resolve(value);
        }
        if (typeof callback === "function") {
          this.promise.catch(() => {
          });
          if (callback.length === 1) {
            callback(error);
          } else {
            callback(error, value);
          }
        }
      };
    }
  };
  function createMockUserToken(token, projectId) {
    if (token.uid) {
      throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');
    }
    const header = {
      alg: "none",
      type: "JWT"
    };
    const project = projectId || "demo-project";
    const iat = token.iat || 0;
    const sub = token.sub || token.user_id;
    if (!sub) {
      throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");
    }
    const payload = Object.assign({
      // Set all required fields to decent defaults
      iss: `https://securetoken.google.com/${project}`,
      aud: project,
      iat,
      exp: iat + 3600,
      auth_time: iat,
      sub,
      user_id: sub,
      firebase: {
        sign_in_provider: "custom",
        identities: {}
      }
    }, token);
    const signature = "";
    return [
      base64urlEncodeWithoutPadding(JSON.stringify(header)),
      base64urlEncodeWithoutPadding(JSON.stringify(payload)),
      signature
    ].join(".");
  }
  function getUA() {
    if (typeof navigator !== "undefined" && typeof navigator["userAgent"] === "string") {
      return navigator["userAgent"];
    } else {
      return "";
    }
  }
  function isNode() {
    var _a;
    const forceEnvironment = (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.forceEnvironment;
    if (forceEnvironment === "node") {
      return true;
    } else if (forceEnvironment === "browser") {
      return false;
    }
    try {
      return Object.prototype.toString.call(global.process) === "[object process]";
    } catch (e) {
      return false;
    }
  }
  function isBrowserExtension() {
    const runtime = typeof chrome === "object" ? chrome.runtime : typeof browser === "object" ? browser.runtime : void 0;
    return typeof runtime === "object" && runtime.id !== void 0;
  }
  function isSafari() {
    return !isNode() && !!navigator.userAgent && navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome");
  }
  function isIndexedDBAvailable() {
    try {
      return typeof indexedDB === "object";
    } catch (e) {
      return false;
    }
  }
  function validateIndexedDBOpenable() {
    return new Promise((resolve, reject) => {
      try {
        let preExist = true;
        const DB_CHECK_NAME = "validate-browser-context-for-indexeddb-analytics-module";
        const request = self.indexedDB.open(DB_CHECK_NAME);
        request.onsuccess = () => {
          request.result.close();
          if (!preExist) {
            self.indexedDB.deleteDatabase(DB_CHECK_NAME);
          }
          resolve(true);
        };
        request.onupgradeneeded = () => {
          preExist = false;
        };
        request.onerror = () => {
          var _a;
          reject(((_a = request.error) === null || _a === void 0 ? void 0 : _a.message) || "");
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  function areCookiesEnabled() {
    if (typeof navigator === "undefined" || !navigator.cookieEnabled) {
      return false;
    }
    return true;
  }
  var ERROR_NAME = "FirebaseError";
  var FirebaseError = class _FirebaseError extends Error {
    constructor(code, message, customData) {
      super(message);
      this.code = code;
      this.customData = customData;
      this.name = ERROR_NAME;
      Object.setPrototypeOf(this, _FirebaseError.prototype);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ErrorFactory.prototype.create);
      }
    }
  };
  var ErrorFactory = class {
    constructor(service, serviceName, errors) {
      this.service = service;
      this.serviceName = serviceName;
      this.errors = errors;
    }
    create(code, ...data) {
      const customData = data[0] || {};
      const fullCode = `${this.service}/${code}`;
      const template = this.errors[code];
      const message = template ? replaceTemplate(template, customData) : "Error";
      const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
      const error = new FirebaseError(fullCode, fullMessage, customData);
      return error;
    }
  };
  function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_, key) => {
      const value = data[key];
      return value != null ? String(value) : `<${key}?>`;
    });
  }
  var PATTERN = /\{\$([^}]+)}/g;
  function deepEqual(a, b2) {
    if (a === b2) {
      return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b2);
    for (const k of aKeys) {
      if (!bKeys.includes(k)) {
        return false;
      }
      const aProp = a[k];
      const bProp = b2[k];
      if (isObject(aProp) && isObject(bProp)) {
        if (!deepEqual(aProp, bProp)) {
          return false;
        }
      } else if (aProp !== bProp) {
        return false;
      }
    }
    for (const k of bKeys) {
      if (!aKeys.includes(k)) {
        return false;
      }
    }
    return true;
  }
  function isObject(thing) {
    return thing !== null && typeof thing === "object";
  }
  var DEFAULT_INTERVAL_MILLIS = 1e3;
  var DEFAULT_BACKOFF_FACTOR = 2;
  var MAX_VALUE_MILLIS = 4 * 60 * 60 * 1e3;
  var RANDOM_FACTOR = 0.5;
  function calculateBackoffMillis(backoffCount, intervalMillis = DEFAULT_INTERVAL_MILLIS, backoffFactor = DEFAULT_BACKOFF_FACTOR) {
    const currBaseValue = intervalMillis * Math.pow(backoffFactor, backoffCount);
    const randomWait = Math.round(
      // A fraction of the backoff value to add/subtract.
      // Deviation: changes multiplication order to improve readability.
      RANDOM_FACTOR * currBaseValue * // A random float (rounded to int by Math.round above) in the range [-1, 1]. Determines
      // if we add or subtract.
      (Math.random() - 0.5) * 2
    );
    return Math.min(MAX_VALUE_MILLIS, currBaseValue + randomWait);
  }
  function getModularInstance(service) {
    if (service && service._delegate) {
      return service._delegate;
    } else {
      return service;
    }
  }

  // node_modules/@firebase/component/dist/esm/index.esm2017.js
  var Component = class {
    /**
     *
     * @param name The public service name, e.g. app, auth, firestore, database
     * @param instanceFactory Service factory responsible for creating the public interface
     * @param type whether the service provided by the component is public or private
     */
    constructor(name5, instanceFactory, type) {
      this.name = name5;
      this.instanceFactory = instanceFactory;
      this.type = type;
      this.multipleInstances = false;
      this.serviceProps = {};
      this.instantiationMode = "LAZY";
      this.onInstanceCreated = null;
    }
    setInstantiationMode(mode) {
      this.instantiationMode = mode;
      return this;
    }
    setMultipleInstances(multipleInstances) {
      this.multipleInstances = multipleInstances;
      return this;
    }
    setServiceProps(props) {
      this.serviceProps = props;
      return this;
    }
    setInstanceCreatedCallback(callback) {
      this.onInstanceCreated = callback;
      return this;
    }
  };
  var DEFAULT_ENTRY_NAME = "[DEFAULT]";
  var Provider = class {
    constructor(name5, container) {
      this.name = name5;
      this.container = container;
      this.component = null;
      this.instances = /* @__PURE__ */ new Map();
      this.instancesDeferred = /* @__PURE__ */ new Map();
      this.instancesOptions = /* @__PURE__ */ new Map();
      this.onInitCallbacks = /* @__PURE__ */ new Map();
    }
    /**
     * @param identifier A provider can provide multiple instances of a service
     * if this.component.multipleInstances is true.
     */
    get(identifier) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      if (!this.instancesDeferred.has(normalizedIdentifier)) {
        const deferred = new Deferred();
        this.instancesDeferred.set(normalizedIdentifier, deferred);
        if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
          try {
            const instance = this.getOrInitializeService({
              instanceIdentifier: normalizedIdentifier
            });
            if (instance) {
              deferred.resolve(instance);
            }
          } catch (e) {
          }
        }
      }
      return this.instancesDeferred.get(normalizedIdentifier).promise;
    }
    getImmediate(options) {
      var _a;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(options === null || options === void 0 ? void 0 : options.identifier);
      const optional = (_a = options === null || options === void 0 ? void 0 : options.optional) !== null && _a !== void 0 ? _a : false;
      if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
        try {
          return this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
        } catch (e) {
          if (optional) {
            return null;
          } else {
            throw e;
          }
        }
      } else {
        if (optional) {
          return null;
        } else {
          throw Error(`Service ${this.name} is not available`);
        }
      }
    }
    getComponent() {
      return this.component;
    }
    setComponent(component) {
      if (component.name !== this.name) {
        throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
      }
      if (this.component) {
        throw Error(`Component for ${this.name} has already been provided`);
      }
      this.component = component;
      if (!this.shouldAutoInitialize()) {
        return;
      }
      if (isComponentEager(component)) {
        try {
          this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME });
        } catch (e) {
        }
      }
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        try {
          const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
          instanceDeferred.resolve(instance);
        } catch (e) {
        }
      }
    }
    clearInstance(identifier = DEFAULT_ENTRY_NAME) {
      this.instancesDeferred.delete(identifier);
      this.instancesOptions.delete(identifier);
      this.instances.delete(identifier);
    }
    // app.delete() will call this method on every provider to delete the services
    // TODO: should we mark the provider as deleted?
    async delete() {
      const services = Array.from(this.instances.values());
      await Promise.all([
        ...services.filter((service) => "INTERNAL" in service).map((service) => service.INTERNAL.delete()),
        ...services.filter((service) => "_delete" in service).map((service) => service._delete())
      ]);
    }
    isComponentSet() {
      return this.component != null;
    }
    isInitialized(identifier = DEFAULT_ENTRY_NAME) {
      return this.instances.has(identifier);
    }
    getOptions(identifier = DEFAULT_ENTRY_NAME) {
      return this.instancesOptions.get(identifier) || {};
    }
    initialize(opts = {}) {
      const { options = {} } = opts;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
      if (this.isInitialized(normalizedIdentifier)) {
        throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
      }
      if (!this.isComponentSet()) {
        throw Error(`Component ${this.name} has not been registered yet`);
      }
      const instance = this.getOrInitializeService({
        instanceIdentifier: normalizedIdentifier,
        options
      });
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        if (normalizedIdentifier === normalizedDeferredIdentifier) {
          instanceDeferred.resolve(instance);
        }
      }
      return instance;
    }
    /**
     *
     * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
     * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
     *
     * @param identifier An optional instance identifier
     * @returns a function to unregister the callback
     */
    onInit(callback, identifier) {
      var _a;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      const existingCallbacks = (_a = this.onInitCallbacks.get(normalizedIdentifier)) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new Set();
      existingCallbacks.add(callback);
      this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
      const existingInstance = this.instances.get(normalizedIdentifier);
      if (existingInstance) {
        callback(existingInstance, normalizedIdentifier);
      }
      return () => {
        existingCallbacks.delete(callback);
      };
    }
    /**
     * Invoke onInit callbacks synchronously
     * @param instance the service instance`
     */
    invokeOnInitCallbacks(instance, identifier) {
      const callbacks = this.onInitCallbacks.get(identifier);
      if (!callbacks) {
        return;
      }
      for (const callback of callbacks) {
        try {
          callback(instance, identifier);
        } catch (_a) {
        }
      }
    }
    getOrInitializeService({ instanceIdentifier, options = {} }) {
      let instance = this.instances.get(instanceIdentifier);
      if (!instance && this.component) {
        instance = this.component.instanceFactory(this.container, {
          instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
          options
        });
        this.instances.set(instanceIdentifier, instance);
        this.instancesOptions.set(instanceIdentifier, options);
        this.invokeOnInitCallbacks(instance, instanceIdentifier);
        if (this.component.onInstanceCreated) {
          try {
            this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
          } catch (_a) {
          }
        }
      }
      return instance || null;
    }
    normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME) {
      if (this.component) {
        return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
      } else {
        return identifier;
      }
    }
    shouldAutoInitialize() {
      return !!this.component && this.component.instantiationMode !== "EXPLICIT";
    }
  };
  function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME ? void 0 : identifier;
  }
  function isComponentEager(component) {
    return component.instantiationMode === "EAGER";
  }
  var ComponentContainer = class {
    constructor(name5) {
      this.name = name5;
      this.providers = /* @__PURE__ */ new Map();
    }
    /**
     *
     * @param component Component being added
     * @param overwrite When a component with the same name has already been registered,
     * if overwrite is true: overwrite the existing component with the new component and create a new
     * provider with the new component. It can be useful in tests where you want to use different mocks
     * for different tests.
     * if overwrite is false: throw an exception
     */
    addComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
      }
      provider.setComponent(component);
    }
    addOrOverwriteComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        this.providers.delete(component.name);
      }
      this.addComponent(component);
    }
    /**
     * getProvider provides a type safe interface where it can only be called with a field name
     * present in NameServiceMapping interface.
     *
     * Firebase SDKs providing services should extend NameServiceMapping interface to register
     * themselves.
     */
    getProvider(name5) {
      if (this.providers.has(name5)) {
        return this.providers.get(name5);
      }
      const provider = new Provider(name5, this);
      this.providers.set(name5, provider);
      return provider;
    }
    getProviders() {
      return Array.from(this.providers.values());
    }
  };

  // node_modules/@firebase/logger/dist/esm/index.esm2017.js
  var instances = [];
  var LogLevel;
  (function(LogLevel2) {
    LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
    LogLevel2[LogLevel2["VERBOSE"] = 1] = "VERBOSE";
    LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
    LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
    LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
    LogLevel2[LogLevel2["SILENT"] = 5] = "SILENT";
  })(LogLevel || (LogLevel = {}));
  var levelStringToEnum = {
    "debug": LogLevel.DEBUG,
    "verbose": LogLevel.VERBOSE,
    "info": LogLevel.INFO,
    "warn": LogLevel.WARN,
    "error": LogLevel.ERROR,
    "silent": LogLevel.SILENT
  };
  var defaultLogLevel = LogLevel.INFO;
  var ConsoleMethod = {
    [LogLevel.DEBUG]: "log",
    [LogLevel.VERBOSE]: "log",
    [LogLevel.INFO]: "info",
    [LogLevel.WARN]: "warn",
    [LogLevel.ERROR]: "error"
  };
  var defaultLogHandler = (instance, logType, ...args) => {
    if (logType < instance.logLevel) {
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const method = ConsoleMethod[logType];
    if (method) {
      console[method](`[${now}]  ${instance.name}:`, ...args);
    } else {
      throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
    }
  };
  var Logger = class {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    constructor(name5) {
      this.name = name5;
      this._logLevel = defaultLogLevel;
      this._logHandler = defaultLogHandler;
      this._userLogHandler = null;
      instances.push(this);
    }
    get logLevel() {
      return this._logLevel;
    }
    set logLevel(val) {
      if (!(val in LogLevel)) {
        throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
      }
      this._logLevel = val;
    }
    // Workaround for setter/getter having to be the same type.
    setLogLevel(val) {
      this._logLevel = typeof val === "string" ? levelStringToEnum[val] : val;
    }
    get logHandler() {
      return this._logHandler;
    }
    set logHandler(val) {
      if (typeof val !== "function") {
        throw new TypeError("Value assigned to `logHandler` must be a function");
      }
      this._logHandler = val;
    }
    get userLogHandler() {
      return this._userLogHandler;
    }
    set userLogHandler(val) {
      this._userLogHandler = val;
    }
    /**
     * The functions below are all based on the `console` interface
     */
    debug(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
      this._logHandler(this, LogLevel.DEBUG, ...args);
    }
    log(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.VERBOSE, ...args);
      this._logHandler(this, LogLevel.VERBOSE, ...args);
    }
    info(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
      this._logHandler(this, LogLevel.INFO, ...args);
    }
    warn(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
      this._logHandler(this, LogLevel.WARN, ...args);
    }
    error(...args) {
      this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
      this._logHandler(this, LogLevel.ERROR, ...args);
    }
  };

  // node_modules/idb/build/wrap-idb-value.js
  var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
  var idbProxyableTypes;
  var cursorAdvanceMethods;
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [
      IDBDatabase,
      IDBObjectStore,
      IDBIndex,
      IDBCursor,
      IDBTransaction
    ]);
  }
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [
      IDBCursor.prototype.advance,
      IDBCursor.prototype.continue,
      IDBCursor.prototype.continuePrimaryKey
    ]);
  }
  var cursorRequestMap = /* @__PURE__ */ new WeakMap();
  var transactionDoneMap = /* @__PURE__ */ new WeakMap();
  var transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
  var transformCache = /* @__PURE__ */ new WeakMap();
  var reverseTransformCache = /* @__PURE__ */ new WeakMap();
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener("success", success);
        request.removeEventListener("error", error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener("success", success);
      request.addEventListener("error", error);
    });
    promise.then((value) => {
      if (value instanceof IDBCursor) {
        cursorRequestMap.set(value, request);
      }
    }).catch(() => {
    });
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    if (transactionDoneMap.has(tx))
      return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener("complete", complete);
        tx.removeEventListener("error", error);
        tx.removeEventListener("abort", error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException("AbortError", "AbortError"));
        unlisten();
      };
      tx.addEventListener("complete", complete);
      tx.addEventListener("error", error);
      tx.addEventListener("abort", error);
    });
    transactionDoneMap.set(tx, done);
  }
  var idbProxyTraps = {
    get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        if (prop === "done")
          return transactionDoneMap.get(target);
        if (prop === "objectStoreNames") {
          return target.objectStoreNames || transactionStoreNamesMap.get(target);
        }
        if (prop === "store") {
          return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      }
      return wrap(target[prop]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
        return true;
      }
      return prop in target;
    }
  };
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
      return function(storeNames, ...args) {
        const tx = func.call(unwrap(this), storeNames, ...args);
        transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
        return wrap(tx);
      };
    }
    if (getCursorAdvanceMethods().includes(func)) {
      return function(...args) {
        func.apply(unwrap(this), args);
        return wrap(cursorRequestMap.get(this));
      };
    }
    return function(...args) {
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === "function")
      return wrapFunction(value);
    if (value instanceof IDBTransaction)
      cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
      return new Proxy(value, idbProxyTraps);
    return value;
  }
  function wrap(value) {
    if (value instanceof IDBRequest)
      return promisifyRequest(value);
    if (transformCache.has(value))
      return transformCache.get(value);
    const newValue = transformCachableValue(value);
    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  var unwrap = (value) => reverseTransformCache.get(value);

  // node_modules/idb/build/index.js
  function openDB(name5, version5, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name5, version5);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener("upgradeneeded", (event) => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event.newVersion,
        event
      ));
    }
    openPromise.then((db2) => {
      if (terminated)
        db2.addEventListener("close", () => terminated());
      if (blocking) {
        db2.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {
    });
    return openPromise;
  }
  var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
  var writeMethods = ["put", "add", "delete", "clear"];
  var cachedMethods = /* @__PURE__ */ new Map();
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
      return;
    }
    if (cachedMethods.get(prop))
      return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, "");
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
    ) {
      return;
    }
    const method = async function(storeName, ...args) {
      const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
      let target2 = tx.store;
      if (useIndex)
        target2 = target2.index(args.shift());
      return (await Promise.all([
        target2[targetFuncName](...args),
        isWrite && tx.done
      ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
  }));

  // node_modules/@firebase/app/dist/esm/index.esm2017.js
  var PlatformLoggerServiceImpl = class {
    constructor(container) {
      this.container = container;
    }
    // In initial implementation, this will be called by installations on
    // auth token refresh, and installations will send this string.
    getPlatformInfoString() {
      const providers = this.container.getProviders();
      return providers.map((provider) => {
        if (isVersionServiceProvider(provider)) {
          const service = provider.getImmediate();
          return `${service.library}/${service.version}`;
        } else {
          return null;
        }
      }).filter((logString) => logString).join(" ");
    }
  };
  function isVersionServiceProvider(provider) {
    const component = provider.getComponent();
    return (component === null || component === void 0 ? void 0 : component.type) === "VERSION";
  }
  var name$q = "@firebase/app";
  var version$1 = "0.10.12";
  var logger = new Logger("@firebase/app");
  var name$p = "@firebase/app-compat";
  var name$o = "@firebase/analytics-compat";
  var name$n = "@firebase/analytics";
  var name$m = "@firebase/app-check-compat";
  var name$l = "@firebase/app-check";
  var name$k = "@firebase/auth";
  var name$j = "@firebase/auth-compat";
  var name$i = "@firebase/database";
  var name$h = "@firebase/data-connect";
  var name$g = "@firebase/database-compat";
  var name$f = "@firebase/functions";
  var name$e = "@firebase/functions-compat";
  var name$d = "@firebase/installations";
  var name$c = "@firebase/installations-compat";
  var name$b = "@firebase/messaging";
  var name$a = "@firebase/messaging-compat";
  var name$9 = "@firebase/performance";
  var name$8 = "@firebase/performance-compat";
  var name$7 = "@firebase/remote-config";
  var name$6 = "@firebase/remote-config-compat";
  var name$5 = "@firebase/storage";
  var name$4 = "@firebase/storage-compat";
  var name$3 = "@firebase/firestore";
  var name$2 = "@firebase/vertexai-preview";
  var name$1 = "@firebase/firestore-compat";
  var name = "firebase";
  var version = "10.14.0";
  var DEFAULT_ENTRY_NAME2 = "[DEFAULT]";
  var PLATFORM_LOG_STRING = {
    [name$q]: "fire-core",
    [name$p]: "fire-core-compat",
    [name$n]: "fire-analytics",
    [name$o]: "fire-analytics-compat",
    [name$l]: "fire-app-check",
    [name$m]: "fire-app-check-compat",
    [name$k]: "fire-auth",
    [name$j]: "fire-auth-compat",
    [name$i]: "fire-rtdb",
    [name$h]: "fire-data-connect",
    [name$g]: "fire-rtdb-compat",
    [name$f]: "fire-fn",
    [name$e]: "fire-fn-compat",
    [name$d]: "fire-iid",
    [name$c]: "fire-iid-compat",
    [name$b]: "fire-fcm",
    [name$a]: "fire-fcm-compat",
    [name$9]: "fire-perf",
    [name$8]: "fire-perf-compat",
    [name$7]: "fire-rc",
    [name$6]: "fire-rc-compat",
    [name$5]: "fire-gcs",
    [name$4]: "fire-gcs-compat",
    [name$3]: "fire-fst",
    [name$1]: "fire-fst-compat",
    [name$2]: "fire-vertex",
    "fire-js": "fire-js",
    [name]: "fire-js-all"
  };
  var _apps = /* @__PURE__ */ new Map();
  var _serverApps = /* @__PURE__ */ new Map();
  var _components = /* @__PURE__ */ new Map();
  function _addComponent(app2, component) {
    try {
      app2.container.addComponent(component);
    } catch (e) {
      logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app2.name}`, e);
    }
  }
  function _registerComponent(component) {
    const componentName = component.name;
    if (_components.has(componentName)) {
      logger.debug(`There were multiple attempts to register component ${componentName}.`);
      return false;
    }
    _components.set(componentName, component);
    for (const app2 of _apps.values()) {
      _addComponent(app2, component);
    }
    for (const serverApp of _serverApps.values()) {
      _addComponent(serverApp, component);
    }
    return true;
  }
  function _getProvider(app2, name5) {
    const heartbeatController = app2.container.getProvider("heartbeat").getImmediate({ optional: true });
    if (heartbeatController) {
      void heartbeatController.triggerHeartbeat();
    }
    return app2.container.getProvider(name5);
  }
  var ERRORS = {
    [
      "no-app"
      /* AppError.NO_APP */
    ]: "No Firebase App '{$appName}' has been created - call initializeApp() first",
    [
      "bad-app-name"
      /* AppError.BAD_APP_NAME */
    ]: "Illegal App name: '{$appName}'",
    [
      "duplicate-app"
      /* AppError.DUPLICATE_APP */
    ]: "Firebase App named '{$appName}' already exists with different options or config",
    [
      "app-deleted"
      /* AppError.APP_DELETED */
    ]: "Firebase App named '{$appName}' already deleted",
    [
      "server-app-deleted"
      /* AppError.SERVER_APP_DELETED */
    ]: "Firebase Server App has been deleted",
    [
      "no-options"
      /* AppError.NO_OPTIONS */
    ]: "Need to provide options, when not being deployed to hosting via source.",
    [
      "invalid-app-argument"
      /* AppError.INVALID_APP_ARGUMENT */
    ]: "firebase.{$appName}() takes either no argument or a Firebase App instance.",
    [
      "invalid-log-argument"
      /* AppError.INVALID_LOG_ARGUMENT */
    ]: "First argument to `onLog` must be null or a function.",
    [
      "idb-open"
      /* AppError.IDB_OPEN */
    ]: "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-get"
      /* AppError.IDB_GET */
    ]: "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-set"
      /* AppError.IDB_WRITE */
    ]: "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "idb-delete"
      /* AppError.IDB_DELETE */
    ]: "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
    [
      "finalization-registry-not-supported"
      /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */
    ]: "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
    [
      "invalid-server-app-environment"
      /* AppError.INVALID_SERVER_APP_ENVIRONMENT */
    ]: "FirebaseServerApp is not for use in browser environments."
  };
  var ERROR_FACTORY = new ErrorFactory("app", "Firebase", ERRORS);
  var FirebaseAppImpl = class {
    constructor(options, config, container) {
      this._isDeleted = false;
      this._options = Object.assign({}, options);
      this._config = Object.assign({}, config);
      this._name = config.name;
      this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
      this._container = container;
      this.container.addComponent(new Component(
        "app",
        () => this,
        "PUBLIC"
        /* ComponentType.PUBLIC */
      ));
    }
    get automaticDataCollectionEnabled() {
      this.checkDestroyed();
      return this._automaticDataCollectionEnabled;
    }
    set automaticDataCollectionEnabled(val) {
      this.checkDestroyed();
      this._automaticDataCollectionEnabled = val;
    }
    get name() {
      this.checkDestroyed();
      return this._name;
    }
    get options() {
      this.checkDestroyed();
      return this._options;
    }
    get config() {
      this.checkDestroyed();
      return this._config;
    }
    get container() {
      return this._container;
    }
    get isDeleted() {
      return this._isDeleted;
    }
    set isDeleted(val) {
      this._isDeleted = val;
    }
    /**
     * This function will throw an Error if the App has already been deleted -
     * use before performing API actions on the App.
     */
    checkDestroyed() {
      if (this.isDeleted) {
        throw ERROR_FACTORY.create("app-deleted", { appName: this._name });
      }
    }
  };
  var SDK_VERSION = version;
  function initializeApp(_options, rawConfig = {}) {
    let options = _options;
    if (typeof rawConfig !== "object") {
      const name6 = rawConfig;
      rawConfig = { name: name6 };
    }
    const config = Object.assign({ name: DEFAULT_ENTRY_NAME2, automaticDataCollectionEnabled: false }, rawConfig);
    const name5 = config.name;
    if (typeof name5 !== "string" || !name5) {
      throw ERROR_FACTORY.create("bad-app-name", {
        appName: String(name5)
      });
    }
    options || (options = getDefaultAppConfig());
    if (!options) {
      throw ERROR_FACTORY.create(
        "no-options"
        /* AppError.NO_OPTIONS */
      );
    }
    const existingApp = _apps.get(name5);
    if (existingApp) {
      if (deepEqual(options, existingApp.options) && deepEqual(config, existingApp.config)) {
        return existingApp;
      } else {
        throw ERROR_FACTORY.create("duplicate-app", { appName: name5 });
      }
    }
    const container = new ComponentContainer(name5);
    for (const component of _components.values()) {
      container.addComponent(component);
    }
    const newApp = new FirebaseAppImpl(options, config, container);
    _apps.set(name5, newApp);
    return newApp;
  }
  function getApp(name5 = DEFAULT_ENTRY_NAME2) {
    const app2 = _apps.get(name5);
    if (!app2 && name5 === DEFAULT_ENTRY_NAME2 && getDefaultAppConfig()) {
      return initializeApp();
    }
    if (!app2) {
      throw ERROR_FACTORY.create("no-app", { appName: name5 });
    }
    return app2;
  }
  function registerVersion(libraryKeyOrName, version5, variant) {
    var _a;
    let library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;
    if (variant) {
      library += `-${variant}`;
    }
    const libraryMismatch = library.match(/\s|\//);
    const versionMismatch = version5.match(/\s|\//);
    if (libraryMismatch || versionMismatch) {
      const warning = [
        `Unable to register library "${library}" with version "${version5}":`
      ];
      if (libraryMismatch) {
        warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
      }
      if (libraryMismatch && versionMismatch) {
        warning.push("and");
      }
      if (versionMismatch) {
        warning.push(`version name "${version5}" contains illegal characters (whitespace or "/")`);
      }
      logger.warn(warning.join(" "));
      return;
    }
    _registerComponent(new Component(
      `${library}-version`,
      () => ({ library, version: version5 }),
      "VERSION"
      /* ComponentType.VERSION */
    ));
  }
  var DB_NAME = "firebase-heartbeat-database";
  var DB_VERSION = 1;
  var STORE_NAME = "firebase-heartbeat-store";
  var dbPromise = null;
  function getDbPromise() {
    if (!dbPromise) {
      dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade: (db2, oldVersion) => {
          switch (oldVersion) {
            case 0:
              try {
                db2.createObjectStore(STORE_NAME);
              } catch (e) {
                console.warn(e);
              }
          }
        }
      }).catch((e) => {
        throw ERROR_FACTORY.create("idb-open", {
          originalErrorMessage: e.message
        });
      });
    }
    return dbPromise;
  }
  async function readHeartbeatsFromIndexedDB(app2) {
    try {
      const db2 = await getDbPromise();
      const tx = db2.transaction(STORE_NAME);
      const result = await tx.objectStore(STORE_NAME).get(computeKey(app2));
      await tx.done;
      return result;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY.create("idb-get", {
          originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
        });
        logger.warn(idbGetError.message);
      }
    }
  }
  async function writeHeartbeatsToIndexedDB(app2, heartbeatObject) {
    try {
      const db2 = await getDbPromise();
      const tx = db2.transaction(STORE_NAME, "readwrite");
      const objectStore = tx.objectStore(STORE_NAME);
      await objectStore.put(heartbeatObject, computeKey(app2));
      await tx.done;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY.create("idb-set", {
          originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
        });
        logger.warn(idbGetError.message);
      }
    }
  }
  function computeKey(app2) {
    return `${app2.name}!${app2.options.appId}`;
  }
  var MAX_HEADER_BYTES = 1024;
  var STORED_HEARTBEAT_RETENTION_MAX_MILLIS = 30 * 24 * 60 * 60 * 1e3;
  var HeartbeatServiceImpl = class {
    constructor(container) {
      this.container = container;
      this._heartbeatsCache = null;
      const app2 = this.container.getProvider("app").getImmediate();
      this._storage = new HeartbeatStorageImpl(app2);
      this._heartbeatsCachePromise = this._storage.read().then((result) => {
        this._heartbeatsCache = result;
        return result;
      });
    }
    /**
     * Called to report a heartbeat. The function will generate
     * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
     * to IndexedDB.
     * Note that we only store one heartbeat per day. So if a heartbeat for today is
     * already logged, subsequent calls to this function in the same day will be ignored.
     */
    async triggerHeartbeat() {
      var _a, _b;
      try {
        const platformLogger = this.container.getProvider("platform-logger").getImmediate();
        const agent = platformLogger.getPlatformInfoString();
        const date = getUTCDateString();
        if (((_a = this._heartbeatsCache) === null || _a === void 0 ? void 0 : _a.heartbeats) == null) {
          this._heartbeatsCache = await this._heartbeatsCachePromise;
          if (((_b = this._heartbeatsCache) === null || _b === void 0 ? void 0 : _b.heartbeats) == null) {
            return;
          }
        }
        if (this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some((singleDateHeartbeat) => singleDateHeartbeat.date === date)) {
          return;
        } else {
          this._heartbeatsCache.heartbeats.push({ date, agent });
        }
        this._heartbeatsCache.heartbeats = this._heartbeatsCache.heartbeats.filter((singleDateHeartbeat) => {
          const hbTimestamp = new Date(singleDateHeartbeat.date).valueOf();
          const now = Date.now();
          return now - hbTimestamp <= STORED_HEARTBEAT_RETENTION_MAX_MILLIS;
        });
        return this._storage.overwrite(this._heartbeatsCache);
      } catch (e) {
        logger.warn(e);
      }
    }
    /**
     * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
     * It also clears all heartbeats from memory as well as in IndexedDB.
     *
     * NOTE: Consuming product SDKs should not send the header if this method
     * returns an empty string.
     */
    async getHeartbeatsHeader() {
      var _a;
      try {
        if (this._heartbeatsCache === null) {
          await this._heartbeatsCachePromise;
        }
        if (((_a = this._heartbeatsCache) === null || _a === void 0 ? void 0 : _a.heartbeats) == null || this._heartbeatsCache.heartbeats.length === 0) {
          return "";
        }
        const date = getUTCDateString();
        const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
        const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
        this._heartbeatsCache.lastSentHeartbeatDate = date;
        if (unsentEntries.length > 0) {
          this._heartbeatsCache.heartbeats = unsentEntries;
          await this._storage.overwrite(this._heartbeatsCache);
        } else {
          this._heartbeatsCache.heartbeats = [];
          void this._storage.overwrite(this._heartbeatsCache);
        }
        return headerString;
      } catch (e) {
        logger.warn(e);
        return "";
      }
    }
  };
  function getUTCDateString() {
    const today = /* @__PURE__ */ new Date();
    return today.toISOString().substring(0, 10);
  }
  function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
    const heartbeatsToSend = [];
    let unsentEntries = heartbeatsCache.slice();
    for (const singleDateHeartbeat of heartbeatsCache) {
      const heartbeatEntry = heartbeatsToSend.find((hb) => hb.agent === singleDateHeartbeat.agent);
      if (!heartbeatEntry) {
        heartbeatsToSend.push({
          agent: singleDateHeartbeat.agent,
          dates: [singleDateHeartbeat.date]
        });
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatsToSend.pop();
          break;
        }
      } else {
        heartbeatEntry.dates.push(singleDateHeartbeat.date);
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatEntry.dates.pop();
          break;
        }
      }
      unsentEntries = unsentEntries.slice(1);
    }
    return {
      heartbeatsToSend,
      unsentEntries
    };
  }
  var HeartbeatStorageImpl = class {
    constructor(app2) {
      this.app = app2;
      this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
    }
    async runIndexedDBEnvironmentCheck() {
      if (!isIndexedDBAvailable()) {
        return false;
      } else {
        return validateIndexedDBOpenable().then(() => true).catch(() => false);
      }
    }
    /**
     * Read all heartbeats.
     */
    async read() {
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return { heartbeats: [] };
      } else {
        const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
        if (idbHeartbeatObject === null || idbHeartbeatObject === void 0 ? void 0 : idbHeartbeatObject.heartbeats) {
          return idbHeartbeatObject;
        } else {
          return { heartbeats: [] };
        }
      }
    }
    // overwrite the storage with the provided heartbeats
    async overwrite(heartbeatsObject) {
      var _a;
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return;
      } else {
        const existingHeartbeatsObject = await this.read();
        return writeHeartbeatsToIndexedDB(this.app, {
          lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
          heartbeats: heartbeatsObject.heartbeats
        });
      }
    }
    // add heartbeats
    async add(heartbeatsObject) {
      var _a;
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return;
      } else {
        const existingHeartbeatsObject = await this.read();
        return writeHeartbeatsToIndexedDB(this.app, {
          lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
          heartbeats: [
            ...existingHeartbeatsObject.heartbeats,
            ...heartbeatsObject.heartbeats
          ]
        });
      }
    }
  };
  function countBytes(heartbeatsCache) {
    return base64urlEncodeWithoutPadding(
      // heartbeatsCache wrapper properties
      JSON.stringify({ version: 2, heartbeats: heartbeatsCache })
    ).length;
  }
  function registerCoreComponents(variant) {
    _registerComponent(new Component(
      "platform-logger",
      (container) => new PlatformLoggerServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    _registerComponent(new Component(
      "heartbeat",
      (container) => new HeartbeatServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    registerVersion(name$q, version$1, variant);
    registerVersion(name$q, version$1, "esm2017");
    registerVersion("fire-js", "");
  }
  registerCoreComponents("");

  // node_modules/firebase/app/dist/esm/index.esm.js
  var name2 = "firebase";
  var version2 = "10.14.0";
  registerVersion(name2, version2, "app");

  // node_modules/@firebase/installations/dist/esm/index.esm2017.js
  var name3 = "@firebase/installations";
  var version3 = "0.6.9";
  var PENDING_TIMEOUT_MS = 1e4;
  var PACKAGE_VERSION = `w:${version3}`;
  var INTERNAL_AUTH_VERSION = "FIS_v2";
  var INSTALLATIONS_API_URL = "https://firebaseinstallations.googleapis.com/v1";
  var TOKEN_EXPIRATION_BUFFER = 60 * 60 * 1e3;
  var SERVICE = "installations";
  var SERVICE_NAME = "Installations";
  var ERROR_DESCRIPTION_MAP = {
    [
      "missing-app-config-values"
      /* ErrorCode.MISSING_APP_CONFIG_VALUES */
    ]: 'Missing App configuration value: "{$valueName}"',
    [
      "not-registered"
      /* ErrorCode.NOT_REGISTERED */
    ]: "Firebase Installation is not registered.",
    [
      "installation-not-found"
      /* ErrorCode.INSTALLATION_NOT_FOUND */
    ]: "Firebase Installation not found.",
    [
      "request-failed"
      /* ErrorCode.REQUEST_FAILED */
    ]: '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
    [
      "app-offline"
      /* ErrorCode.APP_OFFLINE */
    ]: "Could not process request. Application offline.",
    [
      "delete-pending-registration"
      /* ErrorCode.DELETE_PENDING_REGISTRATION */
    ]: "Can't delete installation while there is a pending registration request."
  };
  var ERROR_FACTORY2 = new ErrorFactory(SERVICE, SERVICE_NAME, ERROR_DESCRIPTION_MAP);
  function isServerError(error) {
    return error instanceof FirebaseError && error.code.includes(
      "request-failed"
      /* ErrorCode.REQUEST_FAILED */
    );
  }
  function getInstallationsEndpoint({ projectId }) {
    return `${INSTALLATIONS_API_URL}/projects/${projectId}/installations`;
  }
  function extractAuthTokenInfoFromResponse(response) {
    return {
      token: response.token,
      requestStatus: 2,
      expiresIn: getExpiresInFromResponseExpiresIn(response.expiresIn),
      creationTime: Date.now()
    };
  }
  async function getErrorFromResponse(requestName, response) {
    const responseJson = await response.json();
    const errorData = responseJson.error;
    return ERROR_FACTORY2.create("request-failed", {
      requestName,
      serverCode: errorData.code,
      serverMessage: errorData.message,
      serverStatus: errorData.status
    });
  }
  function getHeaders({ apiKey }) {
    return new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-goog-api-key": apiKey
    });
  }
  function getHeadersWithAuth(appConfig, { refreshToken }) {
    const headers = getHeaders(appConfig);
    headers.append("Authorization", getAuthorizationHeader(refreshToken));
    return headers;
  }
  async function retryIfServerError(fn) {
    const result = await fn();
    if (result.status >= 500 && result.status < 600) {
      return fn();
    }
    return result;
  }
  function getExpiresInFromResponseExpiresIn(responseExpiresIn) {
    return Number(responseExpiresIn.replace("s", "000"));
  }
  function getAuthorizationHeader(refreshToken) {
    return `${INTERNAL_AUTH_VERSION} ${refreshToken}`;
  }
  async function createInstallationRequest({ appConfig, heartbeatServiceProvider }, { fid }) {
    const endpoint = getInstallationsEndpoint(appConfig);
    const headers = getHeaders(appConfig);
    const heartbeatService = heartbeatServiceProvider.getImmediate({
      optional: true
    });
    if (heartbeatService) {
      const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
      if (heartbeatsHeader) {
        headers.append("x-firebase-client", heartbeatsHeader);
      }
    }
    const body = {
      fid,
      authVersion: INTERNAL_AUTH_VERSION,
      appId: appConfig.appId,
      sdkVersion: PACKAGE_VERSION
    };
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    };
    const response = await retryIfServerError(() => fetch(endpoint, request));
    if (response.ok) {
      const responseValue = await response.json();
      const registeredInstallationEntry = {
        fid: responseValue.fid || fid,
        registrationStatus: 2,
        refreshToken: responseValue.refreshToken,
        authToken: extractAuthTokenInfoFromResponse(responseValue.authToken)
      };
      return registeredInstallationEntry;
    } else {
      throw await getErrorFromResponse("Create Installation", response);
    }
  }
  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  function bufferToBase64UrlSafe(array) {
    const b64 = btoa(String.fromCharCode(...array));
    return b64.replace(/\+/g, "-").replace(/\//g, "_");
  }
  var VALID_FID_PATTERN = /^[cdef][\w-]{21}$/;
  var INVALID_FID = "";
  function generateFid() {
    try {
      const fidByteArray = new Uint8Array(17);
      const crypto = self.crypto || self.msCrypto;
      crypto.getRandomValues(fidByteArray);
      fidByteArray[0] = 112 + fidByteArray[0] % 16;
      const fid = encode(fidByteArray);
      return VALID_FID_PATTERN.test(fid) ? fid : INVALID_FID;
    } catch (_a) {
      return INVALID_FID;
    }
  }
  function encode(fidByteArray) {
    const b64String = bufferToBase64UrlSafe(fidByteArray);
    return b64String.substr(0, 22);
  }
  function getKey(appConfig) {
    return `${appConfig.appName}!${appConfig.appId}`;
  }
  var fidChangeCallbacks = /* @__PURE__ */ new Map();
  function fidChanged(appConfig, fid) {
    const key = getKey(appConfig);
    callFidChangeCallbacks(key, fid);
    broadcastFidChange(key, fid);
  }
  function callFidChangeCallbacks(key, fid) {
    const callbacks = fidChangeCallbacks.get(key);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      callback(fid);
    }
  }
  function broadcastFidChange(key, fid) {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ key, fid });
    }
    closeBroadcastChannel();
  }
  var broadcastChannel = null;
  function getBroadcastChannel() {
    if (!broadcastChannel && "BroadcastChannel" in self) {
      broadcastChannel = new BroadcastChannel("[Firebase] FID Change");
      broadcastChannel.onmessage = (e) => {
        callFidChangeCallbacks(e.data.key, e.data.fid);
      };
    }
    return broadcastChannel;
  }
  function closeBroadcastChannel() {
    if (fidChangeCallbacks.size === 0 && broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  }
  var DATABASE_NAME = "firebase-installations-database";
  var DATABASE_VERSION = 1;
  var OBJECT_STORE_NAME = "firebase-installations-store";
  var dbPromise2 = null;
  function getDbPromise2() {
    if (!dbPromise2) {
      dbPromise2 = openDB(DATABASE_NAME, DATABASE_VERSION, {
        upgrade: (db2, oldVersion) => {
          switch (oldVersion) {
            case 0:
              db2.createObjectStore(OBJECT_STORE_NAME);
          }
        }
      });
    }
    return dbPromise2;
  }
  async function set(appConfig, value) {
    const key = getKey(appConfig);
    const db2 = await getDbPromise2();
    const tx = db2.transaction(OBJECT_STORE_NAME, "readwrite");
    const objectStore = tx.objectStore(OBJECT_STORE_NAME);
    const oldValue = await objectStore.get(key);
    await objectStore.put(value, key);
    await tx.done;
    if (!oldValue || oldValue.fid !== value.fid) {
      fidChanged(appConfig, value.fid);
    }
    return value;
  }
  async function remove(appConfig) {
    const key = getKey(appConfig);
    const db2 = await getDbPromise2();
    const tx = db2.transaction(OBJECT_STORE_NAME, "readwrite");
    await tx.objectStore(OBJECT_STORE_NAME).delete(key);
    await tx.done;
  }
  async function update(appConfig, updateFn) {
    const key = getKey(appConfig);
    const db2 = await getDbPromise2();
    const tx = db2.transaction(OBJECT_STORE_NAME, "readwrite");
    const store = tx.objectStore(OBJECT_STORE_NAME);
    const oldValue = await store.get(key);
    const newValue = updateFn(oldValue);
    if (newValue === void 0) {
      await store.delete(key);
    } else {
      await store.put(newValue, key);
    }
    await tx.done;
    if (newValue && (!oldValue || oldValue.fid !== newValue.fid)) {
      fidChanged(appConfig, newValue.fid);
    }
    return newValue;
  }
  async function getInstallationEntry(installations) {
    let registrationPromise;
    const installationEntry = await update(installations.appConfig, (oldEntry) => {
      const installationEntry2 = updateOrCreateInstallationEntry(oldEntry);
      const entryWithPromise = triggerRegistrationIfNecessary(installations, installationEntry2);
      registrationPromise = entryWithPromise.registrationPromise;
      return entryWithPromise.installationEntry;
    });
    if (installationEntry.fid === INVALID_FID) {
      return { installationEntry: await registrationPromise };
    }
    return {
      installationEntry,
      registrationPromise
    };
  }
  function updateOrCreateInstallationEntry(oldEntry) {
    const entry = oldEntry || {
      fid: generateFid(),
      registrationStatus: 0
      /* RequestStatus.NOT_STARTED */
    };
    return clearTimedOutRequest(entry);
  }
  function triggerRegistrationIfNecessary(installations, installationEntry) {
    if (installationEntry.registrationStatus === 0) {
      if (!navigator.onLine) {
        const registrationPromiseWithError = Promise.reject(ERROR_FACTORY2.create(
          "app-offline"
          /* ErrorCode.APP_OFFLINE */
        ));
        return {
          installationEntry,
          registrationPromise: registrationPromiseWithError
        };
      }
      const inProgressEntry = {
        fid: installationEntry.fid,
        registrationStatus: 1,
        registrationTime: Date.now()
      };
      const registrationPromise = registerInstallation(installations, inProgressEntry);
      return { installationEntry: inProgressEntry, registrationPromise };
    } else if (installationEntry.registrationStatus === 1) {
      return {
        installationEntry,
        registrationPromise: waitUntilFidRegistration(installations)
      };
    } else {
      return { installationEntry };
    }
  }
  async function registerInstallation(installations, installationEntry) {
    try {
      const registeredInstallationEntry = await createInstallationRequest(installations, installationEntry);
      return set(installations.appConfig, registeredInstallationEntry);
    } catch (e) {
      if (isServerError(e) && e.customData.serverCode === 409) {
        await remove(installations.appConfig);
      } else {
        await set(installations.appConfig, {
          fid: installationEntry.fid,
          registrationStatus: 0
          /* RequestStatus.NOT_STARTED */
        });
      }
      throw e;
    }
  }
  async function waitUntilFidRegistration(installations) {
    let entry = await updateInstallationRequest(installations.appConfig);
    while (entry.registrationStatus === 1) {
      await sleep(100);
      entry = await updateInstallationRequest(installations.appConfig);
    }
    if (entry.registrationStatus === 0) {
      const { installationEntry, registrationPromise } = await getInstallationEntry(installations);
      if (registrationPromise) {
        return registrationPromise;
      } else {
        return installationEntry;
      }
    }
    return entry;
  }
  function updateInstallationRequest(appConfig) {
    return update(appConfig, (oldEntry) => {
      if (!oldEntry) {
        throw ERROR_FACTORY2.create(
          "installation-not-found"
          /* ErrorCode.INSTALLATION_NOT_FOUND */
        );
      }
      return clearTimedOutRequest(oldEntry);
    });
  }
  function clearTimedOutRequest(entry) {
    if (hasInstallationRequestTimedOut(entry)) {
      return {
        fid: entry.fid,
        registrationStatus: 0
        /* RequestStatus.NOT_STARTED */
      };
    }
    return entry;
  }
  function hasInstallationRequestTimedOut(installationEntry) {
    return installationEntry.registrationStatus === 1 && installationEntry.registrationTime + PENDING_TIMEOUT_MS < Date.now();
  }
  async function generateAuthTokenRequest({ appConfig, heartbeatServiceProvider }, installationEntry) {
    const endpoint = getGenerateAuthTokenEndpoint(appConfig, installationEntry);
    const headers = getHeadersWithAuth(appConfig, installationEntry);
    const heartbeatService = heartbeatServiceProvider.getImmediate({
      optional: true
    });
    if (heartbeatService) {
      const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
      if (heartbeatsHeader) {
        headers.append("x-firebase-client", heartbeatsHeader);
      }
    }
    const body = {
      installation: {
        sdkVersion: PACKAGE_VERSION,
        appId: appConfig.appId
      }
    };
    const request = {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    };
    const response = await retryIfServerError(() => fetch(endpoint, request));
    if (response.ok) {
      const responseValue = await response.json();
      const completedAuthToken = extractAuthTokenInfoFromResponse(responseValue);
      return completedAuthToken;
    } else {
      throw await getErrorFromResponse("Generate Auth Token", response);
    }
  }
  function getGenerateAuthTokenEndpoint(appConfig, { fid }) {
    return `${getInstallationsEndpoint(appConfig)}/${fid}/authTokens:generate`;
  }
  async function refreshAuthToken(installations, forceRefresh = false) {
    let tokenPromise;
    const entry = await update(installations.appConfig, (oldEntry) => {
      if (!isEntryRegistered(oldEntry)) {
        throw ERROR_FACTORY2.create(
          "not-registered"
          /* ErrorCode.NOT_REGISTERED */
        );
      }
      const oldAuthToken = oldEntry.authToken;
      if (!forceRefresh && isAuthTokenValid(oldAuthToken)) {
        return oldEntry;
      } else if (oldAuthToken.requestStatus === 1) {
        tokenPromise = waitUntilAuthTokenRequest(installations, forceRefresh);
        return oldEntry;
      } else {
        if (!navigator.onLine) {
          throw ERROR_FACTORY2.create(
            "app-offline"
            /* ErrorCode.APP_OFFLINE */
          );
        }
        const inProgressEntry = makeAuthTokenRequestInProgressEntry(oldEntry);
        tokenPromise = fetchAuthTokenFromServer(installations, inProgressEntry);
        return inProgressEntry;
      }
    });
    const authToken = tokenPromise ? await tokenPromise : entry.authToken;
    return authToken;
  }
  async function waitUntilAuthTokenRequest(installations, forceRefresh) {
    let entry = await updateAuthTokenRequest(installations.appConfig);
    while (entry.authToken.requestStatus === 1) {
      await sleep(100);
      entry = await updateAuthTokenRequest(installations.appConfig);
    }
    const authToken = entry.authToken;
    if (authToken.requestStatus === 0) {
      return refreshAuthToken(installations, forceRefresh);
    } else {
      return authToken;
    }
  }
  function updateAuthTokenRequest(appConfig) {
    return update(appConfig, (oldEntry) => {
      if (!isEntryRegistered(oldEntry)) {
        throw ERROR_FACTORY2.create(
          "not-registered"
          /* ErrorCode.NOT_REGISTERED */
        );
      }
      const oldAuthToken = oldEntry.authToken;
      if (hasAuthTokenRequestTimedOut(oldAuthToken)) {
        return Object.assign(Object.assign({}, oldEntry), { authToken: {
          requestStatus: 0
          /* RequestStatus.NOT_STARTED */
        } });
      }
      return oldEntry;
    });
  }
  async function fetchAuthTokenFromServer(installations, installationEntry) {
    try {
      const authToken = await generateAuthTokenRequest(installations, installationEntry);
      const updatedInstallationEntry = Object.assign(Object.assign({}, installationEntry), { authToken });
      await set(installations.appConfig, updatedInstallationEntry);
      return authToken;
    } catch (e) {
      if (isServerError(e) && (e.customData.serverCode === 401 || e.customData.serverCode === 404)) {
        await remove(installations.appConfig);
      } else {
        const updatedInstallationEntry = Object.assign(Object.assign({}, installationEntry), { authToken: {
          requestStatus: 0
          /* RequestStatus.NOT_STARTED */
        } });
        await set(installations.appConfig, updatedInstallationEntry);
      }
      throw e;
    }
  }
  function isEntryRegistered(installationEntry) {
    return installationEntry !== void 0 && installationEntry.registrationStatus === 2;
  }
  function isAuthTokenValid(authToken) {
    return authToken.requestStatus === 2 && !isAuthTokenExpired(authToken);
  }
  function isAuthTokenExpired(authToken) {
    const now = Date.now();
    return now < authToken.creationTime || authToken.creationTime + authToken.expiresIn < now + TOKEN_EXPIRATION_BUFFER;
  }
  function makeAuthTokenRequestInProgressEntry(oldEntry) {
    const inProgressAuthToken = {
      requestStatus: 1,
      requestTime: Date.now()
    };
    return Object.assign(Object.assign({}, oldEntry), { authToken: inProgressAuthToken });
  }
  function hasAuthTokenRequestTimedOut(authToken) {
    return authToken.requestStatus === 1 && authToken.requestTime + PENDING_TIMEOUT_MS < Date.now();
  }
  async function getId(installations) {
    const installationsImpl = installations;
    const { installationEntry, registrationPromise } = await getInstallationEntry(installationsImpl);
    if (registrationPromise) {
      registrationPromise.catch(console.error);
    } else {
      refreshAuthToken(installationsImpl).catch(console.error);
    }
    return installationEntry.fid;
  }
  async function getToken(installations, forceRefresh = false) {
    const installationsImpl = installations;
    await completeInstallationRegistration(installationsImpl);
    const authToken = await refreshAuthToken(installationsImpl, forceRefresh);
    return authToken.token;
  }
  async function completeInstallationRegistration(installations) {
    const { registrationPromise } = await getInstallationEntry(installations);
    if (registrationPromise) {
      await registrationPromise;
    }
  }
  function extractAppConfig(app2) {
    if (!app2 || !app2.options) {
      throw getMissingValueError("App Configuration");
    }
    if (!app2.name) {
      throw getMissingValueError("App Name");
    }
    const configKeys = [
      "projectId",
      "apiKey",
      "appId"
    ];
    for (const keyName of configKeys) {
      if (!app2.options[keyName]) {
        throw getMissingValueError(keyName);
      }
    }
    return {
      appName: app2.name,
      projectId: app2.options.projectId,
      apiKey: app2.options.apiKey,
      appId: app2.options.appId
    };
  }
  function getMissingValueError(valueName) {
    return ERROR_FACTORY2.create("missing-app-config-values", {
      valueName
    });
  }
  var INSTALLATIONS_NAME = "installations";
  var INSTALLATIONS_NAME_INTERNAL = "installations-internal";
  var publicFactory = (container) => {
    const app2 = container.getProvider("app").getImmediate();
    const appConfig = extractAppConfig(app2);
    const heartbeatServiceProvider = _getProvider(app2, "heartbeat");
    const installationsImpl = {
      app: app2,
      appConfig,
      heartbeatServiceProvider,
      _delete: () => Promise.resolve()
    };
    return installationsImpl;
  };
  var internalFactory = (container) => {
    const app2 = container.getProvider("app").getImmediate();
    const installations = _getProvider(app2, INSTALLATIONS_NAME).getImmediate();
    const installationsInternal = {
      getId: () => getId(installations),
      getToken: (forceRefresh) => getToken(installations, forceRefresh)
    };
    return installationsInternal;
  };
  function registerInstallations() {
    _registerComponent(new Component(
      INSTALLATIONS_NAME,
      publicFactory,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
    _registerComponent(new Component(
      INSTALLATIONS_NAME_INTERNAL,
      internalFactory,
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
  }
  registerInstallations();
  registerVersion(name3, version3);
  registerVersion(name3, version3, "esm2017");

  // node_modules/@firebase/analytics/dist/esm/index.esm2017.js
  var ANALYTICS_TYPE = "analytics";
  var GA_FID_KEY = "firebase_id";
  var ORIGIN_KEY = "origin";
  var FETCH_TIMEOUT_MILLIS = 60 * 1e3;
  var DYNAMIC_CONFIG_URL = "https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig";
  var GTAG_URL = "https://www.googletagmanager.com/gtag/js";
  var logger2 = new Logger("@firebase/analytics");
  var ERRORS2 = {
    [
      "already-exists"
      /* AnalyticsError.ALREADY_EXISTS */
    ]: "A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.",
    [
      "already-initialized"
      /* AnalyticsError.ALREADY_INITIALIZED */
    ]: "initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.",
    [
      "already-initialized-settings"
      /* AnalyticsError.ALREADY_INITIALIZED_SETTINGS */
    ]: "Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.",
    [
      "interop-component-reg-failed"
      /* AnalyticsError.INTEROP_COMPONENT_REG_FAILED */
    ]: "Firebase Analytics Interop Component failed to instantiate: {$reason}",
    [
      "invalid-analytics-context"
      /* AnalyticsError.INVALID_ANALYTICS_CONTEXT */
    ]: "Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}",
    [
      "indexeddb-unavailable"
      /* AnalyticsError.INDEXEDDB_UNAVAILABLE */
    ]: "IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}",
    [
      "fetch-throttle"
      /* AnalyticsError.FETCH_THROTTLE */
    ]: "The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.",
    [
      "config-fetch-failed"
      /* AnalyticsError.CONFIG_FETCH_FAILED */
    ]: "Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}",
    [
      "no-api-key"
      /* AnalyticsError.NO_API_KEY */
    ]: 'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',
    [
      "no-app-id"
      /* AnalyticsError.NO_APP_ID */
    ]: 'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',
    [
      "no-client-id"
      /* AnalyticsError.NO_CLIENT_ID */
    ]: 'The "client_id" field is empty.',
    [
      "invalid-gtag-resource"
      /* AnalyticsError.INVALID_GTAG_RESOURCE */
    ]: "Trusted Types detected an invalid gtag resource: {$gtagURL}."
  };
  var ERROR_FACTORY3 = new ErrorFactory("analytics", "Analytics", ERRORS2);
  function createGtagTrustedTypesScriptURL(url) {
    if (!url.startsWith(GTAG_URL)) {
      const err = ERROR_FACTORY3.create("invalid-gtag-resource", {
        gtagURL: url
      });
      logger2.warn(err.message);
      return "";
    }
    return url;
  }
  function promiseAllSettled(promises) {
    return Promise.all(promises.map((promise) => promise.catch((e) => e)));
  }
  function createTrustedTypesPolicy(policyName, policyOptions) {
    let trustedTypesPolicy;
    if (window.trustedTypes) {
      trustedTypesPolicy = window.trustedTypes.createPolicy(policyName, policyOptions);
    }
    return trustedTypesPolicy;
  }
  function insertScriptTag(dataLayerName2, measurementId) {
    const trustedTypesPolicy = createTrustedTypesPolicy("firebase-js-sdk-policy", {
      createScriptURL: createGtagTrustedTypesScriptURL
    });
    const script = document.createElement("script");
    const gtagScriptURL = `${GTAG_URL}?l=${dataLayerName2}&id=${measurementId}`;
    script.src = trustedTypesPolicy ? trustedTypesPolicy === null || trustedTypesPolicy === void 0 ? void 0 : trustedTypesPolicy.createScriptURL(gtagScriptURL) : gtagScriptURL;
    script.async = true;
    document.head.appendChild(script);
  }
  function getOrCreateDataLayer(dataLayerName2) {
    let dataLayer = [];
    if (Array.isArray(window[dataLayerName2])) {
      dataLayer = window[dataLayerName2];
    } else {
      window[dataLayerName2] = dataLayer;
    }
    return dataLayer;
  }
  async function gtagOnConfig(gtagCore, initializationPromisesMap2, dynamicConfigPromisesList2, measurementIdToAppId2, measurementId, gtagParams) {
    const correspondingAppId = measurementIdToAppId2[measurementId];
    try {
      if (correspondingAppId) {
        await initializationPromisesMap2[correspondingAppId];
      } else {
        const dynamicConfigResults = await promiseAllSettled(dynamicConfigPromisesList2);
        const foundConfig = dynamicConfigResults.find((config) => config.measurementId === measurementId);
        if (foundConfig) {
          await initializationPromisesMap2[foundConfig.appId];
        }
      }
    } catch (e) {
      logger2.error(e);
    }
    gtagCore("config", measurementId, gtagParams);
  }
  async function gtagOnEvent(gtagCore, initializationPromisesMap2, dynamicConfigPromisesList2, measurementId, gtagParams) {
    try {
      let initializationPromisesToWaitFor = [];
      if (gtagParams && gtagParams["send_to"]) {
        let gaSendToList = gtagParams["send_to"];
        if (!Array.isArray(gaSendToList)) {
          gaSendToList = [gaSendToList];
        }
        const dynamicConfigResults = await promiseAllSettled(dynamicConfigPromisesList2);
        for (const sendToId of gaSendToList) {
          const foundConfig = dynamicConfigResults.find((config) => config.measurementId === sendToId);
          const initializationPromise = foundConfig && initializationPromisesMap2[foundConfig.appId];
          if (initializationPromise) {
            initializationPromisesToWaitFor.push(initializationPromise);
          } else {
            initializationPromisesToWaitFor = [];
            break;
          }
        }
      }
      if (initializationPromisesToWaitFor.length === 0) {
        initializationPromisesToWaitFor = Object.values(initializationPromisesMap2);
      }
      await Promise.all(initializationPromisesToWaitFor);
      gtagCore("event", measurementId, gtagParams || {});
    } catch (e) {
      logger2.error(e);
    }
  }
  function wrapGtag(gtagCore, initializationPromisesMap2, dynamicConfigPromisesList2, measurementIdToAppId2) {
    async function gtagWrapper(command, ...args) {
      try {
        if (command === "event") {
          const [measurementId, gtagParams] = args;
          await gtagOnEvent(gtagCore, initializationPromisesMap2, dynamicConfigPromisesList2, measurementId, gtagParams);
        } else if (command === "config") {
          const [measurementId, gtagParams] = args;
          await gtagOnConfig(gtagCore, initializationPromisesMap2, dynamicConfigPromisesList2, measurementIdToAppId2, measurementId, gtagParams);
        } else if (command === "consent") {
          const [consentAction, gtagParams] = args;
          gtagCore("consent", consentAction, gtagParams);
        } else if (command === "get") {
          const [measurementId, fieldName, callback] = args;
          gtagCore("get", measurementId, fieldName, callback);
        } else if (command === "set") {
          const [customParams] = args;
          gtagCore("set", customParams);
        } else {
          gtagCore(command, ...args);
        }
      } catch (e) {
        logger2.error(e);
      }
    }
    return gtagWrapper;
  }
  function wrapOrCreateGtag(initializationPromisesMap2, dynamicConfigPromisesList2, measurementIdToAppId2, dataLayerName2, gtagFunctionName) {
    let gtagCore = function(..._args) {
      window[dataLayerName2].push(arguments);
    };
    if (window[gtagFunctionName] && typeof window[gtagFunctionName] === "function") {
      gtagCore = window[gtagFunctionName];
    }
    window[gtagFunctionName] = wrapGtag(gtagCore, initializationPromisesMap2, dynamicConfigPromisesList2, measurementIdToAppId2);
    return {
      gtagCore,
      wrappedGtag: window[gtagFunctionName]
    };
  }
  function findGtagScriptOnPage(dataLayerName2) {
    const scriptTags = window.document.getElementsByTagName("script");
    for (const tag of Object.values(scriptTags)) {
      if (tag.src && tag.src.includes(GTAG_URL) && tag.src.includes(dataLayerName2)) {
        return tag;
      }
    }
    return null;
  }
  var LONG_RETRY_FACTOR = 30;
  var BASE_INTERVAL_MILLIS = 1e3;
  var RetryData = class {
    constructor(throttleMetadata = {}, intervalMillis = BASE_INTERVAL_MILLIS) {
      this.throttleMetadata = throttleMetadata;
      this.intervalMillis = intervalMillis;
    }
    getThrottleMetadata(appId) {
      return this.throttleMetadata[appId];
    }
    setThrottleMetadata(appId, metadata) {
      this.throttleMetadata[appId] = metadata;
    }
    deleteThrottleMetadata(appId) {
      delete this.throttleMetadata[appId];
    }
  };
  var defaultRetryData = new RetryData();
  function getHeaders2(apiKey) {
    return new Headers({
      Accept: "application/json",
      "x-goog-api-key": apiKey
    });
  }
  async function fetchDynamicConfig(appFields) {
    var _a;
    const { appId, apiKey } = appFields;
    const request = {
      method: "GET",
      headers: getHeaders2(apiKey)
    };
    const appUrl = DYNAMIC_CONFIG_URL.replace("{app-id}", appId);
    const response = await fetch(appUrl, request);
    if (response.status !== 200 && response.status !== 304) {
      let errorMessage = "";
      try {
        const jsonResponse = await response.json();
        if ((_a = jsonResponse.error) === null || _a === void 0 ? void 0 : _a.message) {
          errorMessage = jsonResponse.error.message;
        }
      } catch (_ignored) {
      }
      throw ERROR_FACTORY3.create("config-fetch-failed", {
        httpStatus: response.status,
        responseMessage: errorMessage
      });
    }
    return response.json();
  }
  async function fetchDynamicConfigWithRetry(app2, retryData = defaultRetryData, timeoutMillis) {
    const { appId, apiKey, measurementId } = app2.options;
    if (!appId) {
      throw ERROR_FACTORY3.create(
        "no-app-id"
        /* AnalyticsError.NO_APP_ID */
      );
    }
    if (!apiKey) {
      if (measurementId) {
        return {
          measurementId,
          appId
        };
      }
      throw ERROR_FACTORY3.create(
        "no-api-key"
        /* AnalyticsError.NO_API_KEY */
      );
    }
    const throttleMetadata = retryData.getThrottleMetadata(appId) || {
      backoffCount: 0,
      throttleEndTimeMillis: Date.now()
    };
    const signal = new AnalyticsAbortSignal();
    setTimeout(async () => {
      signal.abort();
    }, timeoutMillis !== void 0 ? timeoutMillis : FETCH_TIMEOUT_MILLIS);
    return attemptFetchDynamicConfigWithRetry({ appId, apiKey, measurementId }, throttleMetadata, signal, retryData);
  }
  async function attemptFetchDynamicConfigWithRetry(appFields, { throttleEndTimeMillis, backoffCount }, signal, retryData = defaultRetryData) {
    var _a;
    const { appId, measurementId } = appFields;
    try {
      await setAbortableTimeout(signal, throttleEndTimeMillis);
    } catch (e) {
      if (measurementId) {
        logger2.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${measurementId} provided in the "measurementId" field in the local Firebase config. [${e === null || e === void 0 ? void 0 : e.message}]`);
        return { appId, measurementId };
      }
      throw e;
    }
    try {
      const response = await fetchDynamicConfig(appFields);
      retryData.deleteThrottleMetadata(appId);
      return response;
    } catch (e) {
      const error = e;
      if (!isRetriableError(error)) {
        retryData.deleteThrottleMetadata(appId);
        if (measurementId) {
          logger2.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${measurementId} provided in the "measurementId" field in the local Firebase config. [${error === null || error === void 0 ? void 0 : error.message}]`);
          return { appId, measurementId };
        } else {
          throw e;
        }
      }
      const backoffMillis = Number((_a = error === null || error === void 0 ? void 0 : error.customData) === null || _a === void 0 ? void 0 : _a.httpStatus) === 503 ? calculateBackoffMillis(backoffCount, retryData.intervalMillis, LONG_RETRY_FACTOR) : calculateBackoffMillis(backoffCount, retryData.intervalMillis);
      const throttleMetadata = {
        throttleEndTimeMillis: Date.now() + backoffMillis,
        backoffCount: backoffCount + 1
      };
      retryData.setThrottleMetadata(appId, throttleMetadata);
      logger2.debug(`Calling attemptFetch again in ${backoffMillis} millis`);
      return attemptFetchDynamicConfigWithRetry(appFields, throttleMetadata, signal, retryData);
    }
  }
  function setAbortableTimeout(signal, throttleEndTimeMillis) {
    return new Promise((resolve, reject) => {
      const backoffMillis = Math.max(throttleEndTimeMillis - Date.now(), 0);
      const timeout = setTimeout(resolve, backoffMillis);
      signal.addEventListener(() => {
        clearTimeout(timeout);
        reject(ERROR_FACTORY3.create("fetch-throttle", {
          throttleEndTimeMillis
        }));
      });
    });
  }
  function isRetriableError(e) {
    if (!(e instanceof FirebaseError) || !e.customData) {
      return false;
    }
    const httpStatus = Number(e.customData["httpStatus"]);
    return httpStatus === 429 || httpStatus === 500 || httpStatus === 503 || httpStatus === 504;
  }
  var AnalyticsAbortSignal = class {
    constructor() {
      this.listeners = [];
    }
    addEventListener(listener) {
      this.listeners.push(listener);
    }
    abort() {
      this.listeners.forEach((listener) => listener());
    }
  };
  var defaultEventParametersForInit;
  async function logEvent$1(gtagFunction, initializationPromise, eventName, eventParams, options) {
    if (options && options.global) {
      gtagFunction("event", eventName, eventParams);
      return;
    } else {
      const measurementId = await initializationPromise;
      const params = Object.assign(Object.assign({}, eventParams), { "send_to": measurementId });
      gtagFunction("event", eventName, params);
    }
  }
  var defaultConsentSettingsForInit;
  function _setConsentDefaultForInit(consentSettings) {
    defaultConsentSettingsForInit = consentSettings;
  }
  function _setDefaultEventParametersForInit(customParams) {
    defaultEventParametersForInit = customParams;
  }
  async function validateIndexedDB() {
    if (!isIndexedDBAvailable()) {
      logger2.warn(ERROR_FACTORY3.create("indexeddb-unavailable", {
        errorInfo: "IndexedDB is not available in this environment."
      }).message);
      return false;
    } else {
      try {
        await validateIndexedDBOpenable();
      } catch (e) {
        logger2.warn(ERROR_FACTORY3.create("indexeddb-unavailable", {
          errorInfo: e === null || e === void 0 ? void 0 : e.toString()
        }).message);
        return false;
      }
    }
    return true;
  }
  async function _initializeAnalytics(app2, dynamicConfigPromisesList2, measurementIdToAppId2, installations, gtagCore, dataLayerName2, options) {
    var _a;
    const dynamicConfigPromise = fetchDynamicConfigWithRetry(app2);
    dynamicConfigPromise.then((config) => {
      measurementIdToAppId2[config.measurementId] = config.appId;
      if (app2.options.measurementId && config.measurementId !== app2.options.measurementId) {
        logger2.warn(`The measurement ID in the local Firebase config (${app2.options.measurementId}) does not match the measurement ID fetched from the server (${config.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`);
      }
    }).catch((e) => logger2.error(e));
    dynamicConfigPromisesList2.push(dynamicConfigPromise);
    const fidPromise = validateIndexedDB().then((envIsValid) => {
      if (envIsValid) {
        return installations.getId();
      } else {
        return void 0;
      }
    });
    const [dynamicConfig, fid] = await Promise.all([
      dynamicConfigPromise,
      fidPromise
    ]);
    if (!findGtagScriptOnPage(dataLayerName2)) {
      insertScriptTag(dataLayerName2, dynamicConfig.measurementId);
    }
    if (defaultConsentSettingsForInit) {
      gtagCore("consent", "default", defaultConsentSettingsForInit);
      _setConsentDefaultForInit(void 0);
    }
    gtagCore("js", /* @__PURE__ */ new Date());
    const configProperties = (_a = options === null || options === void 0 ? void 0 : options.config) !== null && _a !== void 0 ? _a : {};
    configProperties[ORIGIN_KEY] = "firebase";
    configProperties.update = true;
    if (fid != null) {
      configProperties[GA_FID_KEY] = fid;
    }
    gtagCore("config", dynamicConfig.measurementId, configProperties);
    if (defaultEventParametersForInit) {
      gtagCore("set", defaultEventParametersForInit);
      _setDefaultEventParametersForInit(void 0);
    }
    return dynamicConfig.measurementId;
  }
  var AnalyticsService = class {
    constructor(app2) {
      this.app = app2;
    }
    _delete() {
      delete initializationPromisesMap[this.app.options.appId];
      return Promise.resolve();
    }
  };
  var initializationPromisesMap = {};
  var dynamicConfigPromisesList = [];
  var measurementIdToAppId = {};
  var dataLayerName = "dataLayer";
  var gtagName = "gtag";
  var gtagCoreFunction;
  var wrappedGtagFunction;
  var globalInitDone = false;
  function warnOnBrowserContextMismatch() {
    const mismatchedEnvMessages = [];
    if (isBrowserExtension()) {
      mismatchedEnvMessages.push("This is a browser extension environment.");
    }
    if (!areCookiesEnabled()) {
      mismatchedEnvMessages.push("Cookies are not available.");
    }
    if (mismatchedEnvMessages.length > 0) {
      const details = mismatchedEnvMessages.map((message, index) => `(${index + 1}) ${message}`).join(" ");
      const err = ERROR_FACTORY3.create("invalid-analytics-context", {
        errorInfo: details
      });
      logger2.warn(err.message);
    }
  }
  function factory(app2, installations, options) {
    warnOnBrowserContextMismatch();
    const appId = app2.options.appId;
    if (!appId) {
      throw ERROR_FACTORY3.create(
        "no-app-id"
        /* AnalyticsError.NO_APP_ID */
      );
    }
    if (!app2.options.apiKey) {
      if (app2.options.measurementId) {
        logger2.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${app2.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);
      } else {
        throw ERROR_FACTORY3.create(
          "no-api-key"
          /* AnalyticsError.NO_API_KEY */
        );
      }
    }
    if (initializationPromisesMap[appId] != null) {
      throw ERROR_FACTORY3.create("already-exists", {
        id: appId
      });
    }
    if (!globalInitDone) {
      getOrCreateDataLayer(dataLayerName);
      const { wrappedGtag, gtagCore } = wrapOrCreateGtag(initializationPromisesMap, dynamicConfigPromisesList, measurementIdToAppId, dataLayerName, gtagName);
      wrappedGtagFunction = wrappedGtag;
      gtagCoreFunction = gtagCore;
      globalInitDone = true;
    }
    initializationPromisesMap[appId] = _initializeAnalytics(app2, dynamicConfigPromisesList, measurementIdToAppId, installations, gtagCoreFunction, dataLayerName, options);
    const analyticsInstance = new AnalyticsService(app2);
    return analyticsInstance;
  }
  function getAnalytics(app2 = getApp()) {
    app2 = getModularInstance(app2);
    const analyticsProvider = _getProvider(app2, ANALYTICS_TYPE);
    if (analyticsProvider.isInitialized()) {
      return analyticsProvider.getImmediate();
    }
    return initializeAnalytics(app2);
  }
  function initializeAnalytics(app2, options = {}) {
    const analyticsProvider = _getProvider(app2, ANALYTICS_TYPE);
    if (analyticsProvider.isInitialized()) {
      const existingInstance = analyticsProvider.getImmediate();
      if (deepEqual(options, analyticsProvider.getOptions())) {
        return existingInstance;
      } else {
        throw ERROR_FACTORY3.create(
          "already-initialized"
          /* AnalyticsError.ALREADY_INITIALIZED */
        );
      }
    }
    const analyticsInstance = analyticsProvider.initialize({ options });
    return analyticsInstance;
  }
  function logEvent(analyticsInstance, eventName, eventParams, options) {
    analyticsInstance = getModularInstance(analyticsInstance);
    logEvent$1(wrappedGtagFunction, initializationPromisesMap[analyticsInstance.app.options.appId], eventName, eventParams, options).catch((e) => logger2.error(e));
  }
  var name4 = "@firebase/analytics";
  var version4 = "0.10.8";
  function registerAnalytics() {
    _registerComponent(new Component(
      ANALYTICS_TYPE,
      (container, { options: analyticsOptions }) => {
        const app2 = container.getProvider("app").getImmediate();
        const installations = container.getProvider("installations-internal").getImmediate();
        return factory(app2, installations, analyticsOptions);
      },
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
    _registerComponent(new Component(
      "analytics-internal",
      internalFactory2,
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    registerVersion(name4, version4);
    registerVersion(name4, version4, "esm2017");
    function internalFactory2(container) {
      try {
        const analytics2 = container.getProvider(ANALYTICS_TYPE).getImmediate();
        return {
          logEvent: (eventName, eventParams, options) => logEvent(analytics2, eventName, eventParams, options)
        };
      } catch (e) {
        throw ERROR_FACTORY3.create("interop-component-reg-failed", {
          reason: e
        });
      }
    }
  }
  registerAnalytics();

  // node_modules/@firebase/webchannel-wrapper/dist/bloom-blob/esm/bloom_blob_es2018.js
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  var bloom_blob_es2018 = {};
  var Integer;
  var Md5;
  (function() {
    var h;
    function k(f, a) {
      function c() {
      }
      c.prototype = a.prototype;
      f.D = a.prototype;
      f.prototype = new c();
      f.prototype.constructor = f;
      f.C = function(d, e, g) {
        for (var b2 = Array(arguments.length - 2), r = 2; r < arguments.length; r++) b2[r - 2] = arguments[r];
        return a.prototype[e].apply(d, b2);
      };
    }
    function l() {
      this.blockSize = -1;
    }
    function m() {
      this.blockSize = -1;
      this.blockSize = 64;
      this.g = Array(4);
      this.B = Array(this.blockSize);
      this.o = this.h = 0;
      this.s();
    }
    k(m, l);
    m.prototype.s = function() {
      this.g[0] = 1732584193;
      this.g[1] = 4023233417;
      this.g[2] = 2562383102;
      this.g[3] = 271733878;
      this.o = this.h = 0;
    };
    function n(f, a, c) {
      c || (c = 0);
      var d = Array(16);
      if ("string" === typeof a) for (var e = 0; 16 > e; ++e) d[e] = a.charCodeAt(c++) | a.charCodeAt(c++) << 8 | a.charCodeAt(c++) << 16 | a.charCodeAt(c++) << 24;
      else for (e = 0; 16 > e; ++e) d[e] = a[c++] | a[c++] << 8 | a[c++] << 16 | a[c++] << 24;
      a = f.g[0];
      c = f.g[1];
      e = f.g[2];
      var g = f.g[3];
      var b2 = a + (g ^ c & (e ^ g)) + d[0] + 3614090360 & 4294967295;
      a = c + (b2 << 7 & 4294967295 | b2 >>> 25);
      b2 = g + (e ^ a & (c ^ e)) + d[1] + 3905402710 & 4294967295;
      g = a + (b2 << 12 & 4294967295 | b2 >>> 20);
      b2 = e + (c ^ g & (a ^ c)) + d[2] + 606105819 & 4294967295;
      e = g + (b2 << 17 & 4294967295 | b2 >>> 15);
      b2 = c + (a ^ e & (g ^ a)) + d[3] + 3250441966 & 4294967295;
      c = e + (b2 << 22 & 4294967295 | b2 >>> 10);
      b2 = a + (g ^ c & (e ^ g)) + d[4] + 4118548399 & 4294967295;
      a = c + (b2 << 7 & 4294967295 | b2 >>> 25);
      b2 = g + (e ^ a & (c ^ e)) + d[5] + 1200080426 & 4294967295;
      g = a + (b2 << 12 & 4294967295 | b2 >>> 20);
      b2 = e + (c ^ g & (a ^ c)) + d[6] + 2821735955 & 4294967295;
      e = g + (b2 << 17 & 4294967295 | b2 >>> 15);
      b2 = c + (a ^ e & (g ^ a)) + d[7] + 4249261313 & 4294967295;
      c = e + (b2 << 22 & 4294967295 | b2 >>> 10);
      b2 = a + (g ^ c & (e ^ g)) + d[8] + 1770035416 & 4294967295;
      a = c + (b2 << 7 & 4294967295 | b2 >>> 25);
      b2 = g + (e ^ a & (c ^ e)) + d[9] + 2336552879 & 4294967295;
      g = a + (b2 << 12 & 4294967295 | b2 >>> 20);
      b2 = e + (c ^ g & (a ^ c)) + d[10] + 4294925233 & 4294967295;
      e = g + (b2 << 17 & 4294967295 | b2 >>> 15);
      b2 = c + (a ^ e & (g ^ a)) + d[11] + 2304563134 & 4294967295;
      c = e + (b2 << 22 & 4294967295 | b2 >>> 10);
      b2 = a + (g ^ c & (e ^ g)) + d[12] + 1804603682 & 4294967295;
      a = c + (b2 << 7 & 4294967295 | b2 >>> 25);
      b2 = g + (e ^ a & (c ^ e)) + d[13] + 4254626195 & 4294967295;
      g = a + (b2 << 12 & 4294967295 | b2 >>> 20);
      b2 = e + (c ^ g & (a ^ c)) + d[14] + 2792965006 & 4294967295;
      e = g + (b2 << 17 & 4294967295 | b2 >>> 15);
      b2 = c + (a ^ e & (g ^ a)) + d[15] + 1236535329 & 4294967295;
      c = e + (b2 << 22 & 4294967295 | b2 >>> 10);
      b2 = a + (e ^ g & (c ^ e)) + d[1] + 4129170786 & 4294967295;
      a = c + (b2 << 5 & 4294967295 | b2 >>> 27);
      b2 = g + (c ^ e & (a ^ c)) + d[6] + 3225465664 & 4294967295;
      g = a + (b2 << 9 & 4294967295 | b2 >>> 23);
      b2 = e + (a ^ c & (g ^ a)) + d[11] + 643717713 & 4294967295;
      e = g + (b2 << 14 & 4294967295 | b2 >>> 18);
      b2 = c + (g ^ a & (e ^ g)) + d[0] + 3921069994 & 4294967295;
      c = e + (b2 << 20 & 4294967295 | b2 >>> 12);
      b2 = a + (e ^ g & (c ^ e)) + d[5] + 3593408605 & 4294967295;
      a = c + (b2 << 5 & 4294967295 | b2 >>> 27);
      b2 = g + (c ^ e & (a ^ c)) + d[10] + 38016083 & 4294967295;
      g = a + (b2 << 9 & 4294967295 | b2 >>> 23);
      b2 = e + (a ^ c & (g ^ a)) + d[15] + 3634488961 & 4294967295;
      e = g + (b2 << 14 & 4294967295 | b2 >>> 18);
      b2 = c + (g ^ a & (e ^ g)) + d[4] + 3889429448 & 4294967295;
      c = e + (b2 << 20 & 4294967295 | b2 >>> 12);
      b2 = a + (e ^ g & (c ^ e)) + d[9] + 568446438 & 4294967295;
      a = c + (b2 << 5 & 4294967295 | b2 >>> 27);
      b2 = g + (c ^ e & (a ^ c)) + d[14] + 3275163606 & 4294967295;
      g = a + (b2 << 9 & 4294967295 | b2 >>> 23);
      b2 = e + (a ^ c & (g ^ a)) + d[3] + 4107603335 & 4294967295;
      e = g + (b2 << 14 & 4294967295 | b2 >>> 18);
      b2 = c + (g ^ a & (e ^ g)) + d[8] + 1163531501 & 4294967295;
      c = e + (b2 << 20 & 4294967295 | b2 >>> 12);
      b2 = a + (e ^ g & (c ^ e)) + d[13] + 2850285829 & 4294967295;
      a = c + (b2 << 5 & 4294967295 | b2 >>> 27);
      b2 = g + (c ^ e & (a ^ c)) + d[2] + 4243563512 & 4294967295;
      g = a + (b2 << 9 & 4294967295 | b2 >>> 23);
      b2 = e + (a ^ c & (g ^ a)) + d[7] + 1735328473 & 4294967295;
      e = g + (b2 << 14 & 4294967295 | b2 >>> 18);
      b2 = c + (g ^ a & (e ^ g)) + d[12] + 2368359562 & 4294967295;
      c = e + (b2 << 20 & 4294967295 | b2 >>> 12);
      b2 = a + (c ^ e ^ g) + d[5] + 4294588738 & 4294967295;
      a = c + (b2 << 4 & 4294967295 | b2 >>> 28);
      b2 = g + (a ^ c ^ e) + d[8] + 2272392833 & 4294967295;
      g = a + (b2 << 11 & 4294967295 | b2 >>> 21);
      b2 = e + (g ^ a ^ c) + d[11] + 1839030562 & 4294967295;
      e = g + (b2 << 16 & 4294967295 | b2 >>> 16);
      b2 = c + (e ^ g ^ a) + d[14] + 4259657740 & 4294967295;
      c = e + (b2 << 23 & 4294967295 | b2 >>> 9);
      b2 = a + (c ^ e ^ g) + d[1] + 2763975236 & 4294967295;
      a = c + (b2 << 4 & 4294967295 | b2 >>> 28);
      b2 = g + (a ^ c ^ e) + d[4] + 1272893353 & 4294967295;
      g = a + (b2 << 11 & 4294967295 | b2 >>> 21);
      b2 = e + (g ^ a ^ c) + d[7] + 4139469664 & 4294967295;
      e = g + (b2 << 16 & 4294967295 | b2 >>> 16);
      b2 = c + (e ^ g ^ a) + d[10] + 3200236656 & 4294967295;
      c = e + (b2 << 23 & 4294967295 | b2 >>> 9);
      b2 = a + (c ^ e ^ g) + d[13] + 681279174 & 4294967295;
      a = c + (b2 << 4 & 4294967295 | b2 >>> 28);
      b2 = g + (a ^ c ^ e) + d[0] + 3936430074 & 4294967295;
      g = a + (b2 << 11 & 4294967295 | b2 >>> 21);
      b2 = e + (g ^ a ^ c) + d[3] + 3572445317 & 4294967295;
      e = g + (b2 << 16 & 4294967295 | b2 >>> 16);
      b2 = c + (e ^ g ^ a) + d[6] + 76029189 & 4294967295;
      c = e + (b2 << 23 & 4294967295 | b2 >>> 9);
      b2 = a + (c ^ e ^ g) + d[9] + 3654602809 & 4294967295;
      a = c + (b2 << 4 & 4294967295 | b2 >>> 28);
      b2 = g + (a ^ c ^ e) + d[12] + 3873151461 & 4294967295;
      g = a + (b2 << 11 & 4294967295 | b2 >>> 21);
      b2 = e + (g ^ a ^ c) + d[15] + 530742520 & 4294967295;
      e = g + (b2 << 16 & 4294967295 | b2 >>> 16);
      b2 = c + (e ^ g ^ a) + d[2] + 3299628645 & 4294967295;
      c = e + (b2 << 23 & 4294967295 | b2 >>> 9);
      b2 = a + (e ^ (c | ~g)) + d[0] + 4096336452 & 4294967295;
      a = c + (b2 << 6 & 4294967295 | b2 >>> 26);
      b2 = g + (c ^ (a | ~e)) + d[7] + 1126891415 & 4294967295;
      g = a + (b2 << 10 & 4294967295 | b2 >>> 22);
      b2 = e + (a ^ (g | ~c)) + d[14] + 2878612391 & 4294967295;
      e = g + (b2 << 15 & 4294967295 | b2 >>> 17);
      b2 = c + (g ^ (e | ~a)) + d[5] + 4237533241 & 4294967295;
      c = e + (b2 << 21 & 4294967295 | b2 >>> 11);
      b2 = a + (e ^ (c | ~g)) + d[12] + 1700485571 & 4294967295;
      a = c + (b2 << 6 & 4294967295 | b2 >>> 26);
      b2 = g + (c ^ (a | ~e)) + d[3] + 2399980690 & 4294967295;
      g = a + (b2 << 10 & 4294967295 | b2 >>> 22);
      b2 = e + (a ^ (g | ~c)) + d[10] + 4293915773 & 4294967295;
      e = g + (b2 << 15 & 4294967295 | b2 >>> 17);
      b2 = c + (g ^ (e | ~a)) + d[1] + 2240044497 & 4294967295;
      c = e + (b2 << 21 & 4294967295 | b2 >>> 11);
      b2 = a + (e ^ (c | ~g)) + d[8] + 1873313359 & 4294967295;
      a = c + (b2 << 6 & 4294967295 | b2 >>> 26);
      b2 = g + (c ^ (a | ~e)) + d[15] + 4264355552 & 4294967295;
      g = a + (b2 << 10 & 4294967295 | b2 >>> 22);
      b2 = e + (a ^ (g | ~c)) + d[6] + 2734768916 & 4294967295;
      e = g + (b2 << 15 & 4294967295 | b2 >>> 17);
      b2 = c + (g ^ (e | ~a)) + d[13] + 1309151649 & 4294967295;
      c = e + (b2 << 21 & 4294967295 | b2 >>> 11);
      b2 = a + (e ^ (c | ~g)) + d[4] + 4149444226 & 4294967295;
      a = c + (b2 << 6 & 4294967295 | b2 >>> 26);
      b2 = g + (c ^ (a | ~e)) + d[11] + 3174756917 & 4294967295;
      g = a + (b2 << 10 & 4294967295 | b2 >>> 22);
      b2 = e + (a ^ (g | ~c)) + d[2] + 718787259 & 4294967295;
      e = g + (b2 << 15 & 4294967295 | b2 >>> 17);
      b2 = c + (g ^ (e | ~a)) + d[9] + 3951481745 & 4294967295;
      f.g[0] = f.g[0] + a & 4294967295;
      f.g[1] = f.g[1] + (e + (b2 << 21 & 4294967295 | b2 >>> 11)) & 4294967295;
      f.g[2] = f.g[2] + e & 4294967295;
      f.g[3] = f.g[3] + g & 4294967295;
    }
    m.prototype.u = function(f, a) {
      void 0 === a && (a = f.length);
      for (var c = a - this.blockSize, d = this.B, e = this.h, g = 0; g < a; ) {
        if (0 == e) for (; g <= c; ) n(this, f, g), g += this.blockSize;
        if ("string" === typeof f) for (; g < a; ) {
          if (d[e++] = f.charCodeAt(g++), e == this.blockSize) {
            n(this, d);
            e = 0;
            break;
          }
        }
        else for (; g < a; ) if (d[e++] = f[g++], e == this.blockSize) {
          n(this, d);
          e = 0;
          break;
        }
      }
      this.h = e;
      this.o += a;
    };
    m.prototype.v = function() {
      var f = Array((56 > this.h ? this.blockSize : 2 * this.blockSize) - this.h);
      f[0] = 128;
      for (var a = 1; a < f.length - 8; ++a) f[a] = 0;
      var c = 8 * this.o;
      for (a = f.length - 8; a < f.length; ++a) f[a] = c & 255, c /= 256;
      this.u(f);
      f = Array(16);
      for (a = c = 0; 4 > a; ++a) for (var d = 0; 32 > d; d += 8) f[c++] = this.g[a] >>> d & 255;
      return f;
    };
    function p(f, a) {
      var c = q;
      return Object.prototype.hasOwnProperty.call(c, f) ? c[f] : c[f] = a(f);
    }
    function t(f, a) {
      this.h = a;
      for (var c = [], d = true, e = f.length - 1; 0 <= e; e--) {
        var g = f[e] | 0;
        d && g == a || (c[e] = g, d = false);
      }
      this.g = c;
    }
    var q = {};
    function u(f) {
      return -128 <= f && 128 > f ? p(f, function(a) {
        return new t([a | 0], 0 > a ? -1 : 0);
      }) : new t([f | 0], 0 > f ? -1 : 0);
    }
    function v2(f) {
      if (isNaN(f) || !isFinite(f)) return w2;
      if (0 > f) return x(v2(-f));
      for (var a = [], c = 1, d = 0; f >= c; d++) a[d] = f / c | 0, c *= 4294967296;
      return new t(a, 0);
    }
    function y(f, a) {
      if (0 == f.length) throw Error("number format error: empty string");
      a = a || 10;
      if (2 > a || 36 < a) throw Error("radix out of range: " + a);
      if ("-" == f.charAt(0)) return x(y(f.substring(1), a));
      if (0 <= f.indexOf("-")) throw Error('number format error: interior "-" character');
      for (var c = v2(Math.pow(a, 8)), d = w2, e = 0; e < f.length; e += 8) {
        var g = Math.min(8, f.length - e), b2 = parseInt(f.substring(e, e + g), a);
        8 > g ? (g = v2(Math.pow(a, g)), d = d.j(g).add(v2(b2))) : (d = d.j(c), d = d.add(v2(b2)));
      }
      return d;
    }
    var w2 = u(0), z = u(1), A = u(16777216);
    h = t.prototype;
    h.m = function() {
      if (B(this)) return -x(this).m();
      for (var f = 0, a = 1, c = 0; c < this.g.length; c++) {
        var d = this.i(c);
        f += (0 <= d ? d : 4294967296 + d) * a;
        a *= 4294967296;
      }
      return f;
    };
    h.toString = function(f) {
      f = f || 10;
      if (2 > f || 36 < f) throw Error("radix out of range: " + f);
      if (C2(this)) return "0";
      if (B(this)) return "-" + x(this).toString(f);
      for (var a = v2(Math.pow(f, 6)), c = this, d = ""; ; ) {
        var e = D2(c, a).g;
        c = F(c, e.j(a));
        var g = ((0 < c.g.length ? c.g[0] : c.h) >>> 0).toString(f);
        c = e;
        if (C2(c)) return g + d;
        for (; 6 > g.length; ) g = "0" + g;
        d = g + d;
      }
    };
    h.i = function(f) {
      return 0 > f ? 0 : f < this.g.length ? this.g[f] : this.h;
    };
    function C2(f) {
      if (0 != f.h) return false;
      for (var a = 0; a < f.g.length; a++) if (0 != f.g[a]) return false;
      return true;
    }
    function B(f) {
      return -1 == f.h;
    }
    h.l = function(f) {
      f = F(this, f);
      return B(f) ? -1 : C2(f) ? 0 : 1;
    };
    function x(f) {
      for (var a = f.g.length, c = [], d = 0; d < a; d++) c[d] = ~f.g[d];
      return new t(c, ~f.h).add(z);
    }
    h.abs = function() {
      return B(this) ? x(this) : this;
    };
    h.add = function(f) {
      for (var a = Math.max(this.g.length, f.g.length), c = [], d = 0, e = 0; e <= a; e++) {
        var g = d + (this.i(e) & 65535) + (f.i(e) & 65535), b2 = (g >>> 16) + (this.i(e) >>> 16) + (f.i(e) >>> 16);
        d = b2 >>> 16;
        g &= 65535;
        b2 &= 65535;
        c[e] = b2 << 16 | g;
      }
      return new t(c, c[c.length - 1] & -2147483648 ? -1 : 0);
    };
    function F(f, a) {
      return f.add(x(a));
    }
    h.j = function(f) {
      if (C2(this) || C2(f)) return w2;
      if (B(this)) return B(f) ? x(this).j(x(f)) : x(x(this).j(f));
      if (B(f)) return x(this.j(x(f)));
      if (0 > this.l(A) && 0 > f.l(A)) return v2(this.m() * f.m());
      for (var a = this.g.length + f.g.length, c = [], d = 0; d < 2 * a; d++) c[d] = 0;
      for (d = 0; d < this.g.length; d++) for (var e = 0; e < f.g.length; e++) {
        var g = this.i(d) >>> 16, b2 = this.i(d) & 65535, r = f.i(e) >>> 16, E = f.i(e) & 65535;
        c[2 * d + 2 * e] += b2 * E;
        G(c, 2 * d + 2 * e);
        c[2 * d + 2 * e + 1] += g * E;
        G(c, 2 * d + 2 * e + 1);
        c[2 * d + 2 * e + 1] += b2 * r;
        G(c, 2 * d + 2 * e + 1);
        c[2 * d + 2 * e + 2] += g * r;
        G(c, 2 * d + 2 * e + 2);
      }
      for (d = 0; d < a; d++) c[d] = c[2 * d + 1] << 16 | c[2 * d];
      for (d = a; d < 2 * a; d++) c[d] = 0;
      return new t(c, 0);
    };
    function G(f, a) {
      for (; (f[a] & 65535) != f[a]; ) f[a + 1] += f[a] >>> 16, f[a] &= 65535, a++;
    }
    function H2(f, a) {
      this.g = f;
      this.h = a;
    }
    function D2(f, a) {
      if (C2(a)) throw Error("division by zero");
      if (C2(f)) return new H2(w2, w2);
      if (B(f)) return a = D2(x(f), a), new H2(x(a.g), x(a.h));
      if (B(a)) return a = D2(f, x(a)), new H2(x(a.g), a.h);
      if (30 < f.g.length) {
        if (B(f) || B(a)) throw Error("slowDivide_ only works with positive integers.");
        for (var c = z, d = a; 0 >= d.l(f); ) c = I(c), d = I(d);
        var e = J2(c, 1), g = J2(d, 1);
        d = J2(d, 2);
        for (c = J2(c, 2); !C2(d); ) {
          var b2 = g.add(d);
          0 >= b2.l(f) && (e = e.add(c), g = b2);
          d = J2(d, 1);
          c = J2(c, 1);
        }
        a = F(f, e.j(a));
        return new H2(e, a);
      }
      for (e = w2; 0 <= f.l(a); ) {
        c = Math.max(1, Math.floor(f.m() / a.m()));
        d = Math.ceil(Math.log(c) / Math.LN2);
        d = 48 >= d ? 1 : Math.pow(2, d - 48);
        g = v2(c);
        for (b2 = g.j(a); B(b2) || 0 < b2.l(f); ) c -= d, g = v2(c), b2 = g.j(a);
        C2(g) && (g = z);
        e = e.add(g);
        f = F(f, b2);
      }
      return new H2(e, f);
    }
    h.A = function(f) {
      return D2(this, f).h;
    };
    h.and = function(f) {
      for (var a = Math.max(this.g.length, f.g.length), c = [], d = 0; d < a; d++) c[d] = this.i(d) & f.i(d);
      return new t(c, this.h & f.h);
    };
    h.or = function(f) {
      for (var a = Math.max(this.g.length, f.g.length), c = [], d = 0; d < a; d++) c[d] = this.i(d) | f.i(d);
      return new t(c, this.h | f.h);
    };
    h.xor = function(f) {
      for (var a = Math.max(this.g.length, f.g.length), c = [], d = 0; d < a; d++) c[d] = this.i(d) ^ f.i(d);
      return new t(c, this.h ^ f.h);
    };
    function I(f) {
      for (var a = f.g.length + 1, c = [], d = 0; d < a; d++) c[d] = f.i(d) << 1 | f.i(d - 1) >>> 31;
      return new t(c, f.h);
    }
    function J2(f, a) {
      var c = a >> 5;
      a %= 32;
      for (var d = f.g.length - c, e = [], g = 0; g < d; g++) e[g] = 0 < a ? f.i(g + c) >>> a | f.i(g + c + 1) << 32 - a : f.i(g + c);
      return new t(e, f.h);
    }
    m.prototype.digest = m.prototype.v;
    m.prototype.reset = m.prototype.s;
    m.prototype.update = m.prototype.u;
    Md5 = bloom_blob_es2018.Md5 = m;
    t.prototype.add = t.prototype.add;
    t.prototype.multiply = t.prototype.j;
    t.prototype.modulo = t.prototype.A;
    t.prototype.compare = t.prototype.l;
    t.prototype.toNumber = t.prototype.m;
    t.prototype.toString = t.prototype.toString;
    t.prototype.getBits = t.prototype.i;
    t.fromNumber = v2;
    t.fromString = y;
    Integer = bloom_blob_es2018.Integer = t;
  }).apply(typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});

  // node_modules/@firebase/webchannel-wrapper/dist/webchannel-blob/esm/webchannel_blob_es2018.js
  var commonjsGlobal2 = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  var webchannel_blob_es2018 = {};
  var XhrIo;
  var FetchXmlHttpFactory;
  var WebChannel;
  var EventType;
  var ErrorCode;
  var Stat;
  var Event;
  var getStatEventTarget;
  var createWebChannelTransport;
  (function() {
    var h, aa = "function" == typeof Object.defineProperties ? Object.defineProperty : function(a, b2, c) {
      if (a == Array.prototype || a == Object.prototype) return a;
      a[b2] = c.value;
      return a;
    };
    function ba(a) {
      a = ["object" == typeof globalThis && globalThis, a, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof commonjsGlobal2 && commonjsGlobal2];
      for (var b2 = 0; b2 < a.length; ++b2) {
        var c = a[b2];
        if (c && c.Math == Math) return c;
      }
      throw Error("Cannot find global object");
    }
    var ca = ba(this);
    function da(a, b2) {
      if (b2) a: {
        var c = ca;
        a = a.split(".");
        for (var d = 0; d < a.length - 1; d++) {
          var e = a[d];
          if (!(e in c)) break a;
          c = c[e];
        }
        a = a[a.length - 1];
        d = c[a];
        b2 = b2(d);
        b2 != d && null != b2 && aa(c, a, { configurable: true, writable: true, value: b2 });
      }
    }
    function ea(a, b2) {
      a instanceof String && (a += "");
      var c = 0, d = false, e = { next: function() {
        if (!d && c < a.length) {
          var f = c++;
          return { value: b2(f, a[f]), done: false };
        }
        d = true;
        return { done: true, value: void 0 };
      } };
      e[Symbol.iterator] = function() {
        return e;
      };
      return e;
    }
    da("Array.prototype.values", function(a) {
      return a ? a : function() {
        return ea(this, function(b2, c) {
          return c;
        });
      };
    });
    var fa = fa || {}, k = this || self;
    function ha(a) {
      var b2 = typeof a;
      b2 = "object" != b2 ? b2 : a ? Array.isArray(a) ? "array" : b2 : "null";
      return "array" == b2 || "object" == b2 && "number" == typeof a.length;
    }
    function n(a) {
      var b2 = typeof a;
      return "object" == b2 && null != a || "function" == b2;
    }
    function ia(a, b2, c) {
      return a.call.apply(a.bind, arguments);
    }
    function ja(a, b2, c) {
      if (!a) throw Error();
      if (2 < arguments.length) {
        var d = Array.prototype.slice.call(arguments, 2);
        return function() {
          var e = Array.prototype.slice.call(arguments);
          Array.prototype.unshift.apply(e, d);
          return a.apply(b2, e);
        };
      }
      return function() {
        return a.apply(b2, arguments);
      };
    }
    function p(a, b2, c) {
      p = Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? ia : ja;
      return p.apply(null, arguments);
    }
    function ka(a, b2) {
      var c = Array.prototype.slice.call(arguments, 1);
      return function() {
        var d = c.slice();
        d.push.apply(d, arguments);
        return a.apply(this, d);
      };
    }
    function r(a, b2) {
      function c() {
      }
      c.prototype = b2.prototype;
      a.aa = b2.prototype;
      a.prototype = new c();
      a.prototype.constructor = a;
      a.Qb = function(d, e, f) {
        for (var g = Array(arguments.length - 2), m = 2; m < arguments.length; m++) g[m - 2] = arguments[m];
        return b2.prototype[e].apply(d, g);
      };
    }
    function la(a) {
      const b2 = a.length;
      if (0 < b2) {
        const c = Array(b2);
        for (let d = 0; d < b2; d++) c[d] = a[d];
        return c;
      }
      return [];
    }
    function ma(a, b2) {
      for (let c = 1; c < arguments.length; c++) {
        const d = arguments[c];
        if (ha(d)) {
          const e = a.length || 0, f = d.length || 0;
          a.length = e + f;
          for (let g = 0; g < f; g++) a[e + g] = d[g];
        } else a.push(d);
      }
    }
    class na {
      constructor(a, b2) {
        this.i = a;
        this.j = b2;
        this.h = 0;
        this.g = null;
      }
      get() {
        let a;
        0 < this.h ? (this.h--, a = this.g, this.g = a.next, a.next = null) : a = this.i();
        return a;
      }
    }
    function t(a) {
      return /^[\s\xa0]*$/.test(a);
    }
    function u() {
      var a = k.navigator;
      return a && (a = a.userAgent) ? a : "";
    }
    function oa(a) {
      oa[" "](a);
      return a;
    }
    oa[" "] = function() {
    };
    var pa = -1 != u().indexOf("Gecko") && !(-1 != u().toLowerCase().indexOf("webkit") && -1 == u().indexOf("Edge")) && !(-1 != u().indexOf("Trident") || -1 != u().indexOf("MSIE")) && -1 == u().indexOf("Edge");
    function qa(a, b2, c) {
      for (const d in a) b2.call(c, a[d], d, a);
    }
    function ra(a, b2) {
      for (const c in a) b2.call(void 0, a[c], c, a);
    }
    function sa(a) {
      const b2 = {};
      for (const c in a) b2[c] = a[c];
      return b2;
    }
    const ta = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
    function ua(a, b2) {
      let c, d;
      for (let e = 1; e < arguments.length; e++) {
        d = arguments[e];
        for (c in d) a[c] = d[c];
        for (let f = 0; f < ta.length; f++) c = ta[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c]);
      }
    }
    function va(a) {
      var b2 = 1;
      a = a.split(":");
      const c = [];
      for (; 0 < b2 && a.length; ) c.push(a.shift()), b2--;
      a.length && c.push(a.join(":"));
      return c;
    }
    function wa(a) {
      k.setTimeout(() => {
        throw a;
      }, 0);
    }
    function xa() {
      var a = za;
      let b2 = null;
      a.g && (b2 = a.g, a.g = a.g.next, a.g || (a.h = null), b2.next = null);
      return b2;
    }
    class Aa {
      constructor() {
        this.h = this.g = null;
      }
      add(a, b2) {
        const c = Ba.get();
        c.set(a, b2);
        this.h ? this.h.next = c : this.g = c;
        this.h = c;
      }
    }
    var Ba = new na(() => new Ca(), (a) => a.reset());
    class Ca {
      constructor() {
        this.next = this.g = this.h = null;
      }
      set(a, b2) {
        this.h = a;
        this.g = b2;
        this.next = null;
      }
      reset() {
        this.next = this.g = this.h = null;
      }
    }
    let x, y = false, za = new Aa(), Ea = () => {
      const a = k.Promise.resolve(void 0);
      x = () => {
        a.then(Da);
      };
    };
    var Da = () => {
      for (var a; a = xa(); ) {
        try {
          a.h.call(a.g);
        } catch (c) {
          wa(c);
        }
        var b2 = Ba;
        b2.j(a);
        100 > b2.h && (b2.h++, a.next = b2.g, b2.g = a);
      }
      y = false;
    };
    function z() {
      this.s = this.s;
      this.C = this.C;
    }
    z.prototype.s = false;
    z.prototype.ma = function() {
      this.s || (this.s = true, this.N());
    };
    z.prototype.N = function() {
      if (this.C) for (; this.C.length; ) this.C.shift()();
    };
    function A(a, b2) {
      this.type = a;
      this.g = this.target = b2;
      this.defaultPrevented = false;
    }
    A.prototype.h = function() {
      this.defaultPrevented = true;
    };
    var Fa = function() {
      if (!k.addEventListener || !Object.defineProperty) return false;
      var a = false, b2 = Object.defineProperty({}, "passive", { get: function() {
        a = true;
      } });
      try {
        const c = () => {
        };
        k.addEventListener("test", c, b2);
        k.removeEventListener("test", c, b2);
      } catch (c) {
      }
      return a;
    }();
    function C2(a, b2) {
      A.call(this, a ? a.type : "");
      this.relatedTarget = this.g = this.target = null;
      this.button = this.screenY = this.screenX = this.clientY = this.clientX = 0;
      this.key = "";
      this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = false;
      this.state = null;
      this.pointerId = 0;
      this.pointerType = "";
      this.i = null;
      if (a) {
        var c = this.type = a.type, d = a.changedTouches && a.changedTouches.length ? a.changedTouches[0] : null;
        this.target = a.target || a.srcElement;
        this.g = b2;
        if (b2 = a.relatedTarget) {
          if (pa) {
            a: {
              try {
                oa(b2.nodeName);
                var e = true;
                break a;
              } catch (f) {
              }
              e = false;
            }
            e || (b2 = null);
          }
        } else "mouseover" == c ? b2 = a.fromElement : "mouseout" == c && (b2 = a.toElement);
        this.relatedTarget = b2;
        d ? (this.clientX = void 0 !== d.clientX ? d.clientX : d.pageX, this.clientY = void 0 !== d.clientY ? d.clientY : d.pageY, this.screenX = d.screenX || 0, this.screenY = d.screenY || 0) : (this.clientX = void 0 !== a.clientX ? a.clientX : a.pageX, this.clientY = void 0 !== a.clientY ? a.clientY : a.pageY, this.screenX = a.screenX || 0, this.screenY = a.screenY || 0);
        this.button = a.button;
        this.key = a.key || "";
        this.ctrlKey = a.ctrlKey;
        this.altKey = a.altKey;
        this.shiftKey = a.shiftKey;
        this.metaKey = a.metaKey;
        this.pointerId = a.pointerId || 0;
        this.pointerType = "string" === typeof a.pointerType ? a.pointerType : Ga[a.pointerType] || "";
        this.state = a.state;
        this.i = a;
        a.defaultPrevented && C2.aa.h.call(this);
      }
    }
    r(C2, A);
    var Ga = { 2: "touch", 3: "pen", 4: "mouse" };
    C2.prototype.h = function() {
      C2.aa.h.call(this);
      var a = this.i;
      a.preventDefault ? a.preventDefault() : a.returnValue = false;
    };
    var D2 = "closure_listenable_" + (1e6 * Math.random() | 0);
    var Ha = 0;
    function Ia(a, b2, c, d, e) {
      this.listener = a;
      this.proxy = null;
      this.src = b2;
      this.type = c;
      this.capture = !!d;
      this.ha = e;
      this.key = ++Ha;
      this.da = this.fa = false;
    }
    function Ja(a) {
      a.da = true;
      a.listener = null;
      a.proxy = null;
      a.src = null;
      a.ha = null;
    }
    function Ka(a) {
      this.src = a;
      this.g = {};
      this.h = 0;
    }
    Ka.prototype.add = function(a, b2, c, d, e) {
      var f = a.toString();
      a = this.g[f];
      a || (a = this.g[f] = [], this.h++);
      var g = La(a, b2, d, e);
      -1 < g ? (b2 = a[g], c || (b2.fa = false)) : (b2 = new Ia(b2, this.src, f, !!d, e), b2.fa = c, a.push(b2));
      return b2;
    };
    function Ma(a, b2) {
      var c = b2.type;
      if (c in a.g) {
        var d = a.g[c], e = Array.prototype.indexOf.call(d, b2, void 0), f;
        (f = 0 <= e) && Array.prototype.splice.call(d, e, 1);
        f && (Ja(b2), 0 == a.g[c].length && (delete a.g[c], a.h--));
      }
    }
    function La(a, b2, c, d) {
      for (var e = 0; e < a.length; ++e) {
        var f = a[e];
        if (!f.da && f.listener == b2 && f.capture == !!c && f.ha == d) return e;
      }
      return -1;
    }
    var Na = "closure_lm_" + (1e6 * Math.random() | 0), Oa = {};
    function Qa(a, b2, c, d, e) {
      if (d && d.once) return Ra(a, b2, c, d, e);
      if (Array.isArray(b2)) {
        for (var f = 0; f < b2.length; f++) Qa(a, b2[f], c, d, e);
        return null;
      }
      c = Sa(c);
      return a && a[D2] ? a.K(b2, c, n(d) ? !!d.capture : !!d, e) : Ta(a, b2, c, false, d, e);
    }
    function Ta(a, b2, c, d, e, f) {
      if (!b2) throw Error("Invalid event type");
      var g = n(e) ? !!e.capture : !!e, m = Ua(a);
      m || (a[Na] = m = new Ka(a));
      c = m.add(b2, c, d, g, f);
      if (c.proxy) return c;
      d = Va();
      c.proxy = d;
      d.src = a;
      d.listener = c;
      if (a.addEventListener) Fa || (e = g), void 0 === e && (e = false), a.addEventListener(b2.toString(), d, e);
      else if (a.attachEvent) a.attachEvent(Wa(b2.toString()), d);
      else if (a.addListener && a.removeListener) a.addListener(d);
      else throw Error("addEventListener and attachEvent are unavailable.");
      return c;
    }
    function Va() {
      function a(c) {
        return b2.call(a.src, a.listener, c);
      }
      const b2 = Xa;
      return a;
    }
    function Ra(a, b2, c, d, e) {
      if (Array.isArray(b2)) {
        for (var f = 0; f < b2.length; f++) Ra(a, b2[f], c, d, e);
        return null;
      }
      c = Sa(c);
      return a && a[D2] ? a.L(b2, c, n(d) ? !!d.capture : !!d, e) : Ta(a, b2, c, true, d, e);
    }
    function Ya(a, b2, c, d, e) {
      if (Array.isArray(b2)) for (var f = 0; f < b2.length; f++) Ya(a, b2[f], c, d, e);
      else (d = n(d) ? !!d.capture : !!d, c = Sa(c), a && a[D2]) ? (a = a.i, b2 = String(b2).toString(), b2 in a.g && (f = a.g[b2], c = La(f, c, d, e), -1 < c && (Ja(f[c]), Array.prototype.splice.call(f, c, 1), 0 == f.length && (delete a.g[b2], a.h--)))) : a && (a = Ua(a)) && (b2 = a.g[b2.toString()], a = -1, b2 && (a = La(b2, c, d, e)), (c = -1 < a ? b2[a] : null) && Za(c));
    }
    function Za(a) {
      if ("number" !== typeof a && a && !a.da) {
        var b2 = a.src;
        if (b2 && b2[D2]) Ma(b2.i, a);
        else {
          var c = a.type, d = a.proxy;
          b2.removeEventListener ? b2.removeEventListener(c, d, a.capture) : b2.detachEvent ? b2.detachEvent(Wa(c), d) : b2.addListener && b2.removeListener && b2.removeListener(d);
          (c = Ua(b2)) ? (Ma(c, a), 0 == c.h && (c.src = null, b2[Na] = null)) : Ja(a);
        }
      }
    }
    function Wa(a) {
      return a in Oa ? Oa[a] : Oa[a] = "on" + a;
    }
    function Xa(a, b2) {
      if (a.da) a = true;
      else {
        b2 = new C2(b2, this);
        var c = a.listener, d = a.ha || a.src;
        a.fa && Za(a);
        a = c.call(d, b2);
      }
      return a;
    }
    function Ua(a) {
      a = a[Na];
      return a instanceof Ka ? a : null;
    }
    var $a = "__closure_events_fn_" + (1e9 * Math.random() >>> 0);
    function Sa(a) {
      if ("function" === typeof a) return a;
      a[$a] || (a[$a] = function(b2) {
        return a.handleEvent(b2);
      });
      return a[$a];
    }
    function E() {
      z.call(this);
      this.i = new Ka(this);
      this.M = this;
      this.F = null;
    }
    r(E, z);
    E.prototype[D2] = true;
    E.prototype.removeEventListener = function(a, b2, c, d) {
      Ya(this, a, b2, c, d);
    };
    function F(a, b2) {
      var c, d = a.F;
      if (d) for (c = []; d; d = d.F) c.push(d);
      a = a.M;
      d = b2.type || b2;
      if ("string" === typeof b2) b2 = new A(b2, a);
      else if (b2 instanceof A) b2.target = b2.target || a;
      else {
        var e = b2;
        b2 = new A(d, a);
        ua(b2, e);
      }
      e = true;
      if (c) for (var f = c.length - 1; 0 <= f; f--) {
        var g = b2.g = c[f];
        e = ab(g, d, true, b2) && e;
      }
      g = b2.g = a;
      e = ab(g, d, true, b2) && e;
      e = ab(g, d, false, b2) && e;
      if (c) for (f = 0; f < c.length; f++) g = b2.g = c[f], e = ab(g, d, false, b2) && e;
    }
    E.prototype.N = function() {
      E.aa.N.call(this);
      if (this.i) {
        var a = this.i, c;
        for (c in a.g) {
          for (var d = a.g[c], e = 0; e < d.length; e++) Ja(d[e]);
          delete a.g[c];
          a.h--;
        }
      }
      this.F = null;
    };
    E.prototype.K = function(a, b2, c, d) {
      return this.i.add(String(a), b2, false, c, d);
    };
    E.prototype.L = function(a, b2, c, d) {
      return this.i.add(String(a), b2, true, c, d);
    };
    function ab(a, b2, c, d) {
      b2 = a.i.g[String(b2)];
      if (!b2) return true;
      b2 = b2.concat();
      for (var e = true, f = 0; f < b2.length; ++f) {
        var g = b2[f];
        if (g && !g.da && g.capture == c) {
          var m = g.listener, q = g.ha || g.src;
          g.fa && Ma(a.i, g);
          e = false !== m.call(q, d) && e;
        }
      }
      return e && !d.defaultPrevented;
    }
    function bb(a, b2, c) {
      if ("function" === typeof a) c && (a = p(a, c));
      else if (a && "function" == typeof a.handleEvent) a = p(a.handleEvent, a);
      else throw Error("Invalid listener argument");
      return 2147483647 < Number(b2) ? -1 : k.setTimeout(a, b2 || 0);
    }
    function cb(a) {
      a.g = bb(() => {
        a.g = null;
        a.i && (a.i = false, cb(a));
      }, a.l);
      const b2 = a.h;
      a.h = null;
      a.m.apply(null, b2);
    }
    class eb extends z {
      constructor(a, b2) {
        super();
        this.m = a;
        this.l = b2;
        this.h = null;
        this.i = false;
        this.g = null;
      }
      j(a) {
        this.h = arguments;
        this.g ? this.i = true : cb(this);
      }
      N() {
        super.N();
        this.g && (k.clearTimeout(this.g), this.g = null, this.i = false, this.h = null);
      }
    }
    function G(a) {
      z.call(this);
      this.h = a;
      this.g = {};
    }
    r(G, z);
    var fb = [];
    function gb(a) {
      qa(a.g, function(b2, c) {
        this.g.hasOwnProperty(c) && Za(b2);
      }, a);
      a.g = {};
    }
    G.prototype.N = function() {
      G.aa.N.call(this);
      gb(this);
    };
    G.prototype.handleEvent = function() {
      throw Error("EventHandler.handleEvent not implemented");
    };
    var hb = k.JSON.stringify;
    var ib = k.JSON.parse;
    var jb = class {
      stringify(a) {
        return k.JSON.stringify(a, void 0);
      }
      parse(a) {
        return k.JSON.parse(a, void 0);
      }
    };
    function kb() {
    }
    kb.prototype.h = null;
    function lb(a) {
      return a.h || (a.h = a.i());
    }
    function mb() {
    }
    var H2 = { OPEN: "a", kb: "b", Ja: "c", wb: "d" };
    function nb() {
      A.call(this, "d");
    }
    r(nb, A);
    function ob() {
      A.call(this, "c");
    }
    r(ob, A);
    var I = {}, pb = null;
    function qb() {
      return pb = pb || new E();
    }
    I.La = "serverreachability";
    function rb(a) {
      A.call(this, I.La, a);
    }
    r(rb, A);
    function J2(a) {
      const b2 = qb();
      F(b2, new rb(b2));
    }
    I.STAT_EVENT = "statevent";
    function sb(a, b2) {
      A.call(this, I.STAT_EVENT, a);
      this.stat = b2;
    }
    r(sb, A);
    function K(a) {
      const b2 = qb();
      F(b2, new sb(b2, a));
    }
    I.Ma = "timingevent";
    function tb(a, b2) {
      A.call(this, I.Ma, a);
      this.size = b2;
    }
    r(tb, A);
    function ub(a, b2) {
      if ("function" !== typeof a) throw Error("Fn must not be null and must be a function");
      return k.setTimeout(function() {
        a();
      }, b2);
    }
    function vb() {
      this.g = true;
    }
    vb.prototype.xa = function() {
      this.g = false;
    };
    function wb(a, b2, c, d, e, f) {
      a.info(function() {
        if (a.g) if (f) {
          var g = "";
          for (var m = f.split("&"), q = 0; q < m.length; q++) {
            var l = m[q].split("=");
            if (1 < l.length) {
              var v2 = l[0];
              l = l[1];
              var w2 = v2.split("_");
              g = 2 <= w2.length && "type" == w2[1] ? g + (v2 + "=" + l + "&") : g + (v2 + "=redacted&");
            }
          }
        } else g = null;
        else g = f;
        return "XMLHTTP REQ (" + d + ") [attempt " + e + "]: " + b2 + "\n" + c + "\n" + g;
      });
    }
    function xb(a, b2, c, d, e, f, g) {
      a.info(function() {
        return "XMLHTTP RESP (" + d + ") [ attempt " + e + "]: " + b2 + "\n" + c + "\n" + f + " " + g;
      });
    }
    function L(a, b2, c, d) {
      a.info(function() {
        return "XMLHTTP TEXT (" + b2 + "): " + yb(a, c) + (d ? " " + d : "");
      });
    }
    function zb(a, b2) {
      a.info(function() {
        return "TIMEOUT: " + b2;
      });
    }
    vb.prototype.info = function() {
    };
    function yb(a, b2) {
      if (!a.g) return b2;
      if (!b2) return null;
      try {
        var c = JSON.parse(b2);
        if (c) {
          for (a = 0; a < c.length; a++) if (Array.isArray(c[a])) {
            var d = c[a];
            if (!(2 > d.length)) {
              var e = d[1];
              if (Array.isArray(e) && !(1 > e.length)) {
                var f = e[0];
                if ("noop" != f && "stop" != f && "close" != f) for (var g = 1; g < e.length; g++) e[g] = "";
              }
            }
          }
        }
        return hb(c);
      } catch (m) {
        return b2;
      }
    }
    var Ab = { NO_ERROR: 0, gb: 1, tb: 2, sb: 3, nb: 4, rb: 5, ub: 6, Ia: 7, TIMEOUT: 8, xb: 9 };
    var Bb = { lb: "complete", Hb: "success", Ja: "error", Ia: "abort", zb: "ready", Ab: "readystatechange", TIMEOUT: "timeout", vb: "incrementaldata", yb: "progress", ob: "downloadprogress", Pb: "uploadprogress" };
    var Cb;
    function Db() {
    }
    r(Db, kb);
    Db.prototype.g = function() {
      return new XMLHttpRequest();
    };
    Db.prototype.i = function() {
      return {};
    };
    Cb = new Db();
    function M(a, b2, c, d) {
      this.j = a;
      this.i = b2;
      this.l = c;
      this.R = d || 1;
      this.U = new G(this);
      this.I = 45e3;
      this.H = null;
      this.o = false;
      this.m = this.A = this.v = this.L = this.F = this.S = this.B = null;
      this.D = [];
      this.g = null;
      this.C = 0;
      this.s = this.u = null;
      this.X = -1;
      this.J = false;
      this.O = 0;
      this.M = null;
      this.W = this.K = this.T = this.P = false;
      this.h = new Eb();
    }
    function Eb() {
      this.i = null;
      this.g = "";
      this.h = false;
    }
    var Fb = {}, Gb = {};
    function Hb(a, b2, c) {
      a.L = 1;
      a.v = Ib(N(b2));
      a.m = c;
      a.P = true;
      Jb(a, null);
    }
    function Jb(a, b2) {
      a.F = Date.now();
      Kb(a);
      a.A = N(a.v);
      var c = a.A, d = a.R;
      Array.isArray(d) || (d = [String(d)]);
      Lb(c.i, "t", d);
      a.C = 0;
      c = a.j.J;
      a.h = new Eb();
      a.g = Mb(a.j, c ? b2 : null, !a.m);
      0 < a.O && (a.M = new eb(p(a.Y, a, a.g), a.O));
      b2 = a.U;
      c = a.g;
      d = a.ca;
      var e = "readystatechange";
      Array.isArray(e) || (e && (fb[0] = e.toString()), e = fb);
      for (var f = 0; f < e.length; f++) {
        var g = Qa(c, e[f], d || b2.handleEvent, false, b2.h || b2);
        if (!g) break;
        b2.g[g.key] = g;
      }
      b2 = a.H ? sa(a.H) : {};
      a.m ? (a.u || (a.u = "POST"), b2["Content-Type"] = "application/x-www-form-urlencoded", a.g.ea(
        a.A,
        a.u,
        a.m,
        b2
      )) : (a.u = "GET", a.g.ea(a.A, a.u, null, b2));
      J2();
      wb(a.i, a.u, a.A, a.l, a.R, a.m);
    }
    M.prototype.ca = function(a) {
      a = a.target;
      const b2 = this.M;
      b2 && 3 == P(a) ? b2.j() : this.Y(a);
    };
    M.prototype.Y = function(a) {
      try {
        if (a == this.g) a: {
          const w2 = P(this.g);
          var b2 = this.g.Ba();
          const O = this.g.Z();
          if (!(3 > w2) && (3 != w2 || this.g && (this.h.h || this.g.oa() || Nb(this.g)))) {
            this.J || 4 != w2 || 7 == b2 || (8 == b2 || 0 >= O ? J2(3) : J2(2));
            Ob(this);
            var c = this.g.Z();
            this.X = c;
            b: if (Pb(this)) {
              var d = Nb(this.g);
              a = "";
              var e = d.length, f = 4 == P(this.g);
              if (!this.h.i) {
                if ("undefined" === typeof TextDecoder) {
                  Q(this);
                  Qb(this);
                  var g = "";
                  break b;
                }
                this.h.i = new k.TextDecoder();
              }
              for (b2 = 0; b2 < e; b2++) this.h.h = true, a += this.h.i.decode(d[b2], { stream: !(f && b2 == e - 1) });
              d.length = 0;
              this.h.g += a;
              this.C = 0;
              g = this.h.g;
            } else g = this.g.oa();
            this.o = 200 == c;
            xb(this.i, this.u, this.A, this.l, this.R, w2, c);
            if (this.o) {
              if (this.T && !this.K) {
                b: {
                  if (this.g) {
                    var m, q = this.g;
                    if ((m = q.g ? q.g.getResponseHeader("X-HTTP-Initial-Response") : null) && !t(m)) {
                      var l = m;
                      break b;
                    }
                  }
                  l = null;
                }
                if (c = l) L(this.i, this.l, c, "Initial handshake response via X-HTTP-Initial-Response"), this.K = true, Rb(this, c);
                else {
                  this.o = false;
                  this.s = 3;
                  K(12);
                  Q(this);
                  Qb(this);
                  break a;
                }
              }
              if (this.P) {
                c = true;
                let B;
                for (; !this.J && this.C < g.length; ) if (B = Sb(this, g), B == Gb) {
                  4 == w2 && (this.s = 4, K(14), c = false);
                  L(this.i, this.l, null, "[Incomplete Response]");
                  break;
                } else if (B == Fb) {
                  this.s = 4;
                  K(15);
                  L(this.i, this.l, g, "[Invalid Chunk]");
                  c = false;
                  break;
                } else L(this.i, this.l, B, null), Rb(this, B);
                Pb(this) && 0 != this.C && (this.h.g = this.h.g.slice(this.C), this.C = 0);
                4 != w2 || 0 != g.length || this.h.h || (this.s = 1, K(16), c = false);
                this.o = this.o && c;
                if (!c) L(this.i, this.l, g, "[Invalid Chunked Response]"), Q(this), Qb(this);
                else if (0 < g.length && !this.W) {
                  this.W = true;
                  var v2 = this.j;
                  v2.g == this && v2.ba && !v2.M && (v2.j.info("Great, no buffering proxy detected. Bytes received: " + g.length), Tb(v2), v2.M = true, K(11));
                }
              } else L(this.i, this.l, g, null), Rb(this, g);
              4 == w2 && Q(this);
              this.o && !this.J && (4 == w2 ? Ub(this.j, this) : (this.o = false, Kb(this)));
            } else Vb(this.g), 400 == c && 0 < g.indexOf("Unknown SID") ? (this.s = 3, K(12)) : (this.s = 0, K(13)), Q(this), Qb(this);
          }
        }
      } catch (w2) {
      } finally {
      }
    };
    function Pb(a) {
      return a.g ? "GET" == a.u && 2 != a.L && a.j.Ca : false;
    }
    function Sb(a, b2) {
      var c = a.C, d = b2.indexOf("\n", c);
      if (-1 == d) return Gb;
      c = Number(b2.substring(c, d));
      if (isNaN(c)) return Fb;
      d += 1;
      if (d + c > b2.length) return Gb;
      b2 = b2.slice(d, d + c);
      a.C = d + c;
      return b2;
    }
    M.prototype.cancel = function() {
      this.J = true;
      Q(this);
    };
    function Kb(a) {
      a.S = Date.now() + a.I;
      Wb(a, a.I);
    }
    function Wb(a, b2) {
      if (null != a.B) throw Error("WatchDog timer not null");
      a.B = ub(p(a.ba, a), b2);
    }
    function Ob(a) {
      a.B && (k.clearTimeout(a.B), a.B = null);
    }
    M.prototype.ba = function() {
      this.B = null;
      const a = Date.now();
      0 <= a - this.S ? (zb(this.i, this.A), 2 != this.L && (J2(), K(17)), Q(this), this.s = 2, Qb(this)) : Wb(this, this.S - a);
    };
    function Qb(a) {
      0 == a.j.G || a.J || Ub(a.j, a);
    }
    function Q(a) {
      Ob(a);
      var b2 = a.M;
      b2 && "function" == typeof b2.ma && b2.ma();
      a.M = null;
      gb(a.U);
      a.g && (b2 = a.g, a.g = null, b2.abort(), b2.ma());
    }
    function Rb(a, b2) {
      try {
        var c = a.j;
        if (0 != c.G && (c.g == a || Xb(c.h, a))) {
          if (!a.K && Xb(c.h, a) && 3 == c.G) {
            try {
              var d = c.Da.g.parse(b2);
            } catch (l) {
              d = null;
            }
            if (Array.isArray(d) && 3 == d.length) {
              var e = d;
              if (0 == e[0]) a: {
                if (!c.u) {
                  if (c.g) if (c.g.F + 3e3 < a.F) Yb(c), Zb(c);
                  else break a;
                  $b(c);
                  K(18);
                }
              }
              else c.za = e[1], 0 < c.za - c.T && 37500 > e[2] && c.F && 0 == c.v && !c.C && (c.C = ub(p(c.Za, c), 6e3));
              if (1 >= ac(c.h) && c.ca) {
                try {
                  c.ca();
                } catch (l) {
                }
                c.ca = void 0;
              }
            } else R(c, 11);
          } else if ((a.K || c.g == a) && Yb(c), !t(b2)) for (e = c.Da.g.parse(b2), b2 = 0; b2 < e.length; b2++) {
            let l = e[b2];
            c.T = l[0];
            l = l[1];
            if (2 == c.G) if ("c" == l[0]) {
              c.K = l[1];
              c.ia = l[2];
              const v2 = l[3];
              null != v2 && (c.la = v2, c.j.info("VER=" + c.la));
              const w2 = l[4];
              null != w2 && (c.Aa = w2, c.j.info("SVER=" + c.Aa));
              const O = l[5];
              null != O && "number" === typeof O && 0 < O && (d = 1.5 * O, c.L = d, c.j.info("backChannelRequestTimeoutMs_=" + d));
              d = c;
              const B = a.g;
              if (B) {
                const ya = B.g ? B.g.getResponseHeader("X-Client-Wire-Protocol") : null;
                if (ya) {
                  var f = d.h;
                  f.g || -1 == ya.indexOf("spdy") && -1 == ya.indexOf("quic") && -1 == ya.indexOf("h2") || (f.j = f.l, f.g = /* @__PURE__ */ new Set(), f.h && (bc(f, f.h), f.h = null));
                }
                if (d.D) {
                  const db2 = B.g ? B.g.getResponseHeader("X-HTTP-Session-Id") : null;
                  db2 && (d.ya = db2, S2(d.I, d.D, db2));
                }
              }
              c.G = 3;
              c.l && c.l.ua();
              c.ba && (c.R = Date.now() - a.F, c.j.info("Handshake RTT: " + c.R + "ms"));
              d = c;
              var g = a;
              d.qa = cc(d, d.J ? d.ia : null, d.W);
              if (g.K) {
                dc(d.h, g);
                var m = g, q = d.L;
                q && (m.I = q);
                m.B && (Ob(m), Kb(m));
                d.g = g;
              } else ec(d);
              0 < c.i.length && fc(c);
            } else "stop" != l[0] && "close" != l[0] || R(c, 7);
            else 3 == c.G && ("stop" == l[0] || "close" == l[0] ? "stop" == l[0] ? R(c, 7) : gc(c) : "noop" != l[0] && c.l && c.l.ta(l), c.v = 0);
          }
        }
        J2(4);
      } catch (l) {
      }
    }
    var hc = class {
      constructor(a, b2) {
        this.g = a;
        this.map = b2;
      }
    };
    function ic(a) {
      this.l = a || 10;
      k.PerformanceNavigationTiming ? (a = k.performance.getEntriesByType("navigation"), a = 0 < a.length && ("hq" == a[0].nextHopProtocol || "h2" == a[0].nextHopProtocol)) : a = !!(k.chrome && k.chrome.loadTimes && k.chrome.loadTimes() && k.chrome.loadTimes().wasFetchedViaSpdy);
      this.j = a ? this.l : 1;
      this.g = null;
      1 < this.j && (this.g = /* @__PURE__ */ new Set());
      this.h = null;
      this.i = [];
    }
    function jc(a) {
      return a.h ? true : a.g ? a.g.size >= a.j : false;
    }
    function ac(a) {
      return a.h ? 1 : a.g ? a.g.size : 0;
    }
    function Xb(a, b2) {
      return a.h ? a.h == b2 : a.g ? a.g.has(b2) : false;
    }
    function bc(a, b2) {
      a.g ? a.g.add(b2) : a.h = b2;
    }
    function dc(a, b2) {
      a.h && a.h == b2 ? a.h = null : a.g && a.g.has(b2) && a.g.delete(b2);
    }
    ic.prototype.cancel = function() {
      this.i = kc(this);
      if (this.h) this.h.cancel(), this.h = null;
      else if (this.g && 0 !== this.g.size) {
        for (const a of this.g.values()) a.cancel();
        this.g.clear();
      }
    };
    function kc(a) {
      if (null != a.h) return a.i.concat(a.h.D);
      if (null != a.g && 0 !== a.g.size) {
        let b2 = a.i;
        for (const c of a.g.values()) b2 = b2.concat(c.D);
        return b2;
      }
      return la(a.i);
    }
    function lc(a) {
      if (a.V && "function" == typeof a.V) return a.V();
      if ("undefined" !== typeof Map && a instanceof Map || "undefined" !== typeof Set && a instanceof Set) return Array.from(a.values());
      if ("string" === typeof a) return a.split("");
      if (ha(a)) {
        for (var b2 = [], c = a.length, d = 0; d < c; d++) b2.push(a[d]);
        return b2;
      }
      b2 = [];
      c = 0;
      for (d in a) b2[c++] = a[d];
      return b2;
    }
    function mc(a) {
      if (a.na && "function" == typeof a.na) return a.na();
      if (!a.V || "function" != typeof a.V) {
        if ("undefined" !== typeof Map && a instanceof Map) return Array.from(a.keys());
        if (!("undefined" !== typeof Set && a instanceof Set)) {
          if (ha(a) || "string" === typeof a) {
            var b2 = [];
            a = a.length;
            for (var c = 0; c < a; c++) b2.push(c);
            return b2;
          }
          b2 = [];
          c = 0;
          for (const d in a) b2[c++] = d;
          return b2;
        }
      }
    }
    function nc(a, b2) {
      if (a.forEach && "function" == typeof a.forEach) a.forEach(b2, void 0);
      else if (ha(a) || "string" === typeof a) Array.prototype.forEach.call(a, b2, void 0);
      else for (var c = mc(a), d = lc(a), e = d.length, f = 0; f < e; f++) b2.call(void 0, d[f], c && c[f], a);
    }
    var oc = RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");
    function pc(a, b2) {
      if (a) {
        a = a.split("&");
        for (var c = 0; c < a.length; c++) {
          var d = a[c].indexOf("="), e = null;
          if (0 <= d) {
            var f = a[c].substring(0, d);
            e = a[c].substring(d + 1);
          } else f = a[c];
          b2(f, e ? decodeURIComponent(e.replace(/\+/g, " ")) : "");
        }
      }
    }
    function T(a) {
      this.g = this.o = this.j = "";
      this.s = null;
      this.m = this.l = "";
      this.h = false;
      if (a instanceof T) {
        this.h = a.h;
        qc(this, a.j);
        this.o = a.o;
        this.g = a.g;
        rc(this, a.s);
        this.l = a.l;
        var b2 = a.i;
        var c = new sc();
        c.i = b2.i;
        b2.g && (c.g = new Map(b2.g), c.h = b2.h);
        tc(this, c);
        this.m = a.m;
      } else a && (b2 = String(a).match(oc)) ? (this.h = false, qc(this, b2[1] || "", true), this.o = uc(b2[2] || ""), this.g = uc(b2[3] || "", true), rc(this, b2[4]), this.l = uc(b2[5] || "", true), tc(this, b2[6] || "", true), this.m = uc(b2[7] || "")) : (this.h = false, this.i = new sc(null, this.h));
    }
    T.prototype.toString = function() {
      var a = [], b2 = this.j;
      b2 && a.push(vc(b2, wc, true), ":");
      var c = this.g;
      if (c || "file" == b2) a.push("//"), (b2 = this.o) && a.push(vc(b2, wc, true), "@"), a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), c = this.s, null != c && a.push(":", String(c));
      if (c = this.l) this.g && "/" != c.charAt(0) && a.push("/"), a.push(vc(c, "/" == c.charAt(0) ? xc : yc, true));
      (c = this.i.toString()) && a.push("?", c);
      (c = this.m) && a.push("#", vc(c, zc));
      return a.join("");
    };
    function N(a) {
      return new T(a);
    }
    function qc(a, b2, c) {
      a.j = c ? uc(b2, true) : b2;
      a.j && (a.j = a.j.replace(/:$/, ""));
    }
    function rc(a, b2) {
      if (b2) {
        b2 = Number(b2);
        if (isNaN(b2) || 0 > b2) throw Error("Bad port number " + b2);
        a.s = b2;
      } else a.s = null;
    }
    function tc(a, b2, c) {
      b2 instanceof sc ? (a.i = b2, Ac(a.i, a.h)) : (c || (b2 = vc(b2, Bc)), a.i = new sc(b2, a.h));
    }
    function S2(a, b2, c) {
      a.i.set(b2, c);
    }
    function Ib(a) {
      S2(a, "zx", Math.floor(2147483648 * Math.random()).toString(36) + Math.abs(Math.floor(2147483648 * Math.random()) ^ Date.now()).toString(36));
      return a;
    }
    function uc(a, b2) {
      return a ? b2 ? decodeURI(a.replace(/%25/g, "%2525")) : decodeURIComponent(a) : "";
    }
    function vc(a, b2, c) {
      return "string" === typeof a ? (a = encodeURI(a).replace(b2, Cc), c && (a = a.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), a) : null;
    }
    function Cc(a) {
      a = a.charCodeAt(0);
      return "%" + (a >> 4 & 15).toString(16) + (a & 15).toString(16);
    }
    var wc = /[#\/\?@]/g, yc = /[#\?:]/g, xc = /[#\?]/g, Bc = /[#\?@]/g, zc = /#/g;
    function sc(a, b2) {
      this.h = this.g = null;
      this.i = a || null;
      this.j = !!b2;
    }
    function U(a) {
      a.g || (a.g = /* @__PURE__ */ new Map(), a.h = 0, a.i && pc(a.i, function(b2, c) {
        a.add(decodeURIComponent(b2.replace(/\+/g, " ")), c);
      }));
    }
    h = sc.prototype;
    h.add = function(a, b2) {
      U(this);
      this.i = null;
      a = V(this, a);
      var c = this.g.get(a);
      c || this.g.set(a, c = []);
      c.push(b2);
      this.h += 1;
      return this;
    };
    function Dc(a, b2) {
      U(a);
      b2 = V(a, b2);
      a.g.has(b2) && (a.i = null, a.h -= a.g.get(b2).length, a.g.delete(b2));
    }
    function Ec(a, b2) {
      U(a);
      b2 = V(a, b2);
      return a.g.has(b2);
    }
    h.forEach = function(a, b2) {
      U(this);
      this.g.forEach(function(c, d) {
        c.forEach(function(e) {
          a.call(b2, e, d, this);
        }, this);
      }, this);
    };
    h.na = function() {
      U(this);
      const a = Array.from(this.g.values()), b2 = Array.from(this.g.keys()), c = [];
      for (let d = 0; d < b2.length; d++) {
        const e = a[d];
        for (let f = 0; f < e.length; f++) c.push(b2[d]);
      }
      return c;
    };
    h.V = function(a) {
      U(this);
      let b2 = [];
      if ("string" === typeof a) Ec(this, a) && (b2 = b2.concat(this.g.get(V(this, a))));
      else {
        a = Array.from(this.g.values());
        for (let c = 0; c < a.length; c++) b2 = b2.concat(a[c]);
      }
      return b2;
    };
    h.set = function(a, b2) {
      U(this);
      this.i = null;
      a = V(this, a);
      Ec(this, a) && (this.h -= this.g.get(a).length);
      this.g.set(a, [b2]);
      this.h += 1;
      return this;
    };
    h.get = function(a, b2) {
      if (!a) return b2;
      a = this.V(a);
      return 0 < a.length ? String(a[0]) : b2;
    };
    function Lb(a, b2, c) {
      Dc(a, b2);
      0 < c.length && (a.i = null, a.g.set(V(a, b2), la(c)), a.h += c.length);
    }
    h.toString = function() {
      if (this.i) return this.i;
      if (!this.g) return "";
      const a = [], b2 = Array.from(this.g.keys());
      for (var c = 0; c < b2.length; c++) {
        var d = b2[c];
        const f = encodeURIComponent(String(d)), g = this.V(d);
        for (d = 0; d < g.length; d++) {
          var e = f;
          "" !== g[d] && (e += "=" + encodeURIComponent(String(g[d])));
          a.push(e);
        }
      }
      return this.i = a.join("&");
    };
    function V(a, b2) {
      b2 = String(b2);
      a.j && (b2 = b2.toLowerCase());
      return b2;
    }
    function Ac(a, b2) {
      b2 && !a.j && (U(a), a.i = null, a.g.forEach(function(c, d) {
        var e = d.toLowerCase();
        d != e && (Dc(this, d), Lb(this, e, c));
      }, a));
      a.j = b2;
    }
    function Fc(a, b2) {
      const c = new vb();
      if (k.Image) {
        const d = new Image();
        d.onload = ka(W, c, "TestLoadImage: loaded", true, b2, d);
        d.onerror = ka(W, c, "TestLoadImage: error", false, b2, d);
        d.onabort = ka(W, c, "TestLoadImage: abort", false, b2, d);
        d.ontimeout = ka(W, c, "TestLoadImage: timeout", false, b2, d);
        k.setTimeout(function() {
          if (d.ontimeout) d.ontimeout();
        }, 1e4);
        d.src = a;
      } else b2(false);
    }
    function Gc(a, b2) {
      const c = new vb(), d = new AbortController(), e = setTimeout(() => {
        d.abort();
        W(c, "TestPingServer: timeout", false, b2);
      }, 1e4);
      fetch(a, { signal: d.signal }).then((f) => {
        clearTimeout(e);
        f.ok ? W(c, "TestPingServer: ok", true, b2) : W(c, "TestPingServer: server error", false, b2);
      }).catch(() => {
        clearTimeout(e);
        W(c, "TestPingServer: error", false, b2);
      });
    }
    function W(a, b2, c, d, e) {
      try {
        e && (e.onload = null, e.onerror = null, e.onabort = null, e.ontimeout = null), d(c);
      } catch (f) {
      }
    }
    function Hc() {
      this.g = new jb();
    }
    function Ic(a, b2, c) {
      const d = c || "";
      try {
        nc(a, function(e, f) {
          let g = e;
          n(e) && (g = hb(e));
          b2.push(d + f + "=" + encodeURIComponent(g));
        });
      } catch (e) {
        throw b2.push(d + "type=" + encodeURIComponent("_badmap")), e;
      }
    }
    function Jc(a) {
      this.l = a.Ub || null;
      this.j = a.eb || false;
    }
    r(Jc, kb);
    Jc.prototype.g = function() {
      return new Kc(this.l, this.j);
    };
    Jc.prototype.i = /* @__PURE__ */ function(a) {
      return function() {
        return a;
      };
    }({});
    function Kc(a, b2) {
      E.call(this);
      this.D = a;
      this.o = b2;
      this.m = void 0;
      this.status = this.readyState = 0;
      this.responseType = this.responseText = this.response = this.statusText = "";
      this.onreadystatechange = null;
      this.u = new Headers();
      this.h = null;
      this.B = "GET";
      this.A = "";
      this.g = false;
      this.v = this.j = this.l = null;
    }
    r(Kc, E);
    h = Kc.prototype;
    h.open = function(a, b2) {
      if (0 != this.readyState) throw this.abort(), Error("Error reopening a connection");
      this.B = a;
      this.A = b2;
      this.readyState = 1;
      Lc(this);
    };
    h.send = function(a) {
      if (1 != this.readyState) throw this.abort(), Error("need to call open() first. ");
      this.g = true;
      const b2 = { headers: this.u, method: this.B, credentials: this.m, cache: void 0 };
      a && (b2.body = a);
      (this.D || k).fetch(new Request(this.A, b2)).then(this.Sa.bind(this), this.ga.bind(this));
    };
    h.abort = function() {
      this.response = this.responseText = "";
      this.u = new Headers();
      this.status = 0;
      this.j && this.j.cancel("Request was aborted.").catch(() => {
      });
      1 <= this.readyState && this.g && 4 != this.readyState && (this.g = false, Mc(this));
      this.readyState = 0;
    };
    h.Sa = function(a) {
      if (this.g && (this.l = a, this.h || (this.status = this.l.status, this.statusText = this.l.statusText, this.h = a.headers, this.readyState = 2, Lc(this)), this.g && (this.readyState = 3, Lc(this), this.g))) if ("arraybuffer" === this.responseType) a.arrayBuffer().then(this.Qa.bind(this), this.ga.bind(this));
      else if ("undefined" !== typeof k.ReadableStream && "body" in a) {
        this.j = a.body.getReader();
        if (this.o) {
          if (this.responseType) throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');
          this.response = [];
        } else this.response = this.responseText = "", this.v = new TextDecoder();
        Nc(this);
      } else a.text().then(this.Ra.bind(this), this.ga.bind(this));
    };
    function Nc(a) {
      a.j.read().then(a.Pa.bind(a)).catch(a.ga.bind(a));
    }
    h.Pa = function(a) {
      if (this.g) {
        if (this.o && a.value) this.response.push(a.value);
        else if (!this.o) {
          var b2 = a.value ? a.value : new Uint8Array(0);
          if (b2 = this.v.decode(b2, { stream: !a.done })) this.response = this.responseText += b2;
        }
        a.done ? Mc(this) : Lc(this);
        3 == this.readyState && Nc(this);
      }
    };
    h.Ra = function(a) {
      this.g && (this.response = this.responseText = a, Mc(this));
    };
    h.Qa = function(a) {
      this.g && (this.response = a, Mc(this));
    };
    h.ga = function() {
      this.g && Mc(this);
    };
    function Mc(a) {
      a.readyState = 4;
      a.l = null;
      a.j = null;
      a.v = null;
      Lc(a);
    }
    h.setRequestHeader = function(a, b2) {
      this.u.append(a, b2);
    };
    h.getResponseHeader = function(a) {
      return this.h ? this.h.get(a.toLowerCase()) || "" : "";
    };
    h.getAllResponseHeaders = function() {
      if (!this.h) return "";
      const a = [], b2 = this.h.entries();
      for (var c = b2.next(); !c.done; ) c = c.value, a.push(c[0] + ": " + c[1]), c = b2.next();
      return a.join("\r\n");
    };
    function Lc(a) {
      a.onreadystatechange && a.onreadystatechange.call(a);
    }
    Object.defineProperty(Kc.prototype, "withCredentials", { get: function() {
      return "include" === this.m;
    }, set: function(a) {
      this.m = a ? "include" : "same-origin";
    } });
    function Oc(a) {
      let b2 = "";
      qa(a, function(c, d) {
        b2 += d;
        b2 += ":";
        b2 += c;
        b2 += "\r\n";
      });
      return b2;
    }
    function Pc(a, b2, c) {
      a: {
        for (d in c) {
          var d = false;
          break a;
        }
        d = true;
      }
      d || (c = Oc(c), "string" === typeof a ? null != c && encodeURIComponent(String(c)) : S2(a, b2, c));
    }
    function X2(a) {
      E.call(this);
      this.headers = /* @__PURE__ */ new Map();
      this.o = a || null;
      this.h = false;
      this.v = this.g = null;
      this.D = "";
      this.m = 0;
      this.l = "";
      this.j = this.B = this.u = this.A = false;
      this.I = null;
      this.H = "";
      this.J = false;
    }
    r(X2, E);
    var Qc = /^https?$/i, Rc = ["POST", "PUT"];
    h = X2.prototype;
    h.Ha = function(a) {
      this.J = a;
    };
    h.ea = function(a, b2, c, d) {
      if (this.g) throw Error("[goog.net.XhrIo] Object is active with another request=" + this.D + "; newUri=" + a);
      b2 = b2 ? b2.toUpperCase() : "GET";
      this.D = a;
      this.l = "";
      this.m = 0;
      this.A = false;
      this.h = true;
      this.g = this.o ? this.o.g() : Cb.g();
      this.v = this.o ? lb(this.o) : lb(Cb);
      this.g.onreadystatechange = p(this.Ea, this);
      try {
        this.B = true, this.g.open(b2, String(a), true), this.B = false;
      } catch (f) {
        Sc(this, f);
        return;
      }
      a = c || "";
      c = new Map(this.headers);
      if (d) if (Object.getPrototypeOf(d) === Object.prototype) for (var e in d) c.set(e, d[e]);
      else if ("function" === typeof d.keys && "function" === typeof d.get) for (const f of d.keys()) c.set(f, d.get(f));
      else throw Error("Unknown input type for opt_headers: " + String(d));
      d = Array.from(c.keys()).find((f) => "content-type" == f.toLowerCase());
      e = k.FormData && a instanceof k.FormData;
      !(0 <= Array.prototype.indexOf.call(Rc, b2, void 0)) || d || e || c.set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
      for (const [f, g] of c) this.g.setRequestHeader(f, g);
      this.H && (this.g.responseType = this.H);
      "withCredentials" in this.g && this.g.withCredentials !== this.J && (this.g.withCredentials = this.J);
      try {
        Tc(this), this.u = true, this.g.send(a), this.u = false;
      } catch (f) {
        Sc(this, f);
      }
    };
    function Sc(a, b2) {
      a.h = false;
      a.g && (a.j = true, a.g.abort(), a.j = false);
      a.l = b2;
      a.m = 5;
      Uc(a);
      Vc(a);
    }
    function Uc(a) {
      a.A || (a.A = true, F(a, "complete"), F(a, "error"));
    }
    h.abort = function(a) {
      this.g && this.h && (this.h = false, this.j = true, this.g.abort(), this.j = false, this.m = a || 7, F(this, "complete"), F(this, "abort"), Vc(this));
    };
    h.N = function() {
      this.g && (this.h && (this.h = false, this.j = true, this.g.abort(), this.j = false), Vc(this, true));
      X2.aa.N.call(this);
    };
    h.Ea = function() {
      this.s || (this.B || this.u || this.j ? Wc(this) : this.bb());
    };
    h.bb = function() {
      Wc(this);
    };
    function Wc(a) {
      if (a.h && "undefined" != typeof fa && (!a.v[1] || 4 != P(a) || 2 != a.Z())) {
        if (a.u && 4 == P(a)) bb(a.Ea, 0, a);
        else if (F(a, "readystatechange"), 4 == P(a)) {
          a.h = false;
          try {
            const g = a.Z();
            a: switch (g) {
              case 200:
              case 201:
              case 202:
              case 204:
              case 206:
              case 304:
              case 1223:
                var b2 = true;
                break a;
              default:
                b2 = false;
            }
            var c;
            if (!(c = b2)) {
              var d;
              if (d = 0 === g) {
                var e = String(a.D).match(oc)[1] || null;
                !e && k.self && k.self.location && (e = k.self.location.protocol.slice(0, -1));
                d = !Qc.test(e ? e.toLowerCase() : "");
              }
              c = d;
            }
            if (c) F(a, "complete"), F(a, "success");
            else {
              a.m = 6;
              try {
                var f = 2 < P(a) ? a.g.statusText : "";
              } catch (m) {
                f = "";
              }
              a.l = f + " [" + a.Z() + "]";
              Uc(a);
            }
          } finally {
            Vc(a);
          }
        }
      }
    }
    function Vc(a, b2) {
      if (a.g) {
        Tc(a);
        const c = a.g, d = a.v[0] ? () => {
        } : null;
        a.g = null;
        a.v = null;
        b2 || F(a, "ready");
        try {
          c.onreadystatechange = d;
        } catch (e) {
        }
      }
    }
    function Tc(a) {
      a.I && (k.clearTimeout(a.I), a.I = null);
    }
    h.isActive = function() {
      return !!this.g;
    };
    function P(a) {
      return a.g ? a.g.readyState : 0;
    }
    h.Z = function() {
      try {
        return 2 < P(this) ? this.g.status : -1;
      } catch (a) {
        return -1;
      }
    };
    h.oa = function() {
      try {
        return this.g ? this.g.responseText : "";
      } catch (a) {
        return "";
      }
    };
    h.Oa = function(a) {
      if (this.g) {
        var b2 = this.g.responseText;
        a && 0 == b2.indexOf(a) && (b2 = b2.substring(a.length));
        return ib(b2);
      }
    };
    function Nb(a) {
      try {
        if (!a.g) return null;
        if ("response" in a.g) return a.g.response;
        switch (a.H) {
          case "":
          case "text":
            return a.g.responseText;
          case "arraybuffer":
            if ("mozResponseArrayBuffer" in a.g) return a.g.mozResponseArrayBuffer;
        }
        return null;
      } catch (b2) {
        return null;
      }
    }
    function Vb(a) {
      const b2 = {};
      a = (a.g && 2 <= P(a) ? a.g.getAllResponseHeaders() || "" : "").split("\r\n");
      for (let d = 0; d < a.length; d++) {
        if (t(a[d])) continue;
        var c = va(a[d]);
        const e = c[0];
        c = c[1];
        if ("string" !== typeof c) continue;
        c = c.trim();
        const f = b2[e] || [];
        b2[e] = f;
        f.push(c);
      }
      ra(b2, function(d) {
        return d.join(", ");
      });
    }
    h.Ba = function() {
      return this.m;
    };
    h.Ka = function() {
      return "string" === typeof this.l ? this.l : String(this.l);
    };
    function Xc(a, b2, c) {
      return c && c.internalChannelParams ? c.internalChannelParams[a] || b2 : b2;
    }
    function Yc(a) {
      this.Aa = 0;
      this.i = [];
      this.j = new vb();
      this.ia = this.qa = this.I = this.W = this.g = this.ya = this.D = this.H = this.m = this.S = this.o = null;
      this.Ya = this.U = 0;
      this.Va = Xc("failFast", false, a);
      this.F = this.C = this.u = this.s = this.l = null;
      this.X = true;
      this.za = this.T = -1;
      this.Y = this.v = this.B = 0;
      this.Ta = Xc("baseRetryDelayMs", 5e3, a);
      this.cb = Xc("retryDelaySeedMs", 1e4, a);
      this.Wa = Xc("forwardChannelMaxRetries", 2, a);
      this.wa = Xc("forwardChannelRequestTimeoutMs", 2e4, a);
      this.pa = a && a.xmlHttpFactory || void 0;
      this.Xa = a && a.Tb || void 0;
      this.Ca = a && a.useFetchStreams || false;
      this.L = void 0;
      this.J = a && a.supportsCrossDomainXhr || false;
      this.K = "";
      this.h = new ic(a && a.concurrentRequestLimit);
      this.Da = new Hc();
      this.P = a && a.fastHandshake || false;
      this.O = a && a.encodeInitMessageHeaders || false;
      this.P && this.O && (this.O = false);
      this.Ua = a && a.Rb || false;
      a && a.xa && this.j.xa();
      a && a.forceLongPolling && (this.X = false);
      this.ba = !this.P && this.X && a && a.detectBufferingProxy || false;
      this.ja = void 0;
      a && a.longPollingTimeout && 0 < a.longPollingTimeout && (this.ja = a.longPollingTimeout);
      this.ca = void 0;
      this.R = 0;
      this.M = false;
      this.ka = this.A = null;
    }
    h = Yc.prototype;
    h.la = 8;
    h.G = 1;
    h.connect = function(a, b2, c, d) {
      K(0);
      this.W = a;
      this.H = b2 || {};
      c && void 0 !== d && (this.H.OSID = c, this.H.OAID = d);
      this.F = this.X;
      this.I = cc(this, null, this.W);
      fc(this);
    };
    function gc(a) {
      Zc(a);
      if (3 == a.G) {
        var b2 = a.U++, c = N(a.I);
        S2(c, "SID", a.K);
        S2(c, "RID", b2);
        S2(c, "TYPE", "terminate");
        $c(a, c);
        b2 = new M(a, a.j, b2);
        b2.L = 2;
        b2.v = Ib(N(c));
        c = false;
        if (k.navigator && k.navigator.sendBeacon) try {
          c = k.navigator.sendBeacon(b2.v.toString(), "");
        } catch (d) {
        }
        !c && k.Image && (new Image().src = b2.v, c = true);
        c || (b2.g = Mb(b2.j, null), b2.g.ea(b2.v));
        b2.F = Date.now();
        Kb(b2);
      }
      ad(a);
    }
    function Zb(a) {
      a.g && (Tb(a), a.g.cancel(), a.g = null);
    }
    function Zc(a) {
      Zb(a);
      a.u && (k.clearTimeout(a.u), a.u = null);
      Yb(a);
      a.h.cancel();
      a.s && ("number" === typeof a.s && k.clearTimeout(a.s), a.s = null);
    }
    function fc(a) {
      if (!jc(a.h) && !a.s) {
        a.s = true;
        var b2 = a.Ga;
        x || Ea();
        y || (x(), y = true);
        za.add(b2, a);
        a.B = 0;
      }
    }
    function bd(a, b2) {
      if (ac(a.h) >= a.h.j - (a.s ? 1 : 0)) return false;
      if (a.s) return a.i = b2.D.concat(a.i), true;
      if (1 == a.G || 2 == a.G || a.B >= (a.Va ? 0 : a.Wa)) return false;
      a.s = ub(p(a.Ga, a, b2), cd(a, a.B));
      a.B++;
      return true;
    }
    h.Ga = function(a) {
      if (this.s) if (this.s = null, 1 == this.G) {
        if (!a) {
          this.U = Math.floor(1e5 * Math.random());
          a = this.U++;
          const e = new M(this, this.j, a);
          let f = this.o;
          this.S && (f ? (f = sa(f), ua(f, this.S)) : f = this.S);
          null !== this.m || this.O || (e.H = f, f = null);
          if (this.P) a: {
            var b2 = 0;
            for (var c = 0; c < this.i.length; c++) {
              b: {
                var d = this.i[c];
                if ("__data__" in d.map && (d = d.map.__data__, "string" === typeof d)) {
                  d = d.length;
                  break b;
                }
                d = void 0;
              }
              if (void 0 === d) break;
              b2 += d;
              if (4096 < b2) {
                b2 = c;
                break a;
              }
              if (4096 === b2 || c === this.i.length - 1) {
                b2 = c + 1;
                break a;
              }
            }
            b2 = 1e3;
          }
          else b2 = 1e3;
          b2 = dd(this, e, b2);
          c = N(this.I);
          S2(c, "RID", a);
          S2(c, "CVER", 22);
          this.D && S2(c, "X-HTTP-Session-Id", this.D);
          $c(this, c);
          f && (this.O ? b2 = "headers=" + encodeURIComponent(String(Oc(f))) + "&" + b2 : this.m && Pc(c, this.m, f));
          bc(this.h, e);
          this.Ua && S2(c, "TYPE", "init");
          this.P ? (S2(c, "$req", b2), S2(c, "SID", "null"), e.T = true, Hb(e, c, null)) : Hb(e, c, b2);
          this.G = 2;
        }
      } else 3 == this.G && (a ? ed(this, a) : 0 == this.i.length || jc(this.h) || ed(this));
    };
    function ed(a, b2) {
      var c;
      b2 ? c = b2.l : c = a.U++;
      const d = N(a.I);
      S2(d, "SID", a.K);
      S2(d, "RID", c);
      S2(d, "AID", a.T);
      $c(a, d);
      a.m && a.o && Pc(d, a.m, a.o);
      c = new M(a, a.j, c, a.B + 1);
      null === a.m && (c.H = a.o);
      b2 && (a.i = b2.D.concat(a.i));
      b2 = dd(a, c, 1e3);
      c.I = Math.round(0.5 * a.wa) + Math.round(0.5 * a.wa * Math.random());
      bc(a.h, c);
      Hb(c, d, b2);
    }
    function $c(a, b2) {
      a.H && qa(a.H, function(c, d) {
        S2(b2, d, c);
      });
      a.l && nc({}, function(c, d) {
        S2(b2, d, c);
      });
    }
    function dd(a, b2, c) {
      c = Math.min(a.i.length, c);
      var d = a.l ? p(a.l.Na, a.l, a) : null;
      a: {
        var e = a.i;
        let f = -1;
        for (; ; ) {
          const g = ["count=" + c];
          -1 == f ? 0 < c ? (f = e[0].g, g.push("ofs=" + f)) : f = 0 : g.push("ofs=" + f);
          let m = true;
          for (let q = 0; q < c; q++) {
            let l = e[q].g;
            const v2 = e[q].map;
            l -= f;
            if (0 > l) f = Math.max(0, e[q].g - 100), m = false;
            else try {
              Ic(v2, g, "req" + l + "_");
            } catch (w2) {
              d && d(v2);
            }
          }
          if (m) {
            d = g.join("&");
            break a;
          }
        }
      }
      a = a.i.splice(0, c);
      b2.D = a;
      return d;
    }
    function ec(a) {
      if (!a.g && !a.u) {
        a.Y = 1;
        var b2 = a.Fa;
        x || Ea();
        y || (x(), y = true);
        za.add(b2, a);
        a.v = 0;
      }
    }
    function $b(a) {
      if (a.g || a.u || 3 <= a.v) return false;
      a.Y++;
      a.u = ub(p(a.Fa, a), cd(a, a.v));
      a.v++;
      return true;
    }
    h.Fa = function() {
      this.u = null;
      fd(this);
      if (this.ba && !(this.M || null == this.g || 0 >= this.R)) {
        var a = 2 * this.R;
        this.j.info("BP detection timer enabled: " + a);
        this.A = ub(p(this.ab, this), a);
      }
    };
    h.ab = function() {
      this.A && (this.A = null, this.j.info("BP detection timeout reached."), this.j.info("Buffering proxy detected and switch to long-polling!"), this.F = false, this.M = true, K(10), Zb(this), fd(this));
    };
    function Tb(a) {
      null != a.A && (k.clearTimeout(a.A), a.A = null);
    }
    function fd(a) {
      a.g = new M(a, a.j, "rpc", a.Y);
      null === a.m && (a.g.H = a.o);
      a.g.O = 0;
      var b2 = N(a.qa);
      S2(b2, "RID", "rpc");
      S2(b2, "SID", a.K);
      S2(b2, "AID", a.T);
      S2(b2, "CI", a.F ? "0" : "1");
      !a.F && a.ja && S2(b2, "TO", a.ja);
      S2(b2, "TYPE", "xmlhttp");
      $c(a, b2);
      a.m && a.o && Pc(b2, a.m, a.o);
      a.L && (a.g.I = a.L);
      var c = a.g;
      a = a.ia;
      c.L = 1;
      c.v = Ib(N(b2));
      c.m = null;
      c.P = true;
      Jb(c, a);
    }
    h.Za = function() {
      null != this.C && (this.C = null, Zb(this), $b(this), K(19));
    };
    function Yb(a) {
      null != a.C && (k.clearTimeout(a.C), a.C = null);
    }
    function Ub(a, b2) {
      var c = null;
      if (a.g == b2) {
        Yb(a);
        Tb(a);
        a.g = null;
        var d = 2;
      } else if (Xb(a.h, b2)) c = b2.D, dc(a.h, b2), d = 1;
      else return;
      if (0 != a.G) {
        if (b2.o) if (1 == d) {
          c = b2.m ? b2.m.length : 0;
          b2 = Date.now() - b2.F;
          var e = a.B;
          d = qb();
          F(d, new tb(d, c));
          fc(a);
        } else ec(a);
        else if (e = b2.s, 3 == e || 0 == e && 0 < b2.X || !(1 == d && bd(a, b2) || 2 == d && $b(a))) switch (c && 0 < c.length && (b2 = a.h, b2.i = b2.i.concat(c)), e) {
          case 1:
            R(a, 5);
            break;
          case 4:
            R(a, 10);
            break;
          case 3:
            R(a, 6);
            break;
          default:
            R(a, 2);
        }
      }
    }
    function cd(a, b2) {
      let c = a.Ta + Math.floor(Math.random() * a.cb);
      a.isActive() || (c *= 2);
      return c * b2;
    }
    function R(a, b2) {
      a.j.info("Error code " + b2);
      if (2 == b2) {
        var c = p(a.fb, a), d = a.Xa;
        const e = !d;
        d = new T(d || "//www.google.com/images/cleardot.gif");
        k.location && "http" == k.location.protocol || qc(d, "https");
        Ib(d);
        e ? Fc(d.toString(), c) : Gc(d.toString(), c);
      } else K(2);
      a.G = 0;
      a.l && a.l.sa(b2);
      ad(a);
      Zc(a);
    }
    h.fb = function(a) {
      a ? (this.j.info("Successfully pinged google.com"), K(2)) : (this.j.info("Failed to ping google.com"), K(1));
    };
    function ad(a) {
      a.G = 0;
      a.ka = [];
      if (a.l) {
        const b2 = kc(a.h);
        if (0 != b2.length || 0 != a.i.length) ma(a.ka, b2), ma(a.ka, a.i), a.h.i.length = 0, la(a.i), a.i.length = 0;
        a.l.ra();
      }
    }
    function cc(a, b2, c) {
      var d = c instanceof T ? N(c) : new T(c);
      if ("" != d.g) b2 && (d.g = b2 + "." + d.g), rc(d, d.s);
      else {
        var e = k.location;
        d = e.protocol;
        b2 = b2 ? b2 + "." + e.hostname : e.hostname;
        e = +e.port;
        var f = new T(null);
        d && qc(f, d);
        b2 && (f.g = b2);
        e && rc(f, e);
        c && (f.l = c);
        d = f;
      }
      c = a.D;
      b2 = a.ya;
      c && b2 && S2(d, c, b2);
      S2(d, "VER", a.la);
      $c(a, d);
      return d;
    }
    function Mb(a, b2, c) {
      if (b2 && !a.J) throw Error("Can't create secondary domain capable XhrIo object.");
      b2 = a.Ca && !a.pa ? new X2(new Jc({ eb: c })) : new X2(a.pa);
      b2.Ha(a.J);
      return b2;
    }
    h.isActive = function() {
      return !!this.l && this.l.isActive(this);
    };
    function gd() {
    }
    h = gd.prototype;
    h.ua = function() {
    };
    h.ta = function() {
    };
    h.sa = function() {
    };
    h.ra = function() {
    };
    h.isActive = function() {
      return true;
    };
    h.Na = function() {
    };
    function hd() {
    }
    hd.prototype.g = function(a, b2) {
      return new Y2(a, b2);
    };
    function Y2(a, b2) {
      E.call(this);
      this.g = new Yc(b2);
      this.l = a;
      this.h = b2 && b2.messageUrlParams || null;
      a = b2 && b2.messageHeaders || null;
      b2 && b2.clientProtocolHeaderRequired && (a ? a["X-Client-Protocol"] = "webchannel" : a = { "X-Client-Protocol": "webchannel" });
      this.g.o = a;
      a = b2 && b2.initMessageHeaders || null;
      b2 && b2.messageContentType && (a ? a["X-WebChannel-Content-Type"] = b2.messageContentType : a = { "X-WebChannel-Content-Type": b2.messageContentType });
      b2 && b2.va && (a ? a["X-WebChannel-Client-Profile"] = b2.va : a = { "X-WebChannel-Client-Profile": b2.va });
      this.g.S = a;
      (a = b2 && b2.Sb) && !t(a) && (this.g.m = a);
      this.v = b2 && b2.supportsCrossDomainXhr || false;
      this.u = b2 && b2.sendRawJson || false;
      (b2 = b2 && b2.httpSessionIdParam) && !t(b2) && (this.g.D = b2, a = this.h, null !== a && b2 in a && (a = this.h, b2 in a && delete a[b2]));
      this.j = new Z2(this);
    }
    r(Y2, E);
    Y2.prototype.m = function() {
      this.g.l = this.j;
      this.v && (this.g.J = true);
      this.g.connect(this.l, this.h || void 0);
    };
    Y2.prototype.close = function() {
      gc(this.g);
    };
    Y2.prototype.o = function(a) {
      var b2 = this.g;
      if ("string" === typeof a) {
        var c = {};
        c.__data__ = a;
        a = c;
      } else this.u && (c = {}, c.__data__ = hb(a), a = c);
      b2.i.push(new hc(b2.Ya++, a));
      3 == b2.G && fc(b2);
    };
    Y2.prototype.N = function() {
      this.g.l = null;
      delete this.j;
      gc(this.g);
      delete this.g;
      Y2.aa.N.call(this);
    };
    function id(a) {
      nb.call(this);
      a.__headers__ && (this.headers = a.__headers__, this.statusCode = a.__status__, delete a.__headers__, delete a.__status__);
      var b2 = a.__sm__;
      if (b2) {
        a: {
          for (const c in b2) {
            a = c;
            break a;
          }
          a = void 0;
        }
        if (this.i = a) a = this.i, b2 = null !== b2 && a in b2 ? b2[a] : void 0;
        this.data = b2;
      } else this.data = a;
    }
    r(id, nb);
    function jd() {
      ob.call(this);
      this.status = 1;
    }
    r(jd, ob);
    function Z2(a) {
      this.g = a;
    }
    r(Z2, gd);
    Z2.prototype.ua = function() {
      F(this.g, "a");
    };
    Z2.prototype.ta = function(a) {
      F(this.g, new id(a));
    };
    Z2.prototype.sa = function(a) {
      F(this.g, new jd());
    };
    Z2.prototype.ra = function() {
      F(this.g, "b");
    };
    hd.prototype.createWebChannel = hd.prototype.g;
    Y2.prototype.send = Y2.prototype.o;
    Y2.prototype.open = Y2.prototype.m;
    Y2.prototype.close = Y2.prototype.close;
    createWebChannelTransport = webchannel_blob_es2018.createWebChannelTransport = function() {
      return new hd();
    };
    getStatEventTarget = webchannel_blob_es2018.getStatEventTarget = function() {
      return qb();
    };
    Event = webchannel_blob_es2018.Event = I;
    Stat = webchannel_blob_es2018.Stat = { mb: 0, pb: 1, qb: 2, Jb: 3, Ob: 4, Lb: 5, Mb: 6, Kb: 7, Ib: 8, Nb: 9, PROXY: 10, NOPROXY: 11, Gb: 12, Cb: 13, Db: 14, Bb: 15, Eb: 16, Fb: 17, ib: 18, hb: 19, jb: 20 };
    Ab.NO_ERROR = 0;
    Ab.TIMEOUT = 8;
    Ab.HTTP_ERROR = 6;
    ErrorCode = webchannel_blob_es2018.ErrorCode = Ab;
    Bb.COMPLETE = "complete";
    EventType = webchannel_blob_es2018.EventType = Bb;
    mb.EventType = H2;
    H2.OPEN = "a";
    H2.CLOSE = "b";
    H2.ERROR = "c";
    H2.MESSAGE = "d";
    E.prototype.listen = E.prototype.K;
    WebChannel = webchannel_blob_es2018.WebChannel = mb;
    FetchXmlHttpFactory = webchannel_blob_es2018.FetchXmlHttpFactory = Jc;
    X2.prototype.listenOnce = X2.prototype.L;
    X2.prototype.getLastError = X2.prototype.Ka;
    X2.prototype.getLastErrorCode = X2.prototype.Ba;
    X2.prototype.getStatus = X2.prototype.Z;
    X2.prototype.getResponseJson = X2.prototype.Oa;
    X2.prototype.getResponseText = X2.prototype.oa;
    X2.prototype.send = X2.prototype.ea;
    X2.prototype.setWithCredentials = X2.prototype.Ha;
    XhrIo = webchannel_blob_es2018.XhrIo = X2;
  }).apply(typeof commonjsGlobal2 !== "undefined" ? commonjsGlobal2 : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});

  // node_modules/@firebase/firestore/dist/index.esm2017.js
  var w = "@firebase/firestore";
  var User = class {
    constructor(e) {
      this.uid = e;
    }
    isAuthenticated() {
      return null != this.uid;
    }
    /**
     * Returns a key representing this user, suitable for inclusion in a
     * dictionary.
     */
    toKey() {
      return this.isAuthenticated() ? "uid:" + this.uid : "anonymous-user";
    }
    isEqual(e) {
      return e.uid === this.uid;
    }
  };
  User.UNAUTHENTICATED = new User(null), // TODO(mikelehen): Look into getting a proper uid-equivalent for
  // non-FirebaseAuth providers.
  User.GOOGLE_CREDENTIALS = new User("google-credentials-uid"), User.FIRST_PARTY = new User("first-party-uid"), User.MOCK_USER = new User("mock-user");
  var S = "10.14.0";
  var b = new Logger("@firebase/firestore");
  function __PRIVATE_getLogLevel() {
    return b.logLevel;
  }
  function __PRIVATE_logDebug(e, ...t) {
    if (b.logLevel <= LogLevel.DEBUG) {
      const n = t.map(__PRIVATE_argToString);
      b.debug(`Firestore (${S}): ${e}`, ...n);
    }
  }
  function __PRIVATE_logError(e, ...t) {
    if (b.logLevel <= LogLevel.ERROR) {
      const n = t.map(__PRIVATE_argToString);
      b.error(`Firestore (${S}): ${e}`, ...n);
    }
  }
  function __PRIVATE_logWarn(e, ...t) {
    if (b.logLevel <= LogLevel.WARN) {
      const n = t.map(__PRIVATE_argToString);
      b.warn(`Firestore (${S}): ${e}`, ...n);
    }
  }
  function __PRIVATE_argToString(e) {
    if ("string" == typeof e) return e;
    try {
      return function __PRIVATE_formatJSON(e2) {
        return JSON.stringify(e2);
      }(e);
    } catch (t) {
      return e;
    }
  }
  function fail(e = "Unexpected state") {
    const t = `FIRESTORE (${S}) INTERNAL ASSERTION FAILED: ` + e;
    throw __PRIVATE_logError(t), new Error(t);
  }
  function __PRIVATE_hardAssert(e, t) {
    e || fail();
  }
  function __PRIVATE_debugCast(e, t) {
    return e;
  }
  var D = {
    // Causes are copied from:
    // https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
    /** Not an error; returned on success. */
    OK: "ok",
    /** The operation was cancelled (typically by the caller). */
    CANCELLED: "cancelled",
    /** Unknown error or an error from a different error domain. */
    UNKNOWN: "unknown",
    /**
     * Client specified an invalid argument. Note that this differs from
     * FAILED_PRECONDITION. INVALID_ARGUMENT indicates arguments that are
     * problematic regardless of the state of the system (e.g., a malformed file
     * name).
     */
    INVALID_ARGUMENT: "invalid-argument",
    /**
     * Deadline expired before operation could complete. For operations that
     * change the state of the system, this error may be returned even if the
     * operation has completed successfully. For example, a successful response
     * from a server could have been delayed long enough for the deadline to
     * expire.
     */
    DEADLINE_EXCEEDED: "deadline-exceeded",
    /** Some requested entity (e.g., file or directory) was not found. */
    NOT_FOUND: "not-found",
    /**
     * Some entity that we attempted to create (e.g., file or directory) already
     * exists.
     */
    ALREADY_EXISTS: "already-exists",
    /**
     * The caller does not have permission to execute the specified operation.
     * PERMISSION_DENIED must not be used for rejections caused by exhausting
     * some resource (use RESOURCE_EXHAUSTED instead for those errors).
     * PERMISSION_DENIED must not be used if the caller cannot be identified
     * (use UNAUTHENTICATED instead for those errors).
     */
    PERMISSION_DENIED: "permission-denied",
    /**
     * The request does not have valid authentication credentials for the
     * operation.
     */
    UNAUTHENTICATED: "unauthenticated",
    /**
     * Some resource has been exhausted, perhaps a per-user quota, or perhaps the
     * entire file system is out of space.
     */
    RESOURCE_EXHAUSTED: "resource-exhausted",
    /**
     * Operation was rejected because the system is not in a state required for
     * the operation's execution. For example, directory to be deleted may be
     * non-empty, an rmdir operation is applied to a non-directory, etc.
     *
     * A litmus test that may help a service implementor in deciding
     * between FAILED_PRECONDITION, ABORTED, and UNAVAILABLE:
     *  (a) Use UNAVAILABLE if the client can retry just the failing call.
     *  (b) Use ABORTED if the client should retry at a higher-level
     *      (e.g., restarting a read-modify-write sequence).
     *  (c) Use FAILED_PRECONDITION if the client should not retry until
     *      the system state has been explicitly fixed. E.g., if an "rmdir"
     *      fails because the directory is non-empty, FAILED_PRECONDITION
     *      should be returned since the client should not retry unless
     *      they have first fixed up the directory by deleting files from it.
     *  (d) Use FAILED_PRECONDITION if the client performs conditional
     *      REST Get/Update/Delete on a resource and the resource on the
     *      server does not match the condition. E.g., conflicting
     *      read-modify-write on the same resource.
     */
    FAILED_PRECONDITION: "failed-precondition",
    /**
     * The operation was aborted, typically due to a concurrency issue like
     * sequencer check failures, transaction aborts, etc.
     *
     * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
     * and UNAVAILABLE.
     */
    ABORTED: "aborted",
    /**
     * Operation was attempted past the valid range. E.g., seeking or reading
     * past end of file.
     *
     * Unlike INVALID_ARGUMENT, this error indicates a problem that may be fixed
     * if the system state changes. For example, a 32-bit file system will
     * generate INVALID_ARGUMENT if asked to read at an offset that is not in the
     * range [0,2^32-1], but it will generate OUT_OF_RANGE if asked to read from
     * an offset past the current file size.
     *
     * There is a fair bit of overlap between FAILED_PRECONDITION and
     * OUT_OF_RANGE. We recommend using OUT_OF_RANGE (the more specific error)
     * when it applies so that callers who are iterating through a space can
     * easily look for an OUT_OF_RANGE error to detect when they are done.
     */
    OUT_OF_RANGE: "out-of-range",
    /** Operation is not implemented or not supported/enabled in this service. */
    UNIMPLEMENTED: "unimplemented",
    /**
     * Internal errors. Means some invariants expected by underlying System has
     * been broken. If you see one of these errors, Something is very broken.
     */
    INTERNAL: "internal",
    /**
     * The service is currently unavailable. This is a most likely a transient
     * condition and may be corrected by retrying with a backoff.
     *
     * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
     * and UNAVAILABLE.
     */
    UNAVAILABLE: "unavailable",
    /** Unrecoverable data loss or corruption. */
    DATA_LOSS: "data-loss"
  };
  var FirestoreError = class extends FirebaseError {
    /** @hideconstructor */
    constructor(e, t) {
      super(e, t), this.code = e, this.message = t, // HACK: We write a toString property directly because Error is not a real
      // class and so inheritance does not work correctly. We could alternatively
      // do the same "back-door inheritance" trick that FirebaseError does.
      this.toString = () => `${this.name}: [code=${this.code}]: ${this.message}`;
    }
  };
  var __PRIVATE_Deferred = class {
    constructor() {
      this.promise = new Promise((e, t) => {
        this.resolve = e, this.reject = t;
      });
    }
  };
  var __PRIVATE_OAuthToken = class {
    constructor(e, t) {
      this.user = t, this.type = "OAuth", this.headers = /* @__PURE__ */ new Map(), this.headers.set("Authorization", `Bearer ${e}`);
    }
  };
  var __PRIVATE_EmptyAuthCredentialsProvider = class {
    getToken() {
      return Promise.resolve(null);
    }
    invalidateToken() {
    }
    start(e, t) {
      e.enqueueRetryable(() => t(User.UNAUTHENTICATED));
    }
    shutdown() {
    }
  };
  var __PRIVATE_EmulatorAuthCredentialsProvider = class {
    constructor(e) {
      this.token = e, /**
       * Stores the listener registered with setChangeListener()
       * This isn't actually necessary since the UID never changes, but we use this
       * to verify the listen contract is adhered to in tests.
       */
      this.changeListener = null;
    }
    getToken() {
      return Promise.resolve(this.token);
    }
    invalidateToken() {
    }
    start(e, t) {
      this.changeListener = t, // Fire with initial user.
      e.enqueueRetryable(() => t(this.token.user));
    }
    shutdown() {
      this.changeListener = null;
    }
  };
  var __PRIVATE_FirebaseAuthCredentialsProvider = class {
    constructor(e) {
      this.t = e, /** Tracks the current User. */
      this.currentUser = User.UNAUTHENTICATED, /**
       * Counter used to detect if the token changed while a getToken request was
       * outstanding.
       */
      this.i = 0, this.forceRefresh = false, this.auth = null;
    }
    start(e, t) {
      __PRIVATE_hardAssert(void 0 === this.o);
      let n = this.i;
      const __PRIVATE_guardedChangeListener = (e2) => this.i !== n ? (n = this.i, t(e2)) : Promise.resolve();
      let r = new __PRIVATE_Deferred();
      this.o = () => {
        this.i++, this.currentUser = this.u(), r.resolve(), r = new __PRIVATE_Deferred(), e.enqueueRetryable(() => __PRIVATE_guardedChangeListener(this.currentUser));
      };
      const __PRIVATE_awaitNextToken = () => {
        const t2 = r;
        e.enqueueRetryable(async () => {
          await t2.promise, await __PRIVATE_guardedChangeListener(this.currentUser);
        });
      }, __PRIVATE_registerAuth = (e2) => {
        __PRIVATE_logDebug("FirebaseAuthCredentialsProvider", "Auth detected"), this.auth = e2, this.o && (this.auth.addAuthTokenListener(this.o), __PRIVATE_awaitNextToken());
      };
      this.t.onInit((e2) => __PRIVATE_registerAuth(e2)), // Our users can initialize Auth right after Firestore, so we give it
      // a chance to register itself with the component framework before we
      // determine whether to start up in unauthenticated mode.
      setTimeout(() => {
        if (!this.auth) {
          const e2 = this.t.getImmediate({
            optional: true
          });
          e2 ? __PRIVATE_registerAuth(e2) : (
            // If auth is still not available, proceed with `null` user
            (__PRIVATE_logDebug("FirebaseAuthCredentialsProvider", "Auth not yet detected"), r.resolve(), r = new __PRIVATE_Deferred())
          );
        }
      }, 0), __PRIVATE_awaitNextToken();
    }
    getToken() {
      const e = this.i, t = this.forceRefresh;
      return this.forceRefresh = false, this.auth ? this.auth.getToken(t).then((t2) => (
        // Cancel the request since the token changed while the request was
        // outstanding so the response is potentially for a previous user (which
        // user, we can't be sure).
        this.i !== e ? (__PRIVATE_logDebug("FirebaseAuthCredentialsProvider", "getToken aborted due to token change."), this.getToken()) : t2 ? (__PRIVATE_hardAssert("string" == typeof t2.accessToken), new __PRIVATE_OAuthToken(t2.accessToken, this.currentUser)) : null
      )) : Promise.resolve(null);
    }
    invalidateToken() {
      this.forceRefresh = true;
    }
    shutdown() {
      this.auth && this.o && this.auth.removeAuthTokenListener(this.o), this.o = void 0;
    }
    // Auth.getUid() can return null even with a user logged in. It is because
    // getUid() is synchronous, but the auth code populating Uid is asynchronous.
    // This method should only be called in the AuthTokenListener callback
    // to guarantee to get the actual user.
    u() {
      const e = this.auth && this.auth.getUid();
      return __PRIVATE_hardAssert(null === e || "string" == typeof e), new User(e);
    }
  };
  var __PRIVATE_FirstPartyToken = class {
    constructor(e, t, n) {
      this.l = e, this.h = t, this.P = n, this.type = "FirstParty", this.user = User.FIRST_PARTY, this.I = /* @__PURE__ */ new Map();
    }
    /**
     * Gets an authorization token, using a provided factory function, or return
     * null.
     */
    T() {
      return this.P ? this.P() : null;
    }
    get headers() {
      this.I.set("X-Goog-AuthUser", this.l);
      const e = this.T();
      return e && this.I.set("Authorization", e), this.h && this.I.set("X-Goog-Iam-Authorization-Token", this.h), this.I;
    }
  };
  var __PRIVATE_FirstPartyAuthCredentialsProvider = class {
    constructor(e, t, n) {
      this.l = e, this.h = t, this.P = n;
    }
    getToken() {
      return Promise.resolve(new __PRIVATE_FirstPartyToken(this.l, this.h, this.P));
    }
    start(e, t) {
      e.enqueueRetryable(() => t(User.FIRST_PARTY));
    }
    shutdown() {
    }
    invalidateToken() {
    }
  };
  var AppCheckToken = class {
    constructor(e) {
      this.value = e, this.type = "AppCheck", this.headers = /* @__PURE__ */ new Map(), e && e.length > 0 && this.headers.set("x-firebase-appcheck", this.value);
    }
  };
  var __PRIVATE_FirebaseAppCheckTokenProvider = class {
    constructor(e) {
      this.A = e, this.forceRefresh = false, this.appCheck = null, this.R = null;
    }
    start(e, t) {
      __PRIVATE_hardAssert(void 0 === this.o);
      const onTokenChanged = (e2) => {
        null != e2.error && __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", `Error getting App Check token; using placeholder token instead. Error: ${e2.error.message}`);
        const n = e2.token !== this.R;
        return this.R = e2.token, __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", `Received ${n ? "new" : "existing"} token.`), n ? t(e2.token) : Promise.resolve();
      };
      this.o = (t2) => {
        e.enqueueRetryable(() => onTokenChanged(t2));
      };
      const __PRIVATE_registerAppCheck = (e2) => {
        __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", "AppCheck detected"), this.appCheck = e2, this.o && this.appCheck.addTokenListener(this.o);
      };
      this.A.onInit((e2) => __PRIVATE_registerAppCheck(e2)), // Our users can initialize AppCheck after Firestore, so we give it
      // a chance to register itself with the component framework.
      setTimeout(() => {
        if (!this.appCheck) {
          const e2 = this.A.getImmediate({
            optional: true
          });
          e2 ? __PRIVATE_registerAppCheck(e2) : (
            // If AppCheck is still not available, proceed without it.
            __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", "AppCheck not yet detected")
          );
        }
      }, 0);
    }
    getToken() {
      const e = this.forceRefresh;
      return this.forceRefresh = false, this.appCheck ? this.appCheck.getToken(e).then((e2) => e2 ? (__PRIVATE_hardAssert("string" == typeof e2.token), this.R = e2.token, new AppCheckToken(e2.token)) : null) : Promise.resolve(null);
    }
    invalidateToken() {
      this.forceRefresh = true;
    }
    shutdown() {
      this.appCheck && this.o && this.appCheck.removeTokenListener(this.o), this.o = void 0;
    }
  };
  function __PRIVATE_randomBytes(e) {
    const t = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "undefined" != typeof self && (self.crypto || self.msCrypto)
    ), n = new Uint8Array(e);
    if (t && "function" == typeof t.getRandomValues) t.getRandomValues(n);
    else
      for (let t2 = 0; t2 < e; t2++) n[t2] = Math.floor(256 * Math.random());
    return n;
  }
  var __PRIVATE_AutoId = class {
    static newId() {
      const e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", t = Math.floor(256 / e.length) * e.length;
      let n = "";
      for (; n.length < 20; ) {
        const r = __PRIVATE_randomBytes(40);
        for (let i = 0; i < r.length; ++i)
          n.length < 20 && r[i] < t && (n += e.charAt(r[i] % e.length));
      }
      return n;
    }
  };
  function __PRIVATE_primitiveComparator(e, t) {
    return e < t ? -1 : e > t ? 1 : 0;
  }
  function __PRIVATE_arrayEquals(e, t, n) {
    return e.length === t.length && e.every((e2, r) => n(e2, t[r]));
  }
  var Timestamp = class _Timestamp {
    /**
     * Creates a new timestamp.
     *
     * @param seconds - The number of seconds of UTC time since Unix epoch
     *     1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
     *     9999-12-31T23:59:59Z inclusive.
     * @param nanoseconds - The non-negative fractions of a second at nanosecond
     *     resolution. Negative second values with fractions must still have
     *     non-negative nanoseconds values that count forward in time. Must be
     *     from 0 to 999,999,999 inclusive.
     */
    constructor(e, t) {
      if (this.seconds = e, this.nanoseconds = t, t < 0) throw new FirestoreError(D.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + t);
      if (t >= 1e9) throw new FirestoreError(D.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + t);
      if (e < -62135596800) throw new FirestoreError(D.INVALID_ARGUMENT, "Timestamp seconds out of range: " + e);
      if (e >= 253402300800) throw new FirestoreError(D.INVALID_ARGUMENT, "Timestamp seconds out of range: " + e);
    }
    /**
     * Creates a new timestamp with the current date, with millisecond precision.
     *
     * @returns a new timestamp representing the current date.
     */
    static now() {
      return _Timestamp.fromMillis(Date.now());
    }
    /**
     * Creates a new timestamp from the given date.
     *
     * @param date - The date to initialize the `Timestamp` from.
     * @returns A new `Timestamp` representing the same point in time as the given
     *     date.
     */
    static fromDate(e) {
      return _Timestamp.fromMillis(e.getTime());
    }
    /**
     * Creates a new timestamp from the given number of milliseconds.
     *
     * @param milliseconds - Number of milliseconds since Unix epoch
     *     1970-01-01T00:00:00Z.
     * @returns A new `Timestamp` representing the same point in time as the given
     *     number of milliseconds.
     */
    static fromMillis(e) {
      const t = Math.floor(e / 1e3), n = Math.floor(1e6 * (e - 1e3 * t));
      return new _Timestamp(t, n);
    }
    /**
     * Converts a `Timestamp` to a JavaScript `Date` object. This conversion
     * causes a loss of precision since `Date` objects only support millisecond
     * precision.
     *
     * @returns JavaScript `Date` object representing the same point in time as
     *     this `Timestamp`, with millisecond precision.
     */
    toDate() {
      return new Date(this.toMillis());
    }
    /**
     * Converts a `Timestamp` to a numeric timestamp (in milliseconds since
     * epoch). This operation causes a loss of precision.
     *
     * @returns The point in time corresponding to this timestamp, represented as
     *     the number of milliseconds since Unix epoch 1970-01-01T00:00:00Z.
     */
    toMillis() {
      return 1e3 * this.seconds + this.nanoseconds / 1e6;
    }
    _compareTo(e) {
      return this.seconds === e.seconds ? __PRIVATE_primitiveComparator(this.nanoseconds, e.nanoseconds) : __PRIVATE_primitiveComparator(this.seconds, e.seconds);
    }
    /**
     * Returns true if this `Timestamp` is equal to the provided one.
     *
     * @param other - The `Timestamp` to compare against.
     * @returns true if this `Timestamp` is equal to the provided one.
     */
    isEqual(e) {
      return e.seconds === this.seconds && e.nanoseconds === this.nanoseconds;
    }
    /** Returns a textual representation of this `Timestamp`. */
    toString() {
      return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
    }
    /** Returns a JSON-serializable representation of this `Timestamp`. */
    toJSON() {
      return {
        seconds: this.seconds,
        nanoseconds: this.nanoseconds
      };
    }
    /**
     * Converts this object to a primitive string, which allows `Timestamp` objects
     * to be compared using the `>`, `<=`, `>=` and `>` operators.
     */
    valueOf() {
      const e = this.seconds - -62135596800;
      return String(e).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
    }
  };
  var SnapshotVersion = class _SnapshotVersion {
    constructor(e) {
      this.timestamp = e;
    }
    static fromTimestamp(e) {
      return new _SnapshotVersion(e);
    }
    static min() {
      return new _SnapshotVersion(new Timestamp(0, 0));
    }
    static max() {
      return new _SnapshotVersion(new Timestamp(253402300799, 999999999));
    }
    compareTo(e) {
      return this.timestamp._compareTo(e.timestamp);
    }
    isEqual(e) {
      return this.timestamp.isEqual(e.timestamp);
    }
    /** Returns a number representation of the version for use in spec tests. */
    toMicroseconds() {
      return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
    }
    toString() {
      return "SnapshotVersion(" + this.timestamp.toString() + ")";
    }
    toTimestamp() {
      return this.timestamp;
    }
  };
  var BasePath = class _BasePath {
    constructor(e, t, n) {
      void 0 === t ? t = 0 : t > e.length && fail(), void 0 === n ? n = e.length - t : n > e.length - t && fail(), this.segments = e, this.offset = t, this.len = n;
    }
    get length() {
      return this.len;
    }
    isEqual(e) {
      return 0 === _BasePath.comparator(this, e);
    }
    child(e) {
      const t = this.segments.slice(this.offset, this.limit());
      return e instanceof _BasePath ? e.forEach((e2) => {
        t.push(e2);
      }) : t.push(e), this.construct(t);
    }
    /** The index of one past the last segment of the path. */
    limit() {
      return this.offset + this.length;
    }
    popFirst(e) {
      return e = void 0 === e ? 1 : e, this.construct(this.segments, this.offset + e, this.length - e);
    }
    popLast() {
      return this.construct(this.segments, this.offset, this.length - 1);
    }
    firstSegment() {
      return this.segments[this.offset];
    }
    lastSegment() {
      return this.get(this.length - 1);
    }
    get(e) {
      return this.segments[this.offset + e];
    }
    isEmpty() {
      return 0 === this.length;
    }
    isPrefixOf(e) {
      if (e.length < this.length) return false;
      for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return false;
      return true;
    }
    isImmediateParentOf(e) {
      if (this.length + 1 !== e.length) return false;
      for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return false;
      return true;
    }
    forEach(e) {
      for (let t = this.offset, n = this.limit(); t < n; t++) e(this.segments[t]);
    }
    toArray() {
      return this.segments.slice(this.offset, this.limit());
    }
    static comparator(e, t) {
      const n = Math.min(e.length, t.length);
      for (let r = 0; r < n; r++) {
        const n2 = e.get(r), i = t.get(r);
        if (n2 < i) return -1;
        if (n2 > i) return 1;
      }
      return e.length < t.length ? -1 : e.length > t.length ? 1 : 0;
    }
  };
  var ResourcePath = class _ResourcePath extends BasePath {
    construct(e, t, n) {
      return new _ResourcePath(e, t, n);
    }
    canonicalString() {
      return this.toArray().join("/");
    }
    toString() {
      return this.canonicalString();
    }
    /**
     * Returns a string representation of this path
     * where each path segment has been encoded with
     * `encodeURIComponent`.
     */
    toUriEncodedString() {
      return this.toArray().map(encodeURIComponent).join("/");
    }
    /**
     * Creates a resource path from the given slash-delimited string. If multiple
     * arguments are provided, all components are combined. Leading and trailing
     * slashes from all components are ignored.
     */
    static fromString(...e) {
      const t = [];
      for (const n of e) {
        if (n.indexOf("//") >= 0) throw new FirestoreError(D.INVALID_ARGUMENT, `Invalid segment (${n}). Paths must not contain // in them.`);
        t.push(...n.split("/").filter((e2) => e2.length > 0));
      }
      return new _ResourcePath(t);
    }
    static emptyPath() {
      return new _ResourcePath([]);
    }
  };
  var v = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
  var FieldPath$1 = class _FieldPath$1 extends BasePath {
    construct(e, t, n) {
      return new _FieldPath$1(e, t, n);
    }
    /**
     * Returns true if the string could be used as a segment in a field path
     * without escaping.
     */
    static isValidIdentifier(e) {
      return v.test(e);
    }
    canonicalString() {
      return this.toArray().map((e) => (e = e.replace(/\\/g, "\\\\").replace(/`/g, "\\`"), _FieldPath$1.isValidIdentifier(e) || (e = "`" + e + "`"), e)).join(".");
    }
    toString() {
      return this.canonicalString();
    }
    /**
     * Returns true if this field references the key of a document.
     */
    isKeyField() {
      return 1 === this.length && "__name__" === this.get(0);
    }
    /**
     * The field designating the key of a document.
     */
    static keyField() {
      return new _FieldPath$1(["__name__"]);
    }
    /**
     * Parses a field string from the given server-formatted string.
     *
     * - Splitting the empty string is not allowed (for now at least).
     * - Empty segments within the string (e.g. if there are two consecutive
     *   separators) are not allowed.
     *
     * TODO(b/37244157): we should make this more strict. Right now, it allows
     * non-identifier path components, even if they aren't escaped.
     */
    static fromServerFormat(e) {
      const t = [];
      let n = "", r = 0;
      const __PRIVATE_addCurrentSegment = () => {
        if (0 === n.length) throw new FirestoreError(D.INVALID_ARGUMENT, `Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
        t.push(n), n = "";
      };
      let i = false;
      for (; r < e.length; ) {
        const t2 = e[r];
        if ("\\" === t2) {
          if (r + 1 === e.length) throw new FirestoreError(D.INVALID_ARGUMENT, "Path has trailing escape character: " + e);
          const t3 = e[r + 1];
          if ("\\" !== t3 && "." !== t3 && "`" !== t3) throw new FirestoreError(D.INVALID_ARGUMENT, "Path has invalid escape sequence: " + e);
          n += t3, r += 2;
        } else "`" === t2 ? (i = !i, r++) : "." !== t2 || i ? (n += t2, r++) : (__PRIVATE_addCurrentSegment(), r++);
      }
      if (__PRIVATE_addCurrentSegment(), i) throw new FirestoreError(D.INVALID_ARGUMENT, "Unterminated ` in path: " + e);
      return new _FieldPath$1(t);
    }
    static emptyPath() {
      return new _FieldPath$1([]);
    }
  };
  var DocumentKey = class _DocumentKey {
    constructor(e) {
      this.path = e;
    }
    static fromPath(e) {
      return new _DocumentKey(ResourcePath.fromString(e));
    }
    static fromName(e) {
      return new _DocumentKey(ResourcePath.fromString(e).popFirst(5));
    }
    static empty() {
      return new _DocumentKey(ResourcePath.emptyPath());
    }
    get collectionGroup() {
      return this.path.popLast().lastSegment();
    }
    /** Returns true if the document is in the specified collectionId. */
    hasCollectionId(e) {
      return this.path.length >= 2 && this.path.get(this.path.length - 2) === e;
    }
    /** Returns the collection group (i.e. the name of the parent collection) for this key. */
    getCollectionGroup() {
      return this.path.get(this.path.length - 2);
    }
    /** Returns the fully qualified path to the parent collection. */
    getCollectionPath() {
      return this.path.popLast();
    }
    isEqual(e) {
      return null !== e && 0 === ResourcePath.comparator(this.path, e.path);
    }
    toString() {
      return this.path.toString();
    }
    static comparator(e, t) {
      return ResourcePath.comparator(e.path, t.path);
    }
    static isDocumentKey(e) {
      return e.length % 2 == 0;
    }
    /**
     * Creates and returns a new document key with the given segments.
     *
     * @param segments - The segments of the path to the document
     * @returns A new instance of DocumentKey
     */
    static fromSegments(e) {
      return new _DocumentKey(new ResourcePath(e.slice()));
    }
  };
  var FieldIndex = class {
    constructor(e, t, n, r) {
      this.indexId = e, this.collectionGroup = t, this.fields = n, this.indexState = r;
    }
  };
  FieldIndex.UNKNOWN_ID = -1;
  function __PRIVATE_newIndexOffsetSuccessorFromReadTime(e, t) {
    const n = e.toTimestamp().seconds, r = e.toTimestamp().nanoseconds + 1, i = SnapshotVersion.fromTimestamp(1e9 === r ? new Timestamp(n + 1, 0) : new Timestamp(n, r));
    return new IndexOffset(i, DocumentKey.empty(), t);
  }
  function __PRIVATE_newIndexOffsetFromDocument(e) {
    return new IndexOffset(e.readTime, e.key, -1);
  }
  var IndexOffset = class _IndexOffset {
    constructor(e, t, n) {
      this.readTime = e, this.documentKey = t, this.largestBatchId = n;
    }
    /** Returns an offset that sorts before all regular offsets. */
    static min() {
      return new _IndexOffset(SnapshotVersion.min(), DocumentKey.empty(), -1);
    }
    /** Returns an offset that sorts after all regular offsets. */
    static max() {
      return new _IndexOffset(SnapshotVersion.max(), DocumentKey.empty(), -1);
    }
  };
  function __PRIVATE_indexOffsetComparator(e, t) {
    let n = e.readTime.compareTo(t.readTime);
    return 0 !== n ? n : (n = DocumentKey.comparator(e.documentKey, t.documentKey), 0 !== n ? n : __PRIVATE_primitiveComparator(e.largestBatchId, t.largestBatchId));
  }
  var C = "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";
  var PersistenceTransaction = class {
    constructor() {
      this.onCommittedListeners = [];
    }
    addOnCommittedListener(e) {
      this.onCommittedListeners.push(e);
    }
    raiseOnCommittedEvent() {
      this.onCommittedListeners.forEach((e) => e());
    }
  };
  async function __PRIVATE_ignoreIfPrimaryLeaseLoss(e) {
    if (e.code !== D.FAILED_PRECONDITION || e.message !== C) throw e;
    __PRIVATE_logDebug("LocalStore", "Unexpectedly lost primary lease");
  }
  var PersistencePromise = class _PersistencePromise {
    constructor(e) {
      this.nextCallback = null, this.catchCallback = null, // When the operation resolves, we'll set result or error and mark isDone.
      this.result = void 0, this.error = void 0, this.isDone = false, // Set to true when .then() or .catch() are called and prevents additional
      // chaining.
      this.callbackAttached = false, e((e2) => {
        this.isDone = true, this.result = e2, this.nextCallback && // value should be defined unless T is Void, but we can't express
        // that in the type system.
        this.nextCallback(e2);
      }, (e2) => {
        this.isDone = true, this.error = e2, this.catchCallback && this.catchCallback(e2);
      });
    }
    catch(e) {
      return this.next(void 0, e);
    }
    next(e, t) {
      return this.callbackAttached && fail(), this.callbackAttached = true, this.isDone ? this.error ? this.wrapFailure(t, this.error) : this.wrapSuccess(e, this.result) : new _PersistencePromise((n, r) => {
        this.nextCallback = (t2) => {
          this.wrapSuccess(e, t2).next(n, r);
        }, this.catchCallback = (e2) => {
          this.wrapFailure(t, e2).next(n, r);
        };
      });
    }
    toPromise() {
      return new Promise((e, t) => {
        this.next(e, t);
      });
    }
    wrapUserFunction(e) {
      try {
        const t = e();
        return t instanceof _PersistencePromise ? t : _PersistencePromise.resolve(t);
      } catch (e2) {
        return _PersistencePromise.reject(e2);
      }
    }
    wrapSuccess(e, t) {
      return e ? this.wrapUserFunction(() => e(t)) : _PersistencePromise.resolve(t);
    }
    wrapFailure(e, t) {
      return e ? this.wrapUserFunction(() => e(t)) : _PersistencePromise.reject(t);
    }
    static resolve(e) {
      return new _PersistencePromise((t, n) => {
        t(e);
      });
    }
    static reject(e) {
      return new _PersistencePromise((t, n) => {
        n(e);
      });
    }
    static waitFor(e) {
      return new _PersistencePromise((t, n) => {
        let r = 0, i = 0, s = false;
        e.forEach((e2) => {
          ++r, e2.next(() => {
            ++i, s && i === r && t();
          }, (e3) => n(e3));
        }), s = true, i === r && t();
      });
    }
    /**
     * Given an array of predicate functions that asynchronously evaluate to a
     * boolean, implements a short-circuiting `or` between the results. Predicates
     * will be evaluated until one of them returns `true`, then stop. The final
     * result will be whether any of them returned `true`.
     */
    static or(e) {
      let t = _PersistencePromise.resolve(false);
      for (const n of e) t = t.next((e2) => e2 ? _PersistencePromise.resolve(e2) : n());
      return t;
    }
    static forEach(e, t) {
      const n = [];
      return e.forEach((e2, r) => {
        n.push(t.call(this, e2, r));
      }), this.waitFor(n);
    }
    /**
     * Concurrently map all array elements through asynchronous function.
     */
    static mapArray(e, t) {
      return new _PersistencePromise((n, r) => {
        const i = e.length, s = new Array(i);
        let o = 0;
        for (let _ = 0; _ < i; _++) {
          const a = _;
          t(e[a]).next((e2) => {
            s[a] = e2, ++o, o === i && n(s);
          }, (e2) => r(e2));
        }
      });
    }
    /**
     * An alternative to recursive PersistencePromise calls, that avoids
     * potential memory problems from unbounded chains of promises.
     *
     * The `action` will be called repeatedly while `condition` is true.
     */
    static doWhile(e, t) {
      return new _PersistencePromise((n, r) => {
        const process2 = () => {
          true === e() ? t().next(() => {
            process2();
          }, r) : n();
        };
        process2();
      });
    }
  };
  function __PRIVATE_getAndroidVersion(e) {
    const t = e.match(/Android ([\d.]+)/i), n = t ? t[1].split(".").slice(0, 2).join(".") : "-1";
    return Number(n);
  }
  function __PRIVATE_isIndexedDbTransactionError(e) {
    return "IndexedDbTransactionError" === e.name;
  }
  var __PRIVATE_ListenSequence = class {
    constructor(e, t) {
      this.previousValue = e, t && (t.sequenceNumberHandler = (e2) => this.ie(e2), this.se = (e2) => t.writeSequenceNumber(e2));
    }
    ie(e) {
      return this.previousValue = Math.max(e, this.previousValue), this.previousValue;
    }
    next() {
      const e = ++this.previousValue;
      return this.se && this.se(e), e;
    }
  };
  __PRIVATE_ListenSequence.oe = -1;
  function __PRIVATE_isNullOrUndefined(e) {
    return null == e;
  }
  function __PRIVATE_isNegativeZero(e) {
    return 0 === e && 1 / e == -1 / 0;
  }
  var H = [...[...[...[...["mutationQueues", "mutations", "documentMutations", "remoteDocuments", "targets", "owner", "targetGlobal", "targetDocuments"], "clientMetadata"], "remoteDocumentGlobal"], "collectionParents"], "bundles", "namedQueries"];
  var J = [...H, "documentOverlays"];
  var Y = ["mutationQueues", "mutations", "documentMutations", "remoteDocumentsV14", "targets", "owner", "targetGlobal", "targetDocuments", "clientMetadata", "remoteDocumentGlobal", "collectionParents", "bundles", "namedQueries", "documentOverlays"];
  var Z = Y;
  var X = [...Z, "indexConfiguration", "indexState", "indexEntries"];
  var te = [...X, "globals"];
  function __PRIVATE_objectSize(e) {
    let t = 0;
    for (const n in e) Object.prototype.hasOwnProperty.call(e, n) && t++;
    return t;
  }
  function forEach(e, t) {
    for (const n in e) Object.prototype.hasOwnProperty.call(e, n) && t(n, e[n]);
  }
  function isEmpty(e) {
    for (const t in e) if (Object.prototype.hasOwnProperty.call(e, t)) return false;
    return true;
  }
  var SortedMap = class _SortedMap {
    constructor(e, t) {
      this.comparator = e, this.root = t || LLRBNode.EMPTY;
    }
    // Returns a copy of the map, with the specified key/value added or replaced.
    insert(e, t) {
      return new _SortedMap(this.comparator, this.root.insert(e, t, this.comparator).copy(null, null, LLRBNode.BLACK, null, null));
    }
    // Returns a copy of the map, with the specified key removed.
    remove(e) {
      return new _SortedMap(this.comparator, this.root.remove(e, this.comparator).copy(null, null, LLRBNode.BLACK, null, null));
    }
    // Returns the value of the node with the given key, or null.
    get(e) {
      let t = this.root;
      for (; !t.isEmpty(); ) {
        const n = this.comparator(e, t.key);
        if (0 === n) return t.value;
        n < 0 ? t = t.left : n > 0 && (t = t.right);
      }
      return null;
    }
    // Returns the index of the element in this sorted map, or -1 if it doesn't
    // exist.
    indexOf(e) {
      let t = 0, n = this.root;
      for (; !n.isEmpty(); ) {
        const r = this.comparator(e, n.key);
        if (0 === r) return t + n.left.size;
        r < 0 ? n = n.left : (
          // Count all nodes left of the node plus the node itself
          (t += n.left.size + 1, n = n.right)
        );
      }
      return -1;
    }
    isEmpty() {
      return this.root.isEmpty();
    }
    // Returns the total number of nodes in the map.
    get size() {
      return this.root.size;
    }
    // Returns the minimum key in the map.
    minKey() {
      return this.root.minKey();
    }
    // Returns the maximum key in the map.
    maxKey() {
      return this.root.maxKey();
    }
    // Traverses the map in key order and calls the specified action function
    // for each key/value pair. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    inorderTraversal(e) {
      return this.root.inorderTraversal(e);
    }
    forEach(e) {
      this.inorderTraversal((t, n) => (e(t, n), false));
    }
    toString() {
      const e = [];
      return this.inorderTraversal((t, n) => (e.push(`${t}:${n}`), false)), `{${e.join(", ")}}`;
    }
    // Traverses the map in reverse key order and calls the specified action
    // function for each key/value pair. If action returns true, traversal is
    // aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    reverseTraversal(e) {
      return this.root.reverseTraversal(e);
    }
    // Returns an iterator over the SortedMap.
    getIterator() {
      return new SortedMapIterator(this.root, null, this.comparator, false);
    }
    getIteratorFrom(e) {
      return new SortedMapIterator(this.root, e, this.comparator, false);
    }
    getReverseIterator() {
      return new SortedMapIterator(this.root, null, this.comparator, true);
    }
    getReverseIteratorFrom(e) {
      return new SortedMapIterator(this.root, e, this.comparator, true);
    }
  };
  var SortedMapIterator = class {
    constructor(e, t, n, r) {
      this.isReverse = r, this.nodeStack = [];
      let i = 1;
      for (; !e.isEmpty(); ) if (i = t ? n(e.key, t) : 1, // flip the comparison if we're going in reverse
      t && r && (i *= -1), i < 0)
        e = this.isReverse ? e.left : e.right;
      else {
        if (0 === i) {
          this.nodeStack.push(e);
          break;
        }
        this.nodeStack.push(e), e = this.isReverse ? e.right : e.left;
      }
    }
    getNext() {
      let e = this.nodeStack.pop();
      const t = {
        key: e.key,
        value: e.value
      };
      if (this.isReverse) for (e = e.left; !e.isEmpty(); ) this.nodeStack.push(e), e = e.right;
      else for (e = e.right; !e.isEmpty(); ) this.nodeStack.push(e), e = e.left;
      return t;
    }
    hasNext() {
      return this.nodeStack.length > 0;
    }
    peek() {
      if (0 === this.nodeStack.length) return null;
      const e = this.nodeStack[this.nodeStack.length - 1];
      return {
        key: e.key,
        value: e.value
      };
    }
  };
  var LLRBNode = class _LLRBNode {
    constructor(e, t, n, r, i) {
      this.key = e, this.value = t, this.color = null != n ? n : _LLRBNode.RED, this.left = null != r ? r : _LLRBNode.EMPTY, this.right = null != i ? i : _LLRBNode.EMPTY, this.size = this.left.size + 1 + this.right.size;
    }
    // Returns a copy of the current node, optionally replacing pieces of it.
    copy(e, t, n, r, i) {
      return new _LLRBNode(null != e ? e : this.key, null != t ? t : this.value, null != n ? n : this.color, null != r ? r : this.left, null != i ? i : this.right);
    }
    isEmpty() {
      return false;
    }
    // Traverses the tree in key order and calls the specified action function
    // for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    inorderTraversal(e) {
      return this.left.inorderTraversal(e) || e(this.key, this.value) || this.right.inorderTraversal(e);
    }
    // Traverses the tree in reverse key order and calls the specified action
    // function for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    reverseTraversal(e) {
      return this.right.reverseTraversal(e) || e(this.key, this.value) || this.left.reverseTraversal(e);
    }
    // Returns the minimum node in the tree.
    min() {
      return this.left.isEmpty() ? this : this.left.min();
    }
    // Returns the maximum key in the tree.
    minKey() {
      return this.min().key;
    }
    // Returns the maximum key in the tree.
    maxKey() {
      return this.right.isEmpty() ? this.key : this.right.maxKey();
    }
    // Returns new tree, with the key/value added.
    insert(e, t, n) {
      let r = this;
      const i = n(e, r.key);
      return r = i < 0 ? r.copy(null, null, null, r.left.insert(e, t, n), null) : 0 === i ? r.copy(null, t, null, null, null) : r.copy(null, null, null, null, r.right.insert(e, t, n)), r.fixUp();
    }
    removeMin() {
      if (this.left.isEmpty()) return _LLRBNode.EMPTY;
      let e = this;
      return e.left.isRed() || e.left.left.isRed() || (e = e.moveRedLeft()), e = e.copy(null, null, null, e.left.removeMin(), null), e.fixUp();
    }
    // Returns new tree, with the specified item removed.
    remove(e, t) {
      let n, r = this;
      if (t(e, r.key) < 0) r.left.isEmpty() || r.left.isRed() || r.left.left.isRed() || (r = r.moveRedLeft()), r = r.copy(null, null, null, r.left.remove(e, t), null);
      else {
        if (r.left.isRed() && (r = r.rotateRight()), r.right.isEmpty() || r.right.isRed() || r.right.left.isRed() || (r = r.moveRedRight()), 0 === t(e, r.key)) {
          if (r.right.isEmpty()) return _LLRBNode.EMPTY;
          n = r.right.min(), r = r.copy(n.key, n.value, null, null, r.right.removeMin());
        }
        r = r.copy(null, null, null, null, r.right.remove(e, t));
      }
      return r.fixUp();
    }
    isRed() {
      return this.color;
    }
    // Returns new tree after performing any needed rotations.
    fixUp() {
      let e = this;
      return e.right.isRed() && !e.left.isRed() && (e = e.rotateLeft()), e.left.isRed() && e.left.left.isRed() && (e = e.rotateRight()), e.left.isRed() && e.right.isRed() && (e = e.colorFlip()), e;
    }
    moveRedLeft() {
      let e = this.colorFlip();
      return e.right.left.isRed() && (e = e.copy(null, null, null, null, e.right.rotateRight()), e = e.rotateLeft(), e = e.colorFlip()), e;
    }
    moveRedRight() {
      let e = this.colorFlip();
      return e.left.left.isRed() && (e = e.rotateRight(), e = e.colorFlip()), e;
    }
    rotateLeft() {
      const e = this.copy(null, null, _LLRBNode.RED, null, this.right.left);
      return this.right.copy(null, null, this.color, e, null);
    }
    rotateRight() {
      const e = this.copy(null, null, _LLRBNode.RED, this.left.right, null);
      return this.left.copy(null, null, this.color, null, e);
    }
    colorFlip() {
      const e = this.left.copy(null, null, !this.left.color, null, null), t = this.right.copy(null, null, !this.right.color, null, null);
      return this.copy(null, null, !this.color, e, t);
    }
    // For testing.
    checkMaxDepth() {
      const e = this.check();
      return Math.pow(2, e) <= this.size + 1;
    }
    // In a balanced RB tree, the black-depth (number of black nodes) from root to
    // leaves is equal on both sides.  This function verifies that or asserts.
    check() {
      if (this.isRed() && this.left.isRed()) throw fail();
      if (this.right.isRed()) throw fail();
      const e = this.left.check();
      if (e !== this.right.check()) throw fail();
      return e + (this.isRed() ? 0 : 1);
    }
  };
  LLRBNode.EMPTY = null, LLRBNode.RED = true, LLRBNode.BLACK = false;
  LLRBNode.EMPTY = new // Represents an empty node (a leaf node in the Red-Black Tree).
  class LLRBEmptyNode {
    constructor() {
      this.size = 0;
    }
    get key() {
      throw fail();
    }
    get value() {
      throw fail();
    }
    get color() {
      throw fail();
    }
    get left() {
      throw fail();
    }
    get right() {
      throw fail();
    }
    // Returns a copy of the current node.
    copy(e, t, n, r, i) {
      return this;
    }
    // Returns a copy of the tree, with the specified key/value added.
    insert(e, t, n) {
      return new LLRBNode(e, t);
    }
    // Returns a copy of the tree, with the specified key removed.
    remove(e, t) {
      return this;
    }
    isEmpty() {
      return true;
    }
    inorderTraversal(e) {
      return false;
    }
    reverseTraversal(e) {
      return false;
    }
    minKey() {
      return null;
    }
    maxKey() {
      return null;
    }
    isRed() {
      return false;
    }
    // For testing.
    checkMaxDepth() {
      return true;
    }
    check() {
      return 0;
    }
  }();
  var SortedSet = class _SortedSet {
    constructor(e) {
      this.comparator = e, this.data = new SortedMap(this.comparator);
    }
    has(e) {
      return null !== this.data.get(e);
    }
    first() {
      return this.data.minKey();
    }
    last() {
      return this.data.maxKey();
    }
    get size() {
      return this.data.size;
    }
    indexOf(e) {
      return this.data.indexOf(e);
    }
    /** Iterates elements in order defined by "comparator" */
    forEach(e) {
      this.data.inorderTraversal((t, n) => (e(t), false));
    }
    /** Iterates over `elem`s such that: range[0] &lt;= elem &lt; range[1]. */
    forEachInRange(e, t) {
      const n = this.data.getIteratorFrom(e[0]);
      for (; n.hasNext(); ) {
        const r = n.getNext();
        if (this.comparator(r.key, e[1]) >= 0) return;
        t(r.key);
      }
    }
    /**
     * Iterates over `elem`s such that: start &lt;= elem until false is returned.
     */
    forEachWhile(e, t) {
      let n;
      for (n = void 0 !== t ? this.data.getIteratorFrom(t) : this.data.getIterator(); n.hasNext(); ) {
        if (!e(n.getNext().key)) return;
      }
    }
    /** Finds the least element greater than or equal to `elem`. */
    firstAfterOrEqual(e) {
      const t = this.data.getIteratorFrom(e);
      return t.hasNext() ? t.getNext().key : null;
    }
    getIterator() {
      return new SortedSetIterator(this.data.getIterator());
    }
    getIteratorFrom(e) {
      return new SortedSetIterator(this.data.getIteratorFrom(e));
    }
    /** Inserts or updates an element */
    add(e) {
      return this.copy(this.data.remove(e).insert(e, true));
    }
    /** Deletes an element */
    delete(e) {
      return this.has(e) ? this.copy(this.data.remove(e)) : this;
    }
    isEmpty() {
      return this.data.isEmpty();
    }
    unionWith(e) {
      let t = this;
      return t.size < e.size && (t = e, e = this), e.forEach((e2) => {
        t = t.add(e2);
      }), t;
    }
    isEqual(e) {
      if (!(e instanceof _SortedSet)) return false;
      if (this.size !== e.size) return false;
      const t = this.data.getIterator(), n = e.data.getIterator();
      for (; t.hasNext(); ) {
        const e2 = t.getNext().key, r = n.getNext().key;
        if (0 !== this.comparator(e2, r)) return false;
      }
      return true;
    }
    toArray() {
      const e = [];
      return this.forEach((t) => {
        e.push(t);
      }), e;
    }
    toString() {
      const e = [];
      return this.forEach((t) => e.push(t)), "SortedSet(" + e.toString() + ")";
    }
    copy(e) {
      const t = new _SortedSet(this.comparator);
      return t.data = e, t;
    }
  };
  var SortedSetIterator = class {
    constructor(e) {
      this.iter = e;
    }
    getNext() {
      return this.iter.getNext().key;
    }
    hasNext() {
      return this.iter.hasNext();
    }
  };
  var FieldMask = class _FieldMask {
    constructor(e) {
      this.fields = e, // TODO(dimond): validation of FieldMask
      // Sort the field mask to support `FieldMask.isEqual()` and assert below.
      e.sort(FieldPath$1.comparator);
    }
    static empty() {
      return new _FieldMask([]);
    }
    /**
     * Returns a new FieldMask object that is the result of adding all the given
     * fields paths to this field mask.
     */
    unionWith(e) {
      let t = new SortedSet(FieldPath$1.comparator);
      for (const e2 of this.fields) t = t.add(e2);
      for (const n of e) t = t.add(n);
      return new _FieldMask(t.toArray());
    }
    /**
     * Verifies that `fieldPath` is included by at least one field in this field
     * mask.
     *
     * This is an O(n) operation, where `n` is the size of the field mask.
     */
    covers(e) {
      for (const t of this.fields) if (t.isPrefixOf(e)) return true;
      return false;
    }
    isEqual(e) {
      return __PRIVATE_arrayEquals(this.fields, e.fields, (e2, t) => e2.isEqual(t));
    }
  };
  var __PRIVATE_Base64DecodeError = class extends Error {
    constructor() {
      super(...arguments), this.name = "Base64DecodeError";
    }
  };
  var ByteString = class _ByteString {
    constructor(e) {
      this.binaryString = e;
    }
    static fromBase64String(e) {
      const t = function __PRIVATE_decodeBase64(e2) {
        try {
          return atob(e2);
        } catch (e3) {
          throw "undefined" != typeof DOMException && e3 instanceof DOMException ? new __PRIVATE_Base64DecodeError("Invalid base64 string: " + e3) : e3;
        }
      }(e);
      return new _ByteString(t);
    }
    static fromUint8Array(e) {
      const t = (
        /**
        * Helper function to convert an Uint8array to a binary string.
        */
        function __PRIVATE_binaryStringFromUint8Array(e2) {
          let t2 = "";
          for (let n = 0; n < e2.length; ++n) t2 += String.fromCharCode(e2[n]);
          return t2;
        }(e)
      );
      return new _ByteString(t);
    }
    [Symbol.iterator]() {
      let e = 0;
      return {
        next: () => e < this.binaryString.length ? {
          value: this.binaryString.charCodeAt(e++),
          done: false
        } : {
          value: void 0,
          done: true
        }
      };
    }
    toBase64() {
      return function __PRIVATE_encodeBase64(e) {
        return btoa(e);
      }(this.binaryString);
    }
    toUint8Array() {
      return function __PRIVATE_uint8ArrayFromBinaryString(e) {
        const t = new Uint8Array(e.length);
        for (let n = 0; n < e.length; n++) t[n] = e.charCodeAt(n);
        return t;
      }(this.binaryString);
    }
    approximateByteSize() {
      return 2 * this.binaryString.length;
    }
    compareTo(e) {
      return __PRIVATE_primitiveComparator(this.binaryString, e.binaryString);
    }
    isEqual(e) {
      return this.binaryString === e.binaryString;
    }
  };
  ByteString.EMPTY_BYTE_STRING = new ByteString("");
  var ne = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);
  function __PRIVATE_normalizeTimestamp(e) {
    if (__PRIVATE_hardAssert(!!e), "string" == typeof e) {
      let t = 0;
      const n = ne.exec(e);
      if (__PRIVATE_hardAssert(!!n), n[1]) {
        let e2 = n[1];
        e2 = (e2 + "000000000").substr(0, 9), t = Number(e2);
      }
      const r = new Date(e);
      return {
        seconds: Math.floor(r.getTime() / 1e3),
        nanos: t
      };
    }
    return {
      seconds: __PRIVATE_normalizeNumber(e.seconds),
      nanos: __PRIVATE_normalizeNumber(e.nanos)
    };
  }
  function __PRIVATE_normalizeNumber(e) {
    return "number" == typeof e ? e : "string" == typeof e ? Number(e) : 0;
  }
  function __PRIVATE_normalizeByteString(e) {
    return "string" == typeof e ? ByteString.fromBase64String(e) : ByteString.fromUint8Array(e);
  }
  function __PRIVATE_isServerTimestamp(e) {
    var t, n;
    return "server_timestamp" === (null === (n = ((null === (t = null == e ? void 0 : e.mapValue) || void 0 === t ? void 0 : t.fields) || {}).__type__) || void 0 === n ? void 0 : n.stringValue);
  }
  function __PRIVATE_getPreviousValue(e) {
    const t = e.mapValue.fields.__previous_value__;
    return __PRIVATE_isServerTimestamp(t) ? __PRIVATE_getPreviousValue(t) : t;
  }
  function __PRIVATE_getLocalWriteTime(e) {
    const t = __PRIVATE_normalizeTimestamp(e.mapValue.fields.__local_write_time__.timestampValue);
    return new Timestamp(t.seconds, t.nanos);
  }
  var DatabaseInfo = class {
    /**
     * Constructs a DatabaseInfo using the provided host, databaseId and
     * persistenceKey.
     *
     * @param databaseId - The database to use.
     * @param appId - The Firebase App Id.
     * @param persistenceKey - A unique identifier for this Firestore's local
     * storage (used in conjunction with the databaseId).
     * @param host - The Firestore backend host to connect to.
     * @param ssl - Whether to use SSL when connecting.
     * @param forceLongPolling - Whether to use the forceLongPolling option
     * when using WebChannel as the network transport.
     * @param autoDetectLongPolling - Whether to use the detectBufferingProxy
     * option when using WebChannel as the network transport.
     * @param longPollingOptions Options that configure long-polling.
     * @param useFetchStreams Whether to use the Fetch API instead of
     * XMLHTTPRequest
     */
    constructor(e, t, n, r, i, s, o, _, a) {
      this.databaseId = e, this.appId = t, this.persistenceKey = n, this.host = r, this.ssl = i, this.forceLongPolling = s, this.autoDetectLongPolling = o, this.longPollingOptions = _, this.useFetchStreams = a;
    }
  };
  var DatabaseId = class _DatabaseId {
    constructor(e, t) {
      this.projectId = e, this.database = t || "(default)";
    }
    static empty() {
      return new _DatabaseId("", "");
    }
    get isDefaultDatabase() {
      return "(default)" === this.database;
    }
    isEqual(e) {
      return e instanceof _DatabaseId && e.projectId === this.projectId && e.database === this.database;
    }
  };
  var re = {
    mapValue: {
      fields: {
        __type__: {
          stringValue: "__max__"
        }
      }
    }
  };
  function __PRIVATE_typeOrder(e) {
    return "nullValue" in e ? 0 : "booleanValue" in e ? 1 : "integerValue" in e || "doubleValue" in e ? 2 : "timestampValue" in e ? 3 : "stringValue" in e ? 5 : "bytesValue" in e ? 6 : "referenceValue" in e ? 7 : "geoPointValue" in e ? 8 : "arrayValue" in e ? 9 : "mapValue" in e ? __PRIVATE_isServerTimestamp(e) ? 4 : __PRIVATE_isMaxValue(e) ? 9007199254740991 : __PRIVATE_isVectorValue(e) ? 10 : 11 : fail();
  }
  function __PRIVATE_valueEquals(e, t) {
    if (e === t) return true;
    const n = __PRIVATE_typeOrder(e);
    if (n !== __PRIVATE_typeOrder(t)) return false;
    switch (n) {
      case 0:
      case 9007199254740991:
        return true;
      case 1:
        return e.booleanValue === t.booleanValue;
      case 4:
        return __PRIVATE_getLocalWriteTime(e).isEqual(__PRIVATE_getLocalWriteTime(t));
      case 3:
        return function __PRIVATE_timestampEquals(e2, t2) {
          if ("string" == typeof e2.timestampValue && "string" == typeof t2.timestampValue && e2.timestampValue.length === t2.timestampValue.length)
            return e2.timestampValue === t2.timestampValue;
          const n2 = __PRIVATE_normalizeTimestamp(e2.timestampValue), r = __PRIVATE_normalizeTimestamp(t2.timestampValue);
          return n2.seconds === r.seconds && n2.nanos === r.nanos;
        }(e, t);
      case 5:
        return e.stringValue === t.stringValue;
      case 6:
        return function __PRIVATE_blobEquals(e2, t2) {
          return __PRIVATE_normalizeByteString(e2.bytesValue).isEqual(__PRIVATE_normalizeByteString(t2.bytesValue));
        }(e, t);
      case 7:
        return e.referenceValue === t.referenceValue;
      case 8:
        return function __PRIVATE_geoPointEquals(e2, t2) {
          return __PRIVATE_normalizeNumber(e2.geoPointValue.latitude) === __PRIVATE_normalizeNumber(t2.geoPointValue.latitude) && __PRIVATE_normalizeNumber(e2.geoPointValue.longitude) === __PRIVATE_normalizeNumber(t2.geoPointValue.longitude);
        }(e, t);
      case 2:
        return function __PRIVATE_numberEquals(e2, t2) {
          if ("integerValue" in e2 && "integerValue" in t2) return __PRIVATE_normalizeNumber(e2.integerValue) === __PRIVATE_normalizeNumber(t2.integerValue);
          if ("doubleValue" in e2 && "doubleValue" in t2) {
            const n2 = __PRIVATE_normalizeNumber(e2.doubleValue), r = __PRIVATE_normalizeNumber(t2.doubleValue);
            return n2 === r ? __PRIVATE_isNegativeZero(n2) === __PRIVATE_isNegativeZero(r) : isNaN(n2) && isNaN(r);
          }
          return false;
        }(e, t);
      case 9:
        return __PRIVATE_arrayEquals(e.arrayValue.values || [], t.arrayValue.values || [], __PRIVATE_valueEquals);
      case 10:
      case 11:
        return function __PRIVATE_objectEquals(e2, t2) {
          const n2 = e2.mapValue.fields || {}, r = t2.mapValue.fields || {};
          if (__PRIVATE_objectSize(n2) !== __PRIVATE_objectSize(r)) return false;
          for (const e3 in n2) if (n2.hasOwnProperty(e3) && (void 0 === r[e3] || !__PRIVATE_valueEquals(n2[e3], r[e3]))) return false;
          return true;
        }(e, t);
      default:
        return fail();
    }
  }
  function __PRIVATE_arrayValueContains(e, t) {
    return void 0 !== (e.values || []).find((e2) => __PRIVATE_valueEquals(e2, t));
  }
  function __PRIVATE_valueCompare(e, t) {
    if (e === t) return 0;
    const n = __PRIVATE_typeOrder(e), r = __PRIVATE_typeOrder(t);
    if (n !== r) return __PRIVATE_primitiveComparator(n, r);
    switch (n) {
      case 0:
      case 9007199254740991:
        return 0;
      case 1:
        return __PRIVATE_primitiveComparator(e.booleanValue, t.booleanValue);
      case 2:
        return function __PRIVATE_compareNumbers(e2, t2) {
          const n2 = __PRIVATE_normalizeNumber(e2.integerValue || e2.doubleValue), r2 = __PRIVATE_normalizeNumber(t2.integerValue || t2.doubleValue);
          return n2 < r2 ? -1 : n2 > r2 ? 1 : n2 === r2 ? 0 : (
            // one or both are NaN.
            isNaN(n2) ? isNaN(r2) ? 0 : -1 : 1
          );
        }(e, t);
      case 3:
        return __PRIVATE_compareTimestamps(e.timestampValue, t.timestampValue);
      case 4:
        return __PRIVATE_compareTimestamps(__PRIVATE_getLocalWriteTime(e), __PRIVATE_getLocalWriteTime(t));
      case 5:
        return __PRIVATE_primitiveComparator(e.stringValue, t.stringValue);
      case 6:
        return function __PRIVATE_compareBlobs(e2, t2) {
          const n2 = __PRIVATE_normalizeByteString(e2), r2 = __PRIVATE_normalizeByteString(t2);
          return n2.compareTo(r2);
        }(e.bytesValue, t.bytesValue);
      case 7:
        return function __PRIVATE_compareReferences(e2, t2) {
          const n2 = e2.split("/"), r2 = t2.split("/");
          for (let e3 = 0; e3 < n2.length && e3 < r2.length; e3++) {
            const t3 = __PRIVATE_primitiveComparator(n2[e3], r2[e3]);
            if (0 !== t3) return t3;
          }
          return __PRIVATE_primitiveComparator(n2.length, r2.length);
        }(e.referenceValue, t.referenceValue);
      case 8:
        return function __PRIVATE_compareGeoPoints(e2, t2) {
          const n2 = __PRIVATE_primitiveComparator(__PRIVATE_normalizeNumber(e2.latitude), __PRIVATE_normalizeNumber(t2.latitude));
          if (0 !== n2) return n2;
          return __PRIVATE_primitiveComparator(__PRIVATE_normalizeNumber(e2.longitude), __PRIVATE_normalizeNumber(t2.longitude));
        }(e.geoPointValue, t.geoPointValue);
      case 9:
        return __PRIVATE_compareArrays(e.arrayValue, t.arrayValue);
      case 10:
        return function __PRIVATE_compareVectors(e2, t2) {
          var n2, r2, i, s;
          const o = e2.fields || {}, _ = t2.fields || {}, a = null === (n2 = o.value) || void 0 === n2 ? void 0 : n2.arrayValue, u = null === (r2 = _.value) || void 0 === r2 ? void 0 : r2.arrayValue, c = __PRIVATE_primitiveComparator((null === (i = null == a ? void 0 : a.values) || void 0 === i ? void 0 : i.length) || 0, (null === (s = null == u ? void 0 : u.values) || void 0 === s ? void 0 : s.length) || 0);
          if (0 !== c) return c;
          return __PRIVATE_compareArrays(a, u);
        }(e.mapValue, t.mapValue);
      case 11:
        return function __PRIVATE_compareMaps(e2, t2) {
          if (e2 === re.mapValue && t2 === re.mapValue) return 0;
          if (e2 === re.mapValue) return 1;
          if (t2 === re.mapValue) return -1;
          const n2 = e2.fields || {}, r2 = Object.keys(n2), i = t2.fields || {}, s = Object.keys(i);
          r2.sort(), s.sort();
          for (let e3 = 0; e3 < r2.length && e3 < s.length; ++e3) {
            const t3 = __PRIVATE_primitiveComparator(r2[e3], s[e3]);
            if (0 !== t3) return t3;
            const o = __PRIVATE_valueCompare(n2[r2[e3]], i[s[e3]]);
            if (0 !== o) return o;
          }
          return __PRIVATE_primitiveComparator(r2.length, s.length);
        }(e.mapValue, t.mapValue);
      default:
        throw fail();
    }
  }
  function __PRIVATE_compareTimestamps(e, t) {
    if ("string" == typeof e && "string" == typeof t && e.length === t.length) return __PRIVATE_primitiveComparator(e, t);
    const n = __PRIVATE_normalizeTimestamp(e), r = __PRIVATE_normalizeTimestamp(t), i = __PRIVATE_primitiveComparator(n.seconds, r.seconds);
    return 0 !== i ? i : __PRIVATE_primitiveComparator(n.nanos, r.nanos);
  }
  function __PRIVATE_compareArrays(e, t) {
    const n = e.values || [], r = t.values || [];
    for (let e2 = 0; e2 < n.length && e2 < r.length; ++e2) {
      const t2 = __PRIVATE_valueCompare(n[e2], r[e2]);
      if (t2) return t2;
    }
    return __PRIVATE_primitiveComparator(n.length, r.length);
  }
  function canonicalId(e) {
    return __PRIVATE_canonifyValue(e);
  }
  function __PRIVATE_canonifyValue(e) {
    return "nullValue" in e ? "null" : "booleanValue" in e ? "" + e.booleanValue : "integerValue" in e ? "" + e.integerValue : "doubleValue" in e ? "" + e.doubleValue : "timestampValue" in e ? function __PRIVATE_canonifyTimestamp(e2) {
      const t = __PRIVATE_normalizeTimestamp(e2);
      return `time(${t.seconds},${t.nanos})`;
    }(e.timestampValue) : "stringValue" in e ? e.stringValue : "bytesValue" in e ? function __PRIVATE_canonifyByteString(e2) {
      return __PRIVATE_normalizeByteString(e2).toBase64();
    }(e.bytesValue) : "referenceValue" in e ? function __PRIVATE_canonifyReference(e2) {
      return DocumentKey.fromName(e2).toString();
    }(e.referenceValue) : "geoPointValue" in e ? function __PRIVATE_canonifyGeoPoint(e2) {
      return `geo(${e2.latitude},${e2.longitude})`;
    }(e.geoPointValue) : "arrayValue" in e ? function __PRIVATE_canonifyArray(e2) {
      let t = "[", n = true;
      for (const r of e2.values || []) n ? n = false : t += ",", t += __PRIVATE_canonifyValue(r);
      return t + "]";
    }(e.arrayValue) : "mapValue" in e ? function __PRIVATE_canonifyMap(e2) {
      const t = Object.keys(e2.fields || {}).sort();
      let n = "{", r = true;
      for (const i of t) r ? r = false : n += ",", n += `${i}:${__PRIVATE_canonifyValue(e2.fields[i])}`;
      return n + "}";
    }(e.mapValue) : fail();
  }
  function isInteger(e) {
    return !!e && "integerValue" in e;
  }
  function isArray(e) {
    return !!e && "arrayValue" in e;
  }
  function __PRIVATE_isNullValue(e) {
    return !!e && "nullValue" in e;
  }
  function __PRIVATE_isNanValue(e) {
    return !!e && "doubleValue" in e && isNaN(Number(e.doubleValue));
  }
  function __PRIVATE_isMapValue(e) {
    return !!e && "mapValue" in e;
  }
  function __PRIVATE_isVectorValue(e) {
    var t, n;
    return "__vector__" === (null === (n = ((null === (t = null == e ? void 0 : e.mapValue) || void 0 === t ? void 0 : t.fields) || {}).__type__) || void 0 === n ? void 0 : n.stringValue);
  }
  function __PRIVATE_deepClone(e) {
    if (e.geoPointValue) return {
      geoPointValue: Object.assign({}, e.geoPointValue)
    };
    if (e.timestampValue && "object" == typeof e.timestampValue) return {
      timestampValue: Object.assign({}, e.timestampValue)
    };
    if (e.mapValue) {
      const t = {
        mapValue: {
          fields: {}
        }
      };
      return forEach(e.mapValue.fields, (e2, n) => t.mapValue.fields[e2] = __PRIVATE_deepClone(n)), t;
    }
    if (e.arrayValue) {
      const t = {
        arrayValue: {
          values: []
        }
      };
      for (let n = 0; n < (e.arrayValue.values || []).length; ++n) t.arrayValue.values[n] = __PRIVATE_deepClone(e.arrayValue.values[n]);
      return t;
    }
    return Object.assign({}, e);
  }
  function __PRIVATE_isMaxValue(e) {
    return "__max__" === (((e.mapValue || {}).fields || {}).__type__ || {}).stringValue;
  }
  var ObjectValue = class _ObjectValue {
    constructor(e) {
      this.value = e;
    }
    static empty() {
      return new _ObjectValue({
        mapValue: {}
      });
    }
    /**
     * Returns the value at the given path or null.
     *
     * @param path - the path to search
     * @returns The value at the path or null if the path is not set.
     */
    field(e) {
      if (e.isEmpty()) return this.value;
      {
        let t = this.value;
        for (let n = 0; n < e.length - 1; ++n) if (t = (t.mapValue.fields || {})[e.get(n)], !__PRIVATE_isMapValue(t)) return null;
        return t = (t.mapValue.fields || {})[e.lastSegment()], t || null;
      }
    }
    /**
     * Sets the field to the provided value.
     *
     * @param path - The field path to set.
     * @param value - The value to set.
     */
    set(e, t) {
      this.getFieldsMap(e.popLast())[e.lastSegment()] = __PRIVATE_deepClone(t);
    }
    /**
     * Sets the provided fields to the provided values.
     *
     * @param data - A map of fields to values (or null for deletes).
     */
    setAll(e) {
      let t = FieldPath$1.emptyPath(), n = {}, r = [];
      e.forEach((e2, i2) => {
        if (!t.isImmediateParentOf(i2)) {
          const e3 = this.getFieldsMap(t);
          this.applyChanges(e3, n, r), n = {}, r = [], t = i2.popLast();
        }
        e2 ? n[i2.lastSegment()] = __PRIVATE_deepClone(e2) : r.push(i2.lastSegment());
      });
      const i = this.getFieldsMap(t);
      this.applyChanges(i, n, r);
    }
    /**
     * Removes the field at the specified path. If there is no field at the
     * specified path, nothing is changed.
     *
     * @param path - The field path to remove.
     */
    delete(e) {
      const t = this.field(e.popLast());
      __PRIVATE_isMapValue(t) && t.mapValue.fields && delete t.mapValue.fields[e.lastSegment()];
    }
    isEqual(e) {
      return __PRIVATE_valueEquals(this.value, e.value);
    }
    /**
     * Returns the map that contains the leaf element of `path`. If the parent
     * entry does not yet exist, or if it is not a map, a new map will be created.
     */
    getFieldsMap(e) {
      let t = this.value;
      t.mapValue.fields || (t.mapValue = {
        fields: {}
      });
      for (let n = 0; n < e.length; ++n) {
        let r = t.mapValue.fields[e.get(n)];
        __PRIVATE_isMapValue(r) && r.mapValue.fields || (r = {
          mapValue: {
            fields: {}
          }
        }, t.mapValue.fields[e.get(n)] = r), t = r;
      }
      return t.mapValue.fields;
    }
    /**
     * Modifies `fieldsMap` by adding, replacing or deleting the specified
     * entries.
     */
    applyChanges(e, t, n) {
      forEach(t, (t2, n2) => e[t2] = n2);
      for (const t2 of n) delete e[t2];
    }
    clone() {
      return new _ObjectValue(__PRIVATE_deepClone(this.value));
    }
  };
  var MutableDocument = class _MutableDocument {
    constructor(e, t, n, r, i, s, o) {
      this.key = e, this.documentType = t, this.version = n, this.readTime = r, this.createTime = i, this.data = s, this.documentState = o;
    }
    /**
     * Creates a document with no known version or data, but which can serve as
     * base document for mutations.
     */
    static newInvalidDocument(e) {
      return new _MutableDocument(
        e,
        0,
        /* version */
        SnapshotVersion.min(),
        /* readTime */
        SnapshotVersion.min(),
        /* createTime */
        SnapshotVersion.min(),
        ObjectValue.empty(),
        0
        /* DocumentState.SYNCED */
      );
    }
    /**
     * Creates a new document that is known to exist with the given data at the
     * given version.
     */
    static newFoundDocument(e, t, n, r) {
      return new _MutableDocument(
        e,
        1,
        /* version */
        t,
        /* readTime */
        SnapshotVersion.min(),
        /* createTime */
        n,
        r,
        0
        /* DocumentState.SYNCED */
      );
    }
    /** Creates a new document that is known to not exist at the given version. */
    static newNoDocument(e, t) {
      return new _MutableDocument(
        e,
        2,
        /* version */
        t,
        /* readTime */
        SnapshotVersion.min(),
        /* createTime */
        SnapshotVersion.min(),
        ObjectValue.empty(),
        0
        /* DocumentState.SYNCED */
      );
    }
    /**
     * Creates a new document that is known to exist at the given version but
     * whose data is not known (e.g. a document that was updated without a known
     * base document).
     */
    static newUnknownDocument(e, t) {
      return new _MutableDocument(
        e,
        3,
        /* version */
        t,
        /* readTime */
        SnapshotVersion.min(),
        /* createTime */
        SnapshotVersion.min(),
        ObjectValue.empty(),
        2
        /* DocumentState.HAS_COMMITTED_MUTATIONS */
      );
    }
    /**
     * Changes the document type to indicate that it exists and that its version
     * and data are known.
     */
    convertToFoundDocument(e, t) {
      return !this.createTime.isEqual(SnapshotVersion.min()) || 2 !== this.documentType && 0 !== this.documentType || (this.createTime = e), this.version = e, this.documentType = 1, this.data = t, this.documentState = 0, this;
    }
    /**
     * Changes the document type to indicate that it doesn't exist at the given
     * version.
     */
    convertToNoDocument(e) {
      return this.version = e, this.documentType = 2, this.data = ObjectValue.empty(), this.documentState = 0, this;
    }
    /**
     * Changes the document type to indicate that it exists at a given version but
     * that its data is not known (e.g. a document that was updated without a known
     * base document).
     */
    convertToUnknownDocument(e) {
      return this.version = e, this.documentType = 3, this.data = ObjectValue.empty(), this.documentState = 2, this;
    }
    setHasCommittedMutations() {
      return this.documentState = 2, this;
    }
    setHasLocalMutations() {
      return this.documentState = 1, this.version = SnapshotVersion.min(), this;
    }
    setReadTime(e) {
      return this.readTime = e, this;
    }
    get hasLocalMutations() {
      return 1 === this.documentState;
    }
    get hasCommittedMutations() {
      return 2 === this.documentState;
    }
    get hasPendingWrites() {
      return this.hasLocalMutations || this.hasCommittedMutations;
    }
    isValidDocument() {
      return 0 !== this.documentType;
    }
    isFoundDocument() {
      return 1 === this.documentType;
    }
    isNoDocument() {
      return 2 === this.documentType;
    }
    isUnknownDocument() {
      return 3 === this.documentType;
    }
    isEqual(e) {
      return e instanceof _MutableDocument && this.key.isEqual(e.key) && this.version.isEqual(e.version) && this.documentType === e.documentType && this.documentState === e.documentState && this.data.isEqual(e.data);
    }
    mutableCopy() {
      return new _MutableDocument(this.key, this.documentType, this.version, this.readTime, this.createTime, this.data.clone(), this.documentState);
    }
    toString() {
      return `Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`;
    }
  };
  var Bound = class {
    constructor(e, t) {
      this.position = e, this.inclusive = t;
    }
  };
  function __PRIVATE_boundCompareToDocument(e, t, n) {
    let r = 0;
    for (let i = 0; i < e.position.length; i++) {
      const s = t[i], o = e.position[i];
      if (s.field.isKeyField()) r = DocumentKey.comparator(DocumentKey.fromName(o.referenceValue), n.key);
      else {
        r = __PRIVATE_valueCompare(o, n.data.field(s.field));
      }
      if ("desc" === s.dir && (r *= -1), 0 !== r) break;
    }
    return r;
  }
  function __PRIVATE_boundEquals(e, t) {
    if (null === e) return null === t;
    if (null === t) return false;
    if (e.inclusive !== t.inclusive || e.position.length !== t.position.length) return false;
    for (let n = 0; n < e.position.length; n++) {
      if (!__PRIVATE_valueEquals(e.position[n], t.position[n])) return false;
    }
    return true;
  }
  var OrderBy = class {
    constructor(e, t = "asc") {
      this.field = e, this.dir = t;
    }
  };
  function __PRIVATE_orderByEquals(e, t) {
    return e.dir === t.dir && e.field.isEqual(t.field);
  }
  var Filter = class {
  };
  var FieldFilter = class _FieldFilter extends Filter {
    constructor(e, t, n) {
      super(), this.field = e, this.op = t, this.value = n;
    }
    /**
     * Creates a filter based on the provided arguments.
     */
    static create(e, t, n) {
      return e.isKeyField() ? "in" === t || "not-in" === t ? this.createKeyFieldInFilter(e, t, n) : new __PRIVATE_KeyFieldFilter(e, t, n) : "array-contains" === t ? new __PRIVATE_ArrayContainsFilter(e, n) : "in" === t ? new __PRIVATE_InFilter(e, n) : "not-in" === t ? new __PRIVATE_NotInFilter(e, n) : "array-contains-any" === t ? new __PRIVATE_ArrayContainsAnyFilter(e, n) : new _FieldFilter(e, t, n);
    }
    static createKeyFieldInFilter(e, t, n) {
      return "in" === t ? new __PRIVATE_KeyFieldInFilter(e, n) : new __PRIVATE_KeyFieldNotInFilter(e, n);
    }
    matches(e) {
      const t = e.data.field(this.field);
      return "!=" === this.op ? null !== t && this.matchesComparison(__PRIVATE_valueCompare(t, this.value)) : null !== t && __PRIVATE_typeOrder(this.value) === __PRIVATE_typeOrder(t) && this.matchesComparison(__PRIVATE_valueCompare(t, this.value));
    }
    matchesComparison(e) {
      switch (this.op) {
        case "<":
          return e < 0;
        case "<=":
          return e <= 0;
        case "==":
          return 0 === e;
        case "!=":
          return 0 !== e;
        case ">":
          return e > 0;
        case ">=":
          return e >= 0;
        default:
          return fail();
      }
    }
    isInequality() {
      return [
        "<",
        "<=",
        ">",
        ">=",
        "!=",
        "not-in"
        /* Operator.NOT_IN */
      ].indexOf(this.op) >= 0;
    }
    getFlattenedFilters() {
      return [this];
    }
    getFilters() {
      return [this];
    }
  };
  var CompositeFilter = class _CompositeFilter extends Filter {
    constructor(e, t) {
      super(), this.filters = e, this.op = t, this.ae = null;
    }
    /**
     * Creates a filter based on the provided arguments.
     */
    static create(e, t) {
      return new _CompositeFilter(e, t);
    }
    matches(e) {
      return __PRIVATE_compositeFilterIsConjunction(this) ? void 0 === this.filters.find((t) => !t.matches(e)) : void 0 !== this.filters.find((t) => t.matches(e));
    }
    getFlattenedFilters() {
      return null !== this.ae || (this.ae = this.filters.reduce((e, t) => e.concat(t.getFlattenedFilters()), [])), this.ae;
    }
    // Returns a mutable copy of `this.filters`
    getFilters() {
      return Object.assign([], this.filters);
    }
  };
  function __PRIVATE_compositeFilterIsConjunction(e) {
    return "and" === e.op;
  }
  function __PRIVATE_compositeFilterIsFlatConjunction(e) {
    return __PRIVATE_compositeFilterIsFlat(e) && __PRIVATE_compositeFilterIsConjunction(e);
  }
  function __PRIVATE_compositeFilterIsFlat(e) {
    for (const t of e.filters) if (t instanceof CompositeFilter) return false;
    return true;
  }
  function __PRIVATE_canonifyFilter(e) {
    if (e instanceof FieldFilter)
      return e.field.canonicalString() + e.op.toString() + canonicalId(e.value);
    if (__PRIVATE_compositeFilterIsFlatConjunction(e))
      return e.filters.map((e2) => __PRIVATE_canonifyFilter(e2)).join(",");
    {
      const t = e.filters.map((e2) => __PRIVATE_canonifyFilter(e2)).join(",");
      return `${e.op}(${t})`;
    }
  }
  function __PRIVATE_filterEquals(e, t) {
    return e instanceof FieldFilter ? function __PRIVATE_fieldFilterEquals(e2, t2) {
      return t2 instanceof FieldFilter && e2.op === t2.op && e2.field.isEqual(t2.field) && __PRIVATE_valueEquals(e2.value, t2.value);
    }(e, t) : e instanceof CompositeFilter ? function __PRIVATE_compositeFilterEquals(e2, t2) {
      if (t2 instanceof CompositeFilter && e2.op === t2.op && e2.filters.length === t2.filters.length) {
        return e2.filters.reduce((e3, n, r) => e3 && __PRIVATE_filterEquals(n, t2.filters[r]), true);
      }
      return false;
    }(e, t) : void fail();
  }
  function __PRIVATE_stringifyFilter(e) {
    return e instanceof FieldFilter ? function __PRIVATE_stringifyFieldFilter(e2) {
      return `${e2.field.canonicalString()} ${e2.op} ${canonicalId(e2.value)}`;
    }(e) : e instanceof CompositeFilter ? function __PRIVATE_stringifyCompositeFilter(e2) {
      return e2.op.toString() + " {" + e2.getFilters().map(__PRIVATE_stringifyFilter).join(" ,") + "}";
    }(e) : "Filter";
  }
  var __PRIVATE_KeyFieldFilter = class extends FieldFilter {
    constructor(e, t, n) {
      super(e, t, n), this.key = DocumentKey.fromName(n.referenceValue);
    }
    matches(e) {
      const t = DocumentKey.comparator(e.key, this.key);
      return this.matchesComparison(t);
    }
  };
  var __PRIVATE_KeyFieldInFilter = class extends FieldFilter {
    constructor(e, t) {
      super(e, "in", t), this.keys = __PRIVATE_extractDocumentKeysFromArrayValue("in", t);
    }
    matches(e) {
      return this.keys.some((t) => t.isEqual(e.key));
    }
  };
  var __PRIVATE_KeyFieldNotInFilter = class extends FieldFilter {
    constructor(e, t) {
      super(e, "not-in", t), this.keys = __PRIVATE_extractDocumentKeysFromArrayValue("not-in", t);
    }
    matches(e) {
      return !this.keys.some((t) => t.isEqual(e.key));
    }
  };
  function __PRIVATE_extractDocumentKeysFromArrayValue(e, t) {
    var n;
    return ((null === (n = t.arrayValue) || void 0 === n ? void 0 : n.values) || []).map((e2) => DocumentKey.fromName(e2.referenceValue));
  }
  var __PRIVATE_ArrayContainsFilter = class extends FieldFilter {
    constructor(e, t) {
      super(e, "array-contains", t);
    }
    matches(e) {
      const t = e.data.field(this.field);
      return isArray(t) && __PRIVATE_arrayValueContains(t.arrayValue, this.value);
    }
  };
  var __PRIVATE_InFilter = class extends FieldFilter {
    constructor(e, t) {
      super(e, "in", t);
    }
    matches(e) {
      const t = e.data.field(this.field);
      return null !== t && __PRIVATE_arrayValueContains(this.value.arrayValue, t);
    }
  };
  var __PRIVATE_NotInFilter = class extends FieldFilter {
    constructor(e, t) {
      super(e, "not-in", t);
    }
    matches(e) {
      if (__PRIVATE_arrayValueContains(this.value.arrayValue, {
        nullValue: "NULL_VALUE"
      })) return false;
      const t = e.data.field(this.field);
      return null !== t && !__PRIVATE_arrayValueContains(this.value.arrayValue, t);
    }
  };
  var __PRIVATE_ArrayContainsAnyFilter = class extends FieldFilter {
    constructor(e, t) {
      super(e, "array-contains-any", t);
    }
    matches(e) {
      const t = e.data.field(this.field);
      return !(!isArray(t) || !t.arrayValue.values) && t.arrayValue.values.some((e2) => __PRIVATE_arrayValueContains(this.value.arrayValue, e2));
    }
  };
  var __PRIVATE_TargetImpl = class {
    constructor(e, t = null, n = [], r = [], i = null, s = null, o = null) {
      this.path = e, this.collectionGroup = t, this.orderBy = n, this.filters = r, this.limit = i, this.startAt = s, this.endAt = o, this.ue = null;
    }
  };
  function __PRIVATE_newTarget(e, t = null, n = [], r = [], i = null, s = null, o = null) {
    return new __PRIVATE_TargetImpl(e, t, n, r, i, s, o);
  }
  function __PRIVATE_canonifyTarget(e) {
    const t = __PRIVATE_debugCast(e);
    if (null === t.ue) {
      let e2 = t.path.canonicalString();
      null !== t.collectionGroup && (e2 += "|cg:" + t.collectionGroup), e2 += "|f:", e2 += t.filters.map((e3) => __PRIVATE_canonifyFilter(e3)).join(","), e2 += "|ob:", e2 += t.orderBy.map((e3) => function __PRIVATE_canonifyOrderBy(e4) {
        return e4.field.canonicalString() + e4.dir;
      }(e3)).join(","), __PRIVATE_isNullOrUndefined(t.limit) || (e2 += "|l:", e2 += t.limit), t.startAt && (e2 += "|lb:", e2 += t.startAt.inclusive ? "b:" : "a:", e2 += t.startAt.position.map((e3) => canonicalId(e3)).join(",")), t.endAt && (e2 += "|ub:", e2 += t.endAt.inclusive ? "a:" : "b:", e2 += t.endAt.position.map((e3) => canonicalId(e3)).join(",")), t.ue = e2;
    }
    return t.ue;
  }
  function __PRIVATE_targetEquals(e, t) {
    if (e.limit !== t.limit) return false;
    if (e.orderBy.length !== t.orderBy.length) return false;
    for (let n = 0; n < e.orderBy.length; n++) if (!__PRIVATE_orderByEquals(e.orderBy[n], t.orderBy[n])) return false;
    if (e.filters.length !== t.filters.length) return false;
    for (let n = 0; n < e.filters.length; n++) if (!__PRIVATE_filterEquals(e.filters[n], t.filters[n])) return false;
    return e.collectionGroup === t.collectionGroup && (!!e.path.isEqual(t.path) && (!!__PRIVATE_boundEquals(e.startAt, t.startAt) && __PRIVATE_boundEquals(e.endAt, t.endAt)));
  }
  function __PRIVATE_targetIsDocumentTarget(e) {
    return DocumentKey.isDocumentKey(e.path) && null === e.collectionGroup && 0 === e.filters.length;
  }
  var __PRIVATE_QueryImpl = class {
    /**
     * Initializes a Query with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     */
    constructor(e, t = null, n = [], r = [], i = null, s = "F", o = null, _ = null) {
      this.path = e, this.collectionGroup = t, this.explicitOrderBy = n, this.filters = r, this.limit = i, this.limitType = s, this.startAt = o, this.endAt = _, this.ce = null, // The corresponding `Target` of this `Query` instance, for use with
      // non-aggregate queries.
      this.le = null, // The corresponding `Target` of this `Query` instance, for use with
      // aggregate queries. Unlike targets for non-aggregate queries,
      // aggregate query targets do not contain normalized order-bys, they only
      // contain explicit order-bys.
      this.he = null, this.startAt, this.endAt;
    }
  };
  function __PRIVATE_newQuery(e, t, n, r, i, s, o, _) {
    return new __PRIVATE_QueryImpl(e, t, n, r, i, s, o, _);
  }
  function __PRIVATE_newQueryForPath(e) {
    return new __PRIVATE_QueryImpl(e);
  }
  function __PRIVATE_queryMatchesAllDocuments(e) {
    return 0 === e.filters.length && null === e.limit && null == e.startAt && null == e.endAt && (0 === e.explicitOrderBy.length || 1 === e.explicitOrderBy.length && e.explicitOrderBy[0].field.isKeyField());
  }
  function __PRIVATE_isCollectionGroupQuery(e) {
    return null !== e.collectionGroup;
  }
  function __PRIVATE_queryNormalizedOrderBy(e) {
    const t = __PRIVATE_debugCast(e);
    if (null === t.ce) {
      t.ce = [];
      const e2 = /* @__PURE__ */ new Set();
      for (const n2 of t.explicitOrderBy) t.ce.push(n2), e2.add(n2.field.canonicalString());
      const n = t.explicitOrderBy.length > 0 ? t.explicitOrderBy[t.explicitOrderBy.length - 1].dir : "asc", r = function __PRIVATE_getInequalityFilterFields(e3) {
        let t2 = new SortedSet(FieldPath$1.comparator);
        return e3.filters.forEach((e4) => {
          e4.getFlattenedFilters().forEach((e5) => {
            e5.isInequality() && (t2 = t2.add(e5.field));
          });
        }), t2;
      }(t);
      r.forEach((r2) => {
        e2.has(r2.canonicalString()) || r2.isKeyField() || t.ce.push(new OrderBy(r2, n));
      }), // Add the document key field to the last if it is not explicitly ordered.
      e2.has(FieldPath$1.keyField().canonicalString()) || t.ce.push(new OrderBy(FieldPath$1.keyField(), n));
    }
    return t.ce;
  }
  function __PRIVATE_queryToTarget(e) {
    const t = __PRIVATE_debugCast(e);
    return t.le || (t.le = __PRIVATE__queryToTarget(t, __PRIVATE_queryNormalizedOrderBy(e))), t.le;
  }
  function __PRIVATE__queryToTarget(e, t) {
    if ("F" === e.limitType) return __PRIVATE_newTarget(e.path, e.collectionGroup, t, e.filters, e.limit, e.startAt, e.endAt);
    {
      t = t.map((e2) => {
        const t2 = "desc" === e2.dir ? "asc" : "desc";
        return new OrderBy(e2.field, t2);
      });
      const n = e.endAt ? new Bound(e.endAt.position, e.endAt.inclusive) : null, r = e.startAt ? new Bound(e.startAt.position, e.startAt.inclusive) : null;
      return __PRIVATE_newTarget(e.path, e.collectionGroup, t, e.filters, e.limit, n, r);
    }
  }
  function __PRIVATE_queryWithLimit(e, t, n) {
    return new __PRIVATE_QueryImpl(e.path, e.collectionGroup, e.explicitOrderBy.slice(), e.filters.slice(), t, n, e.startAt, e.endAt);
  }
  function __PRIVATE_queryEquals(e, t) {
    return __PRIVATE_targetEquals(__PRIVATE_queryToTarget(e), __PRIVATE_queryToTarget(t)) && e.limitType === t.limitType;
  }
  function __PRIVATE_canonifyQuery(e) {
    return `${__PRIVATE_canonifyTarget(__PRIVATE_queryToTarget(e))}|lt:${e.limitType}`;
  }
  function __PRIVATE_stringifyQuery(e) {
    return `Query(target=${function __PRIVATE_stringifyTarget(e2) {
      let t = e2.path.canonicalString();
      return null !== e2.collectionGroup && (t += " collectionGroup=" + e2.collectionGroup), e2.filters.length > 0 && (t += `, filters: [${e2.filters.map((e3) => __PRIVATE_stringifyFilter(e3)).join(", ")}]`), __PRIVATE_isNullOrUndefined(e2.limit) || (t += ", limit: " + e2.limit), e2.orderBy.length > 0 && (t += `, orderBy: [${e2.orderBy.map((e3) => function __PRIVATE_stringifyOrderBy(e4) {
        return `${e4.field.canonicalString()} (${e4.dir})`;
      }(e3)).join(", ")}]`), e2.startAt && (t += ", startAt: ", t += e2.startAt.inclusive ? "b:" : "a:", t += e2.startAt.position.map((e3) => canonicalId(e3)).join(",")), e2.endAt && (t += ", endAt: ", t += e2.endAt.inclusive ? "a:" : "b:", t += e2.endAt.position.map((e3) => canonicalId(e3)).join(",")), `Target(${t})`;
    }(__PRIVATE_queryToTarget(e))}; limitType=${e.limitType})`;
  }
  function __PRIVATE_queryMatches(e, t) {
    return t.isFoundDocument() && function __PRIVATE_queryMatchesPathAndCollectionGroup(e2, t2) {
      const n = t2.key.path;
      return null !== e2.collectionGroup ? t2.key.hasCollectionId(e2.collectionGroup) && e2.path.isPrefixOf(n) : DocumentKey.isDocumentKey(e2.path) ? e2.path.isEqual(n) : e2.path.isImmediateParentOf(n);
    }(e, t) && function __PRIVATE_queryMatchesOrderBy(e2, t2) {
      for (const n of __PRIVATE_queryNormalizedOrderBy(e2))
        if (!n.field.isKeyField() && null === t2.data.field(n.field)) return false;
      return true;
    }(e, t) && function __PRIVATE_queryMatchesFilters(e2, t2) {
      for (const n of e2.filters) if (!n.matches(t2)) return false;
      return true;
    }(e, t) && function __PRIVATE_queryMatchesBounds(e2, t2) {
      if (e2.startAt && !/**
      * Returns true if a document sorts before a bound using the provided sort
      * order.
      */
      function __PRIVATE_boundSortsBeforeDocument(e3, t3, n) {
        const r = __PRIVATE_boundCompareToDocument(e3, t3, n);
        return e3.inclusive ? r <= 0 : r < 0;
      }(e2.startAt, __PRIVATE_queryNormalizedOrderBy(e2), t2)) return false;
      if (e2.endAt && !function __PRIVATE_boundSortsAfterDocument(e3, t3, n) {
        const r = __PRIVATE_boundCompareToDocument(e3, t3, n);
        return e3.inclusive ? r >= 0 : r > 0;
      }(e2.endAt, __PRIVATE_queryNormalizedOrderBy(e2), t2)) return false;
      return true;
    }(e, t);
  }
  function __PRIVATE_queryCollectionGroup(e) {
    return e.collectionGroup || (e.path.length % 2 == 1 ? e.path.lastSegment() : e.path.get(e.path.length - 2));
  }
  function __PRIVATE_newQueryComparator(e) {
    return (t, n) => {
      let r = false;
      for (const i of __PRIVATE_queryNormalizedOrderBy(e)) {
        const e2 = __PRIVATE_compareDocs(i, t, n);
        if (0 !== e2) return e2;
        r = r || i.field.isKeyField();
      }
      return 0;
    };
  }
  function __PRIVATE_compareDocs(e, t, n) {
    const r = e.field.isKeyField() ? DocumentKey.comparator(t.key, n.key) : function __PRIVATE_compareDocumentsByField(e2, t2, n2) {
      const r2 = t2.data.field(e2), i = n2.data.field(e2);
      return null !== r2 && null !== i ? __PRIVATE_valueCompare(r2, i) : fail();
    }(e.field, t, n);
    switch (e.dir) {
      case "asc":
        return r;
      case "desc":
        return -1 * r;
      default:
        return fail();
    }
  }
  var ObjectMap = class {
    constructor(e, t) {
      this.mapKeyFn = e, this.equalsFn = t, /**
       * The inner map for a key/value pair. Due to the possibility of collisions we
       * keep a list of entries that we do a linear search through to find an actual
       * match. Note that collisions should be rare, so we still expect near
       * constant time lookups in practice.
       */
      this.inner = {}, /** The number of entries stored in the map */
      this.innerSize = 0;
    }
    /** Get a value for this key, or undefined if it does not exist. */
    get(e) {
      const t = this.mapKeyFn(e), n = this.inner[t];
      if (void 0 !== n) {
        for (const [t2, r] of n) if (this.equalsFn(t2, e)) return r;
      }
    }
    has(e) {
      return void 0 !== this.get(e);
    }
    /** Put this key and value in the map. */
    set(e, t) {
      const n = this.mapKeyFn(e), r = this.inner[n];
      if (void 0 === r) return this.inner[n] = [[e, t]], void this.innerSize++;
      for (let n2 = 0; n2 < r.length; n2++) if (this.equalsFn(r[n2][0], e))
        return void (r[n2] = [e, t]);
      r.push([e, t]), this.innerSize++;
    }
    /**
     * Remove this key from the map. Returns a boolean if anything was deleted.
     */
    delete(e) {
      const t = this.mapKeyFn(e), n = this.inner[t];
      if (void 0 === n) return false;
      for (let r = 0; r < n.length; r++) if (this.equalsFn(n[r][0], e)) return 1 === n.length ? delete this.inner[t] : n.splice(r, 1), this.innerSize--, true;
      return false;
    }
    forEach(e) {
      forEach(this.inner, (t, n) => {
        for (const [t2, r] of n) e(t2, r);
      });
    }
    isEmpty() {
      return isEmpty(this.inner);
    }
    size() {
      return this.innerSize;
    }
  };
  var oe = new SortedMap(DocumentKey.comparator);
  function __PRIVATE_mutableDocumentMap() {
    return oe;
  }
  var _e = new SortedMap(DocumentKey.comparator);
  function documentMap(...e) {
    let t = _e;
    for (const n of e) t = t.insert(n.key, n);
    return t;
  }
  function __PRIVATE_convertOverlayedDocumentMapToDocumentMap(e) {
    let t = _e;
    return e.forEach((e2, n) => t = t.insert(e2, n.overlayedDocument)), t;
  }
  function __PRIVATE_newOverlayMap() {
    return __PRIVATE_newDocumentKeyMap();
  }
  function __PRIVATE_newMutationMap() {
    return __PRIVATE_newDocumentKeyMap();
  }
  function __PRIVATE_newDocumentKeyMap() {
    return new ObjectMap((e) => e.toString(), (e, t) => e.isEqual(t));
  }
  var ae = new SortedMap(DocumentKey.comparator);
  var ue = new SortedSet(DocumentKey.comparator);
  function __PRIVATE_documentKeySet(...e) {
    let t = ue;
    for (const n of e) t = t.add(n);
    return t;
  }
  var ce = new SortedSet(__PRIVATE_primitiveComparator);
  function __PRIVATE_targetIdSet() {
    return ce;
  }
  function __PRIVATE_toDouble(e, t) {
    if (e.useProto3Json) {
      if (isNaN(t)) return {
        doubleValue: "NaN"
      };
      if (t === 1 / 0) return {
        doubleValue: "Infinity"
      };
      if (t === -1 / 0) return {
        doubleValue: "-Infinity"
      };
    }
    return {
      doubleValue: __PRIVATE_isNegativeZero(t) ? "-0" : t
    };
  }
  function __PRIVATE_toInteger(e) {
    return {
      integerValue: "" + e
    };
  }
  var TransformOperation = class {
    constructor() {
      this._ = void 0;
    }
  };
  function __PRIVATE_applyTransformOperationToLocalView(e, t, n) {
    return e instanceof __PRIVATE_ServerTimestampTransform ? function serverTimestamp$1(e2, t2) {
      const n2 = {
        fields: {
          __type__: {
            stringValue: "server_timestamp"
          },
          __local_write_time__: {
            timestampValue: {
              seconds: e2.seconds,
              nanos: e2.nanoseconds
            }
          }
        }
      };
      return t2 && __PRIVATE_isServerTimestamp(t2) && (t2 = __PRIVATE_getPreviousValue(t2)), t2 && (n2.fields.__previous_value__ = t2), {
        mapValue: n2
      };
    }(n, t) : e instanceof __PRIVATE_ArrayUnionTransformOperation ? __PRIVATE_applyArrayUnionTransformOperation(e, t) : e instanceof __PRIVATE_ArrayRemoveTransformOperation ? __PRIVATE_applyArrayRemoveTransformOperation(e, t) : function __PRIVATE_applyNumericIncrementTransformOperationToLocalView(e2, t2) {
      const n2 = __PRIVATE_computeTransformOperationBaseValue(e2, t2), r = asNumber(n2) + asNumber(e2.Pe);
      return isInteger(n2) && isInteger(e2.Pe) ? __PRIVATE_toInteger(r) : __PRIVATE_toDouble(e2.serializer, r);
    }(e, t);
  }
  function __PRIVATE_applyTransformOperationToRemoteDocument(e, t, n) {
    return e instanceof __PRIVATE_ArrayUnionTransformOperation ? __PRIVATE_applyArrayUnionTransformOperation(e, t) : e instanceof __PRIVATE_ArrayRemoveTransformOperation ? __PRIVATE_applyArrayRemoveTransformOperation(e, t) : n;
  }
  function __PRIVATE_computeTransformOperationBaseValue(e, t) {
    return e instanceof __PRIVATE_NumericIncrementTransformOperation ? (
      /** Returns true if `value` is either an IntegerValue or a DoubleValue. */
      function __PRIVATE_isNumber(e2) {
        return isInteger(e2) || function __PRIVATE_isDouble(e3) {
          return !!e3 && "doubleValue" in e3;
        }(e2);
      }(t) ? t : {
        integerValue: 0
      }
    ) : null;
  }
  var __PRIVATE_ServerTimestampTransform = class extends TransformOperation {
  };
  var __PRIVATE_ArrayUnionTransformOperation = class extends TransformOperation {
    constructor(e) {
      super(), this.elements = e;
    }
  };
  function __PRIVATE_applyArrayUnionTransformOperation(e, t) {
    const n = __PRIVATE_coercedFieldValuesArray(t);
    for (const t2 of e.elements) n.some((e2) => __PRIVATE_valueEquals(e2, t2)) || n.push(t2);
    return {
      arrayValue: {
        values: n
      }
    };
  }
  var __PRIVATE_ArrayRemoveTransformOperation = class extends TransformOperation {
    constructor(e) {
      super(), this.elements = e;
    }
  };
  function __PRIVATE_applyArrayRemoveTransformOperation(e, t) {
    let n = __PRIVATE_coercedFieldValuesArray(t);
    for (const t2 of e.elements) n = n.filter((e2) => !__PRIVATE_valueEquals(e2, t2));
    return {
      arrayValue: {
        values: n
      }
    };
  }
  var __PRIVATE_NumericIncrementTransformOperation = class extends TransformOperation {
    constructor(e, t) {
      super(), this.serializer = e, this.Pe = t;
    }
  };
  function asNumber(e) {
    return __PRIVATE_normalizeNumber(e.integerValue || e.doubleValue);
  }
  function __PRIVATE_coercedFieldValuesArray(e) {
    return isArray(e) && e.arrayValue.values ? e.arrayValue.values.slice() : [];
  }
  function __PRIVATE_fieldTransformEquals(e, t) {
    return e.field.isEqual(t.field) && function __PRIVATE_transformOperationEquals(e2, t2) {
      return e2 instanceof __PRIVATE_ArrayUnionTransformOperation && t2 instanceof __PRIVATE_ArrayUnionTransformOperation || e2 instanceof __PRIVATE_ArrayRemoveTransformOperation && t2 instanceof __PRIVATE_ArrayRemoveTransformOperation ? __PRIVATE_arrayEquals(e2.elements, t2.elements, __PRIVATE_valueEquals) : e2 instanceof __PRIVATE_NumericIncrementTransformOperation && t2 instanceof __PRIVATE_NumericIncrementTransformOperation ? __PRIVATE_valueEquals(e2.Pe, t2.Pe) : e2 instanceof __PRIVATE_ServerTimestampTransform && t2 instanceof __PRIVATE_ServerTimestampTransform;
    }(e.transform, t.transform);
  }
  var Precondition = class _Precondition {
    constructor(e, t) {
      this.updateTime = e, this.exists = t;
    }
    /** Creates a new empty Precondition. */
    static none() {
      return new _Precondition();
    }
    /** Creates a new Precondition with an exists flag. */
    static exists(e) {
      return new _Precondition(void 0, e);
    }
    /** Creates a new Precondition based on a version a document exists at. */
    static updateTime(e) {
      return new _Precondition(e);
    }
    /** Returns whether this Precondition is empty. */
    get isNone() {
      return void 0 === this.updateTime && void 0 === this.exists;
    }
    isEqual(e) {
      return this.exists === e.exists && (this.updateTime ? !!e.updateTime && this.updateTime.isEqual(e.updateTime) : !e.updateTime);
    }
  };
  function __PRIVATE_preconditionIsValidForDocument(e, t) {
    return void 0 !== e.updateTime ? t.isFoundDocument() && t.version.isEqual(e.updateTime) : void 0 === e.exists || e.exists === t.isFoundDocument();
  }
  var Mutation = class {
  };
  function __PRIVATE_calculateOverlayMutation(e, t) {
    if (!e.hasLocalMutations || t && 0 === t.fields.length) return null;
    if (null === t) return e.isNoDocument() ? new __PRIVATE_DeleteMutation(e.key, Precondition.none()) : new __PRIVATE_SetMutation(e.key, e.data, Precondition.none());
    {
      const n = e.data, r = ObjectValue.empty();
      let i = new SortedSet(FieldPath$1.comparator);
      for (let e2 of t.fields) if (!i.has(e2)) {
        let t2 = n.field(e2);
        null === t2 && e2.length > 1 && (e2 = e2.popLast(), t2 = n.field(e2)), null === t2 ? r.delete(e2) : r.set(e2, t2), i = i.add(e2);
      }
      return new __PRIVATE_PatchMutation(e.key, r, new FieldMask(i.toArray()), Precondition.none());
    }
  }
  function __PRIVATE_mutationApplyToRemoteDocument(e, t, n) {
    e instanceof __PRIVATE_SetMutation ? function __PRIVATE_setMutationApplyToRemoteDocument(e2, t2, n2) {
      const r = e2.value.clone(), i = __PRIVATE_serverTransformResults(e2.fieldTransforms, t2, n2.transformResults);
      r.setAll(i), t2.convertToFoundDocument(n2.version, r).setHasCommittedMutations();
    }(e, t, n) : e instanceof __PRIVATE_PatchMutation ? function __PRIVATE_patchMutationApplyToRemoteDocument(e2, t2, n2) {
      if (!__PRIVATE_preconditionIsValidForDocument(e2.precondition, t2))
        return void t2.convertToUnknownDocument(n2.version);
      const r = __PRIVATE_serverTransformResults(e2.fieldTransforms, t2, n2.transformResults), i = t2.data;
      i.setAll(__PRIVATE_getPatch(e2)), i.setAll(r), t2.convertToFoundDocument(n2.version, i).setHasCommittedMutations();
    }(e, t, n) : function __PRIVATE_deleteMutationApplyToRemoteDocument(e2, t2, n2) {
      t2.convertToNoDocument(n2.version).setHasCommittedMutations();
    }(0, t, n);
  }
  function __PRIVATE_mutationApplyToLocalView(e, t, n, r) {
    return e instanceof __PRIVATE_SetMutation ? function __PRIVATE_setMutationApplyToLocalView(e2, t2, n2, r2) {
      if (!__PRIVATE_preconditionIsValidForDocument(e2.precondition, t2))
        return n2;
      const i = e2.value.clone(), s = __PRIVATE_localTransformResults(e2.fieldTransforms, r2, t2);
      return i.setAll(s), t2.convertToFoundDocument(t2.version, i).setHasLocalMutations(), null;
    }(e, t, n, r) : e instanceof __PRIVATE_PatchMutation ? function __PRIVATE_patchMutationApplyToLocalView(e2, t2, n2, r2) {
      if (!__PRIVATE_preconditionIsValidForDocument(e2.precondition, t2)) return n2;
      const i = __PRIVATE_localTransformResults(e2.fieldTransforms, r2, t2), s = t2.data;
      if (s.setAll(__PRIVATE_getPatch(e2)), s.setAll(i), t2.convertToFoundDocument(t2.version, s).setHasLocalMutations(), null === n2) return null;
      return n2.unionWith(e2.fieldMask.fields).unionWith(e2.fieldTransforms.map((e3) => e3.field));
    }(e, t, n, r) : function __PRIVATE_deleteMutationApplyToLocalView(e2, t2, n2) {
      if (__PRIVATE_preconditionIsValidForDocument(e2.precondition, t2)) return t2.convertToNoDocument(t2.version).setHasLocalMutations(), null;
      return n2;
    }(e, t, n);
  }
  function __PRIVATE_mutationEquals(e, t) {
    return e.type === t.type && (!!e.key.isEqual(t.key) && (!!e.precondition.isEqual(t.precondition) && (!!function __PRIVATE_fieldTransformsAreEqual(e2, t2) {
      return void 0 === e2 && void 0 === t2 || !(!e2 || !t2) && __PRIVATE_arrayEquals(e2, t2, (e3, t3) => __PRIVATE_fieldTransformEquals(e3, t3));
    }(e.fieldTransforms, t.fieldTransforms) && (0 === e.type ? e.value.isEqual(t.value) : 1 !== e.type || e.data.isEqual(t.data) && e.fieldMask.isEqual(t.fieldMask)))));
  }
  var __PRIVATE_SetMutation = class extends Mutation {
    constructor(e, t, n, r = []) {
      super(), this.key = e, this.value = t, this.precondition = n, this.fieldTransforms = r, this.type = 0;
    }
    getFieldMask() {
      return null;
    }
  };
  var __PRIVATE_PatchMutation = class extends Mutation {
    constructor(e, t, n, r, i = []) {
      super(), this.key = e, this.data = t, this.fieldMask = n, this.precondition = r, this.fieldTransforms = i, this.type = 1;
    }
    getFieldMask() {
      return this.fieldMask;
    }
  };
  function __PRIVATE_getPatch(e) {
    const t = /* @__PURE__ */ new Map();
    return e.fieldMask.fields.forEach((n) => {
      if (!n.isEmpty()) {
        const r = e.data.field(n);
        t.set(n, r);
      }
    }), t;
  }
  function __PRIVATE_serverTransformResults(e, t, n) {
    const r = /* @__PURE__ */ new Map();
    __PRIVATE_hardAssert(e.length === n.length);
    for (let i = 0; i < n.length; i++) {
      const s = e[i], o = s.transform, _ = t.data.field(s.field);
      r.set(s.field, __PRIVATE_applyTransformOperationToRemoteDocument(o, _, n[i]));
    }
    return r;
  }
  function __PRIVATE_localTransformResults(e, t, n) {
    const r = /* @__PURE__ */ new Map();
    for (const i of e) {
      const e2 = i.transform, s = n.data.field(i.field);
      r.set(i.field, __PRIVATE_applyTransformOperationToLocalView(e2, s, t));
    }
    return r;
  }
  var __PRIVATE_DeleteMutation = class extends Mutation {
    constructor(e, t) {
      super(), this.key = e, this.precondition = t, this.type = 2, this.fieldTransforms = [];
    }
    getFieldMask() {
      return null;
    }
  };
  var MutationBatch = class {
    /**
     * @param batchId - The unique ID of this mutation batch.
     * @param localWriteTime - The original write time of this mutation.
     * @param baseMutations - Mutations that are used to populate the base
     * values when this mutation is applied locally. This can be used to locally
     * overwrite values that are persisted in the remote document cache. Base
     * mutations are never sent to the backend.
     * @param mutations - The user-provided mutations in this mutation batch.
     * User-provided mutations are applied both locally and remotely on the
     * backend.
     */
    constructor(e, t, n, r) {
      this.batchId = e, this.localWriteTime = t, this.baseMutations = n, this.mutations = r;
    }
    /**
     * Applies all the mutations in this MutationBatch to the specified document
     * to compute the state of the remote document
     *
     * @param document - The document to apply mutations to.
     * @param batchResult - The result of applying the MutationBatch to the
     * backend.
     */
    applyToRemoteDocument(e, t) {
      const n = t.mutationResults;
      for (let t2 = 0; t2 < this.mutations.length; t2++) {
        const r = this.mutations[t2];
        if (r.key.isEqual(e.key)) {
          __PRIVATE_mutationApplyToRemoteDocument(r, e, n[t2]);
        }
      }
    }
    /**
     * Computes the local view of a document given all the mutations in this
     * batch.
     *
     * @param document - The document to apply mutations to.
     * @param mutatedFields - Fields that have been updated before applying this mutation batch.
     * @returns A `FieldMask` representing all the fields that are mutated.
     */
    applyToLocalView(e, t) {
      for (const n of this.baseMutations) n.key.isEqual(e.key) && (t = __PRIVATE_mutationApplyToLocalView(n, e, t, this.localWriteTime));
      for (const n of this.mutations) n.key.isEqual(e.key) && (t = __PRIVATE_mutationApplyToLocalView(n, e, t, this.localWriteTime));
      return t;
    }
    /**
     * Computes the local view for all provided documents given the mutations in
     * this batch. Returns a `DocumentKey` to `Mutation` map which can be used to
     * replace all the mutation applications.
     */
    applyToLocalDocumentSet(e, t) {
      const n = __PRIVATE_newMutationMap();
      return this.mutations.forEach((r) => {
        const i = e.get(r.key), s = i.overlayedDocument;
        let o = this.applyToLocalView(s, i.mutatedFields);
        o = t.has(r.key) ? null : o;
        const _ = __PRIVATE_calculateOverlayMutation(s, o);
        null !== _ && n.set(r.key, _), s.isValidDocument() || s.convertToNoDocument(SnapshotVersion.min());
      }), n;
    }
    keys() {
      return this.mutations.reduce((e, t) => e.add(t.key), __PRIVATE_documentKeySet());
    }
    isEqual(e) {
      return this.batchId === e.batchId && __PRIVATE_arrayEquals(this.mutations, e.mutations, (e2, t) => __PRIVATE_mutationEquals(e2, t)) && __PRIVATE_arrayEquals(this.baseMutations, e.baseMutations, (e2, t) => __PRIVATE_mutationEquals(e2, t));
    }
  };
  var Overlay = class {
    constructor(e, t) {
      this.largestBatchId = e, this.mutation = t;
    }
    getKey() {
      return this.mutation.key;
    }
    isEqual(e) {
      return null !== e && this.mutation === e.mutation;
    }
    toString() {
      return `Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`;
    }
  };
  var ExistenceFilter = class {
    constructor(e, t) {
      this.count = e, this.unchangedNames = t;
    }
  };
  var le;
  var he;
  function __PRIVATE_mapCodeFromRpcCode(e) {
    if (void 0 === e)
      return __PRIVATE_logError("GRPC error has no .code"), D.UNKNOWN;
    switch (e) {
      case le.OK:
        return D.OK;
      case le.CANCELLED:
        return D.CANCELLED;
      case le.UNKNOWN:
        return D.UNKNOWN;
      case le.DEADLINE_EXCEEDED:
        return D.DEADLINE_EXCEEDED;
      case le.RESOURCE_EXHAUSTED:
        return D.RESOURCE_EXHAUSTED;
      case le.INTERNAL:
        return D.INTERNAL;
      case le.UNAVAILABLE:
        return D.UNAVAILABLE;
      case le.UNAUTHENTICATED:
        return D.UNAUTHENTICATED;
      case le.INVALID_ARGUMENT:
        return D.INVALID_ARGUMENT;
      case le.NOT_FOUND:
        return D.NOT_FOUND;
      case le.ALREADY_EXISTS:
        return D.ALREADY_EXISTS;
      case le.PERMISSION_DENIED:
        return D.PERMISSION_DENIED;
      case le.FAILED_PRECONDITION:
        return D.FAILED_PRECONDITION;
      case le.ABORTED:
        return D.ABORTED;
      case le.OUT_OF_RANGE:
        return D.OUT_OF_RANGE;
      case le.UNIMPLEMENTED:
        return D.UNIMPLEMENTED;
      case le.DATA_LOSS:
        return D.DATA_LOSS;
      default:
        return fail();
    }
  }
  (he = le || (le = {}))[he.OK = 0] = "OK", he[he.CANCELLED = 1] = "CANCELLED", he[he.UNKNOWN = 2] = "UNKNOWN", he[he.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", he[he.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", he[he.NOT_FOUND = 5] = "NOT_FOUND", he[he.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", he[he.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", he[he.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", he[he.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", he[he.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", he[he.ABORTED = 10] = "ABORTED", he[he.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", he[he.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", he[he.INTERNAL = 13] = "INTERNAL", he[he.UNAVAILABLE = 14] = "UNAVAILABLE", he[he.DATA_LOSS = 15] = "DATA_LOSS";
  var Pe = null;
  function __PRIVATE_newTextEncoder() {
    return new TextEncoder();
  }
  var Ie = new Integer([4294967295, 4294967295], 0);
  function __PRIVATE_getMd5HashValue(e) {
    const t = __PRIVATE_newTextEncoder().encode(e), n = new Md5();
    return n.update(t), new Uint8Array(n.digest());
  }
  function __PRIVATE_get64BitUints(e) {
    const t = new DataView(e.buffer), n = t.getUint32(
      0,
      /* littleEndian= */
      true
    ), r = t.getUint32(
      4,
      /* littleEndian= */
      true
    ), i = t.getUint32(
      8,
      /* littleEndian= */
      true
    ), s = t.getUint32(
      12,
      /* littleEndian= */
      true
    );
    return [new Integer([n, r], 0), new Integer([i, s], 0)];
  }
  var BloomFilter = class _BloomFilter {
    constructor(e, t, n) {
      if (this.bitmap = e, this.padding = t, this.hashCount = n, t < 0 || t >= 8) throw new __PRIVATE_BloomFilterError(`Invalid padding: ${t}`);
      if (n < 0) throw new __PRIVATE_BloomFilterError(`Invalid hash count: ${n}`);
      if (e.length > 0 && 0 === this.hashCount)
        throw new __PRIVATE_BloomFilterError(`Invalid hash count: ${n}`);
      if (0 === e.length && 0 !== t)
        throw new __PRIVATE_BloomFilterError(`Invalid padding when bitmap length is 0: ${t}`);
      this.Ie = 8 * e.length - t, // Set the bit count in Integer to avoid repetition in mightContain().
      this.Te = Integer.fromNumber(this.Ie);
    }
    // Calculate the ith hash value based on the hashed 64bit integers,
    // and calculate its corresponding bit index in the bitmap to be checked.
    Ee(e, t, n) {
      let r = e.add(t.multiply(Integer.fromNumber(n)));
      return 1 === r.compare(Ie) && (r = new Integer([r.getBits(0), r.getBits(1)], 0)), r.modulo(this.Te).toNumber();
    }
    // Return whether the bit on the given index in the bitmap is set to 1.
    de(e) {
      return 0 != (this.bitmap[Math.floor(e / 8)] & 1 << e % 8);
    }
    mightContain(e) {
      if (0 === this.Ie) return false;
      const t = __PRIVATE_getMd5HashValue(e), [n, r] = __PRIVATE_get64BitUints(t);
      for (let e2 = 0; e2 < this.hashCount; e2++) {
        const t2 = this.Ee(n, r, e2);
        if (!this.de(t2)) return false;
      }
      return true;
    }
    /** Create bloom filter for testing purposes only. */
    static create(e, t, n) {
      const r = e % 8 == 0 ? 0 : 8 - e % 8, i = new Uint8Array(Math.ceil(e / 8)), s = new _BloomFilter(i, r, t);
      return n.forEach((e2) => s.insert(e2)), s;
    }
    insert(e) {
      if (0 === this.Ie) return;
      const t = __PRIVATE_getMd5HashValue(e), [n, r] = __PRIVATE_get64BitUints(t);
      for (let e2 = 0; e2 < this.hashCount; e2++) {
        const t2 = this.Ee(n, r, e2);
        this.Ae(t2);
      }
    }
    Ae(e) {
      const t = Math.floor(e / 8), n = e % 8;
      this.bitmap[t] |= 1 << n;
    }
  };
  var __PRIVATE_BloomFilterError = class extends Error {
    constructor() {
      super(...arguments), this.name = "BloomFilterError";
    }
  };
  var RemoteEvent = class _RemoteEvent {
    constructor(e, t, n, r, i) {
      this.snapshotVersion = e, this.targetChanges = t, this.targetMismatches = n, this.documentUpdates = r, this.resolvedLimboDocuments = i;
    }
    /**
     * HACK: Views require RemoteEvents in order to determine whether the view is
     * CURRENT, but secondary tabs don't receive remote events. So this method is
     * used to create a synthesized RemoteEvent that can be used to apply a
     * CURRENT status change to a View, for queries executed in a different tab.
     */
    // PORTING NOTE: Multi-tab only
    static createSynthesizedRemoteEventForCurrentChange(e, t, n) {
      const r = /* @__PURE__ */ new Map();
      return r.set(e, TargetChange.createSynthesizedTargetChangeForCurrentChange(e, t, n)), new _RemoteEvent(SnapshotVersion.min(), r, new SortedMap(__PRIVATE_primitiveComparator), __PRIVATE_mutableDocumentMap(), __PRIVATE_documentKeySet());
    }
  };
  var TargetChange = class _TargetChange {
    constructor(e, t, n, r, i) {
      this.resumeToken = e, this.current = t, this.addedDocuments = n, this.modifiedDocuments = r, this.removedDocuments = i;
    }
    /**
     * This method is used to create a synthesized TargetChanges that can be used to
     * apply a CURRENT status change to a View (for queries executed in a different
     * tab) or for new queries (to raise snapshots with correct CURRENT status).
     */
    static createSynthesizedTargetChangeForCurrentChange(e, t, n) {
      return new _TargetChange(n, t, __PRIVATE_documentKeySet(), __PRIVATE_documentKeySet(), __PRIVATE_documentKeySet());
    }
  };
  var __PRIVATE_DocumentWatchChange = class {
    constructor(e, t, n, r) {
      this.Re = e, this.removedTargetIds = t, this.key = n, this.Ve = r;
    }
  };
  var __PRIVATE_ExistenceFilterChange = class {
    constructor(e, t) {
      this.targetId = e, this.me = t;
    }
  };
  var __PRIVATE_WatchTargetChange = class {
    constructor(e, t, n = ByteString.EMPTY_BYTE_STRING, r = null) {
      this.state = e, this.targetIds = t, this.resumeToken = n, this.cause = r;
    }
  };
  var __PRIVATE_TargetState = class {
    constructor() {
      this.fe = 0, /**
       * Keeps track of the document changes since the last raised snapshot.
       *
       * These changes are continuously updated as we receive document updates and
       * always reflect the current set of changes against the last issued snapshot.
       */
      this.ge = __PRIVATE_snapshotChangesMap(), /** See public getters for explanations of these fields. */
      this.pe = ByteString.EMPTY_BYTE_STRING, this.ye = false, /**
       * Whether this target state should be included in the next snapshot. We
       * initialize to true so that newly-added targets are included in the next
       * RemoteEvent.
       */
      this.we = true;
    }
    /**
     * Whether this target has been marked 'current'.
     *
     * 'Current' has special meaning in the RPC protocol: It implies that the
     * Watch backend has sent us all changes up to the point at which the target
     * was added and that the target is consistent with the rest of the watch
     * stream.
     */
    get current() {
      return this.ye;
    }
    /** The last resume token sent to us for this target. */
    get resumeToken() {
      return this.pe;
    }
    /** Whether this target has pending target adds or target removes. */
    get Se() {
      return 0 !== this.fe;
    }
    /** Whether we have modified any state that should trigger a snapshot. */
    get be() {
      return this.we;
    }
    /**
     * Applies the resume token to the TargetChange, but only when it has a new
     * value. Empty resumeTokens are discarded.
     */
    De(e) {
      e.approximateByteSize() > 0 && (this.we = true, this.pe = e);
    }
    /**
     * Creates a target change from the current set of changes.
     *
     * To reset the document changes after raising this snapshot, call
     * `clearPendingChanges()`.
     */
    ve() {
      let e = __PRIVATE_documentKeySet(), t = __PRIVATE_documentKeySet(), n = __PRIVATE_documentKeySet();
      return this.ge.forEach((r, i) => {
        switch (i) {
          case 0:
            e = e.add(r);
            break;
          case 2:
            t = t.add(r);
            break;
          case 1:
            n = n.add(r);
            break;
          default:
            fail();
        }
      }), new TargetChange(this.pe, this.ye, e, t, n);
    }
    /**
     * Resets the document changes and sets `hasPendingChanges` to false.
     */
    Ce() {
      this.we = false, this.ge = __PRIVATE_snapshotChangesMap();
    }
    Fe(e, t) {
      this.we = true, this.ge = this.ge.insert(e, t);
    }
    Me(e) {
      this.we = true, this.ge = this.ge.remove(e);
    }
    xe() {
      this.fe += 1;
    }
    Oe() {
      this.fe -= 1, __PRIVATE_hardAssert(this.fe >= 0);
    }
    Ne() {
      this.we = true, this.ye = true;
    }
  };
  var __PRIVATE_WatchChangeAggregator = class {
    constructor(e) {
      this.Le = e, /** The internal state of all tracked targets. */
      this.Be = /* @__PURE__ */ new Map(), /** Keeps track of the documents to update since the last raised snapshot. */
      this.ke = __PRIVATE_mutableDocumentMap(), /** A mapping of document keys to their set of target IDs. */
      this.qe = __PRIVATE_documentTargetMap(), /**
       * A map of targets with existence filter mismatches. These targets are
       * known to be inconsistent and their listens needs to be re-established by
       * RemoteStore.
       */
      this.Qe = new SortedMap(__PRIVATE_primitiveComparator);
    }
    /**
     * Processes and adds the DocumentWatchChange to the current set of changes.
     */
    Ke(e) {
      for (const t of e.Re) e.Ve && e.Ve.isFoundDocument() ? this.$e(t, e.Ve) : this.Ue(t, e.key, e.Ve);
      for (const t of e.removedTargetIds) this.Ue(t, e.key, e.Ve);
    }
    /** Processes and adds the WatchTargetChange to the current set of changes. */
    We(e) {
      this.forEachTarget(e, (t) => {
        const n = this.Ge(t);
        switch (e.state) {
          case 0:
            this.ze(t) && n.De(e.resumeToken);
            break;
          case 1:
            n.Oe(), n.Se || // We have a freshly added target, so we need to reset any state
            // that we had previously. This can happen e.g. when remove and add
            // back a target for existence filter mismatches.
            n.Ce(), n.De(e.resumeToken);
            break;
          case 2:
            n.Oe(), n.Se || this.removeTarget(t);
            break;
          case 3:
            this.ze(t) && (n.Ne(), n.De(e.resumeToken));
            break;
          case 4:
            this.ze(t) && // Reset the target and synthesizes removes for all existing
            // documents. The backend will re-add any documents that still
            // match the target before it sends the next global snapshot.
            (this.je(t), n.De(e.resumeToken));
            break;
          default:
            fail();
        }
      });
    }
    /**
     * Iterates over all targetIds that the watch change applies to: either the
     * targetIds explicitly listed in the change or the targetIds of all currently
     * active targets.
     */
    forEachTarget(e, t) {
      e.targetIds.length > 0 ? e.targetIds.forEach(t) : this.Be.forEach((e2, n) => {
        this.ze(n) && t(n);
      });
    }
    /**
     * Handles existence filters and synthesizes deletes for filter mismatches.
     * Targets that are invalidated by filter mismatches are added to
     * `pendingTargetResets`.
     */
    He(e) {
      const t = e.targetId, n = e.me.count, r = this.Je(t);
      if (r) {
        const i = r.target;
        if (__PRIVATE_targetIsDocumentTarget(i)) if (0 === n) {
          const e2 = new DocumentKey(i.path);
          this.Ue(t, e2, MutableDocument.newNoDocument(e2, SnapshotVersion.min()));
        } else __PRIVATE_hardAssert(1 === n);
        else {
          const r2 = this.Ye(t);
          if (r2 !== n) {
            const n2 = this.Ze(e), i2 = n2 ? this.Xe(n2, e, r2) : 1;
            if (0 !== i2) {
              this.je(t);
              const e2 = 2 === i2 ? "TargetPurposeExistenceFilterMismatchBloom" : "TargetPurposeExistenceFilterMismatch";
              this.Qe = this.Qe.insert(t, e2);
            }
            null == Pe || Pe.et(function __PRIVATE_createExistenceFilterMismatchInfoForTestingHooks(e2, t2, n3, r3, i3) {
              var s, o, _, a, u, c;
              const l = {
                localCacheCount: e2,
                existenceFilterCount: t2.count,
                databaseId: n3.database,
                projectId: n3.projectId
              }, h = t2.unchangedNames;
              h && (l.bloomFilter = {
                applied: 0 === i3,
                hashCount: null !== (s = null == h ? void 0 : h.hashCount) && void 0 !== s ? s : 0,
                bitmapLength: null !== (a = null === (_ = null === (o = null == h ? void 0 : h.bits) || void 0 === o ? void 0 : o.bitmap) || void 0 === _ ? void 0 : _.length) && void 0 !== a ? a : 0,
                padding: null !== (c = null === (u = null == h ? void 0 : h.bits) || void 0 === u ? void 0 : u.padding) && void 0 !== c ? c : 0,
                mightContain: (e3) => {
                  var t3;
                  return null !== (t3 = null == r3 ? void 0 : r3.mightContain(e3)) && void 0 !== t3 && t3;
                }
              });
              return l;
            }(r2, e.me, this.Le.tt(), n2, i2));
          }
        }
      }
    }
    /**
     * Parse the bloom filter from the "unchanged_names" field of an existence
     * filter.
     */
    Ze(e) {
      const t = e.me.unchangedNames;
      if (!t || !t.bits) return null;
      const { bits: { bitmap: n = "", padding: r = 0 }, hashCount: i = 0 } = t;
      let s, o;
      try {
        s = __PRIVATE_normalizeByteString(n).toUint8Array();
      } catch (e2) {
        if (e2 instanceof __PRIVATE_Base64DecodeError) return __PRIVATE_logWarn("Decoding the base64 bloom filter in existence filter failed (" + e2.message + "); ignoring the bloom filter and falling back to full re-query."), null;
        throw e2;
      }
      try {
        o = new BloomFilter(s, r, i);
      } catch (e2) {
        return __PRIVATE_logWarn(e2 instanceof __PRIVATE_BloomFilterError ? "BloomFilter error: " : "Applying bloom filter failed: ", e2), null;
      }
      return 0 === o.Ie ? null : o;
    }
    /**
     * Apply bloom filter to remove the deleted documents, and return the
     * application status.
     */
    Xe(e, t, n) {
      return t.me.count === n - this.nt(e, t.targetId) ? 0 : 2;
    }
    /**
     * Filter out removed documents based on bloom filter membership result and
     * return number of documents removed.
     */
    nt(e, t) {
      const n = this.Le.getRemoteKeysForTarget(t);
      let r = 0;
      return n.forEach((n2) => {
        const i = this.Le.tt(), s = `projects/${i.projectId}/databases/${i.database}/documents/${n2.path.canonicalString()}`;
        e.mightContain(s) || (this.Ue(
          t,
          n2,
          /*updatedDocument=*/
          null
        ), r++);
      }), r;
    }
    /**
     * Converts the currently accumulated state into a remote event at the
     * provided snapshot version. Resets the accumulated changes before returning.
     */
    rt(e) {
      const t = /* @__PURE__ */ new Map();
      this.Be.forEach((n2, r2) => {
        const i = this.Je(r2);
        if (i) {
          if (n2.current && __PRIVATE_targetIsDocumentTarget(i.target)) {
            const t2 = new DocumentKey(i.target.path);
            null !== this.ke.get(t2) || this.it(r2, t2) || this.Ue(r2, t2, MutableDocument.newNoDocument(t2, e));
          }
          n2.be && (t.set(r2, n2.ve()), n2.Ce());
        }
      });
      let n = __PRIVATE_documentKeySet();
      this.qe.forEach((e2, t2) => {
        let r2 = true;
        t2.forEachWhile((e3) => {
          const t3 = this.Je(e3);
          return !t3 || "TargetPurposeLimboResolution" === t3.purpose || (r2 = false, false);
        }), r2 && (n = n.add(e2));
      }), this.ke.forEach((t2, n2) => n2.setReadTime(e));
      const r = new RemoteEvent(e, t, this.Qe, this.ke, n);
      return this.ke = __PRIVATE_mutableDocumentMap(), this.qe = __PRIVATE_documentTargetMap(), this.Qe = new SortedMap(__PRIVATE_primitiveComparator), r;
    }
    /**
     * Adds the provided document to the internal list of document updates and
     * its document key to the given target's mapping.
     */
    // Visible for testing.
    $e(e, t) {
      if (!this.ze(e)) return;
      const n = this.it(e, t.key) ? 2 : 0;
      this.Ge(e).Fe(t.key, n), this.ke = this.ke.insert(t.key, t), this.qe = this.qe.insert(t.key, this.st(t.key).add(e));
    }
    /**
     * Removes the provided document from the target mapping. If the
     * document no longer matches the target, but the document's state is still
     * known (e.g. we know that the document was deleted or we received the change
     * that caused the filter mismatch), the new document can be provided
     * to update the remote document cache.
     */
    // Visible for testing.
    Ue(e, t, n) {
      if (!this.ze(e)) return;
      const r = this.Ge(e);
      this.it(e, t) ? r.Fe(
        t,
        1
        /* ChangeType.Removed */
      ) : (
        // The document may have entered and left the target before we raised a
        // snapshot, so we can just ignore the change.
        r.Me(t)
      ), this.qe = this.qe.insert(t, this.st(t).delete(e)), n && (this.ke = this.ke.insert(t, n));
    }
    removeTarget(e) {
      this.Be.delete(e);
    }
    /**
     * Returns the current count of documents in the target. This includes both
     * the number of documents that the LocalStore considers to be part of the
     * target as well as any accumulated changes.
     */
    Ye(e) {
      const t = this.Ge(e).ve();
      return this.Le.getRemoteKeysForTarget(e).size + t.addedDocuments.size - t.removedDocuments.size;
    }
    /**
     * Increment the number of acks needed from watch before we can consider the
     * server to be 'in-sync' with the client's active targets.
     */
    xe(e) {
      this.Ge(e).xe();
    }
    Ge(e) {
      let t = this.Be.get(e);
      return t || (t = new __PRIVATE_TargetState(), this.Be.set(e, t)), t;
    }
    st(e) {
      let t = this.qe.get(e);
      return t || (t = new SortedSet(__PRIVATE_primitiveComparator), this.qe = this.qe.insert(e, t)), t;
    }
    /**
     * Verifies that the user is still interested in this target (by calling
     * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
     * from watch.
     */
    ze(e) {
      const t = null !== this.Je(e);
      return t || __PRIVATE_logDebug("WatchChangeAggregator", "Detected inactive target", e), t;
    }
    /**
     * Returns the TargetData for an active target (i.e. a target that the user
     * is still interested in that has no outstanding target change requests).
     */
    Je(e) {
      const t = this.Be.get(e);
      return t && t.Se ? null : this.Le.ot(e);
    }
    /**
     * Resets the state of a Watch target to its initial state (e.g. sets
     * 'current' to false, clears the resume token and removes its target mapping
     * from all documents).
     */
    je(e) {
      this.Be.set(e, new __PRIVATE_TargetState());
      this.Le.getRemoteKeysForTarget(e).forEach((t) => {
        this.Ue(
          e,
          t,
          /*updatedDocument=*/
          null
        );
      });
    }
    /**
     * Returns whether the LocalStore considers the document to be part of the
     * specified target.
     */
    it(e, t) {
      return this.Le.getRemoteKeysForTarget(e).has(t);
    }
  };
  function __PRIVATE_documentTargetMap() {
    return new SortedMap(DocumentKey.comparator);
  }
  function __PRIVATE_snapshotChangesMap() {
    return new SortedMap(DocumentKey.comparator);
  }
  var Te = /* @__PURE__ */ (() => {
    const e = {
      asc: "ASCENDING",
      desc: "DESCENDING"
    };
    return e;
  })();
  var Ee = /* @__PURE__ */ (() => {
    const e = {
      "<": "LESS_THAN",
      "<=": "LESS_THAN_OR_EQUAL",
      ">": "GREATER_THAN",
      ">=": "GREATER_THAN_OR_EQUAL",
      "==": "EQUAL",
      "!=": "NOT_EQUAL",
      "array-contains": "ARRAY_CONTAINS",
      in: "IN",
      "not-in": "NOT_IN",
      "array-contains-any": "ARRAY_CONTAINS_ANY"
    };
    return e;
  })();
  var de = /* @__PURE__ */ (() => {
    const e = {
      and: "AND",
      or: "OR"
    };
    return e;
  })();
  var JsonProtoSerializer = class {
    constructor(e, t) {
      this.databaseId = e, this.useProto3Json = t;
    }
  };
  function __PRIVATE_toInt32Proto(e, t) {
    return e.useProto3Json || __PRIVATE_isNullOrUndefined(t) ? t : {
      value: t
    };
  }
  function toTimestamp(e, t) {
    if (e.useProto3Json) {
      return `${new Date(1e3 * t.seconds).toISOString().replace(/\.\d*/, "").replace("Z", "")}.${("000000000" + t.nanoseconds).slice(-9)}Z`;
    }
    return {
      seconds: "" + t.seconds,
      nanos: t.nanoseconds
    };
  }
  function __PRIVATE_toBytes(e, t) {
    return e.useProto3Json ? t.toBase64() : t.toUint8Array();
  }
  function __PRIVATE_fromVersion(e) {
    return __PRIVATE_hardAssert(!!e), SnapshotVersion.fromTimestamp(function fromTimestamp(e2) {
      const t = __PRIVATE_normalizeTimestamp(e2);
      return new Timestamp(t.seconds, t.nanos);
    }(e));
  }
  function __PRIVATE_toResourceName(e, t) {
    return __PRIVATE_toResourcePath(e, t).canonicalString();
  }
  function __PRIVATE_toResourcePath(e, t) {
    const n = function __PRIVATE_fullyQualifiedPrefixPath(e2) {
      return new ResourcePath(["projects", e2.projectId, "databases", e2.database]);
    }(e).child("documents");
    return void 0 === t ? n : n.child(t);
  }
  function __PRIVATE_fromResourceName(e) {
    const t = ResourcePath.fromString(e);
    return __PRIVATE_hardAssert(__PRIVATE_isValidResourceName(t)), t;
  }
  function fromName(e, t) {
    const n = __PRIVATE_fromResourceName(t);
    if (n.get(1) !== e.databaseId.projectId) throw new FirestoreError(D.INVALID_ARGUMENT, "Tried to deserialize key from different project: " + n.get(1) + " vs " + e.databaseId.projectId);
    if (n.get(3) !== e.databaseId.database) throw new FirestoreError(D.INVALID_ARGUMENT, "Tried to deserialize key from different database: " + n.get(3) + " vs " + e.databaseId.database);
    return new DocumentKey(__PRIVATE_extractLocalPathFromResourceName(n));
  }
  function __PRIVATE_toQueryPath(e, t) {
    return __PRIVATE_toResourceName(e.databaseId, t);
  }
  function __PRIVATE_fromQueryPath(e) {
    const t = __PRIVATE_fromResourceName(e);
    return 4 === t.length ? ResourcePath.emptyPath() : __PRIVATE_extractLocalPathFromResourceName(t);
  }
  function __PRIVATE_getEncodedDatabaseId(e) {
    return new ResourcePath(["projects", e.databaseId.projectId, "databases", e.databaseId.database]).canonicalString();
  }
  function __PRIVATE_extractLocalPathFromResourceName(e) {
    return __PRIVATE_hardAssert(e.length > 4 && "documents" === e.get(4)), e.popFirst(5);
  }
  function __PRIVATE_fromWatchChange(e, t) {
    let n;
    if ("targetChange" in t) {
      t.targetChange;
      const r = function __PRIVATE_fromWatchTargetChangeState(e2) {
        return "NO_CHANGE" === e2 ? 0 : "ADD" === e2 ? 1 : "REMOVE" === e2 ? 2 : "CURRENT" === e2 ? 3 : "RESET" === e2 ? 4 : fail();
      }(t.targetChange.targetChangeType || "NO_CHANGE"), i = t.targetChange.targetIds || [], s = function __PRIVATE_fromBytes(e2, t2) {
        return e2.useProto3Json ? (__PRIVATE_hardAssert(void 0 === t2 || "string" == typeof t2), ByteString.fromBase64String(t2 || "")) : (__PRIVATE_hardAssert(void 0 === t2 || // Check if the value is an instance of both Buffer and Uint8Array,
        // despite the fact that Buffer extends Uint8Array. In some
        // environments, such as jsdom, the prototype chain of Buffer
        // does not indicate that it extends Uint8Array.
        t2 instanceof Buffer || t2 instanceof Uint8Array), ByteString.fromUint8Array(t2 || new Uint8Array()));
      }(e, t.targetChange.resumeToken), o = t.targetChange.cause, _ = o && function __PRIVATE_fromRpcStatus(e2) {
        const t2 = void 0 === e2.code ? D.UNKNOWN : __PRIVATE_mapCodeFromRpcCode(e2.code);
        return new FirestoreError(t2, e2.message || "");
      }(o);
      n = new __PRIVATE_WatchTargetChange(r, i, s, _ || null);
    } else if ("documentChange" in t) {
      t.documentChange;
      const r = t.documentChange;
      r.document, r.document.name, r.document.updateTime;
      const i = fromName(e, r.document.name), s = __PRIVATE_fromVersion(r.document.updateTime), o = r.document.createTime ? __PRIVATE_fromVersion(r.document.createTime) : SnapshotVersion.min(), _ = new ObjectValue({
        mapValue: {
          fields: r.document.fields
        }
      }), a = MutableDocument.newFoundDocument(i, s, o, _), u = r.targetIds || [], c = r.removedTargetIds || [];
      n = new __PRIVATE_DocumentWatchChange(u, c, a.key, a);
    } else if ("documentDelete" in t) {
      t.documentDelete;
      const r = t.documentDelete;
      r.document;
      const i = fromName(e, r.document), s = r.readTime ? __PRIVATE_fromVersion(r.readTime) : SnapshotVersion.min(), o = MutableDocument.newNoDocument(i, s), _ = r.removedTargetIds || [];
      n = new __PRIVATE_DocumentWatchChange([], _, o.key, o);
    } else if ("documentRemove" in t) {
      t.documentRemove;
      const r = t.documentRemove;
      r.document;
      const i = fromName(e, r.document), s = r.removedTargetIds || [];
      n = new __PRIVATE_DocumentWatchChange([], s, i, null);
    } else {
      if (!("filter" in t)) return fail();
      {
        t.filter;
        const e2 = t.filter;
        e2.targetId;
        const { count: r = 0, unchangedNames: i } = e2, s = new ExistenceFilter(r, i), o = e2.targetId;
        n = new __PRIVATE_ExistenceFilterChange(o, s);
      }
    }
    return n;
  }
  function __PRIVATE_toDocumentsTarget(e, t) {
    return {
      documents: [__PRIVATE_toQueryPath(e, t.path)]
    };
  }
  function __PRIVATE_toQueryTarget(e, t) {
    const n = {
      structuredQuery: {}
    }, r = t.path;
    let i;
    null !== t.collectionGroup ? (i = r, n.structuredQuery.from = [{
      collectionId: t.collectionGroup,
      allDescendants: true
    }]) : (i = r.popLast(), n.structuredQuery.from = [{
      collectionId: r.lastSegment()
    }]), n.parent = __PRIVATE_toQueryPath(e, i);
    const s = function __PRIVATE_toFilters(e2) {
      if (0 === e2.length) return;
      return __PRIVATE_toFilter(CompositeFilter.create(
        e2,
        "and"
        /* CompositeOperator.AND */
      ));
    }(t.filters);
    s && (n.structuredQuery.where = s);
    const o = function __PRIVATE_toOrder(e2) {
      if (0 === e2.length) return;
      return e2.map((e3) => (
        // visible for testing
        function __PRIVATE_toPropertyOrder(e4) {
          return {
            field: __PRIVATE_toFieldPathReference(e4.field),
            direction: __PRIVATE_toDirection(e4.dir)
          };
        }(e3)
      ));
    }(t.orderBy);
    o && (n.structuredQuery.orderBy = o);
    const _ = __PRIVATE_toInt32Proto(e, t.limit);
    return null !== _ && (n.structuredQuery.limit = _), t.startAt && (n.structuredQuery.startAt = function __PRIVATE_toStartAtCursor(e2) {
      return {
        before: e2.inclusive,
        values: e2.position
      };
    }(t.startAt)), t.endAt && (n.structuredQuery.endAt = function __PRIVATE_toEndAtCursor(e2) {
      return {
        before: !e2.inclusive,
        values: e2.position
      };
    }(t.endAt)), {
      _t: n,
      parent: i
    };
  }
  function __PRIVATE_convertQueryTargetToQuery(e) {
    let t = __PRIVATE_fromQueryPath(e.parent);
    const n = e.structuredQuery, r = n.from ? n.from.length : 0;
    let i = null;
    if (r > 0) {
      __PRIVATE_hardAssert(1 === r);
      const e2 = n.from[0];
      e2.allDescendants ? i = e2.collectionId : t = t.child(e2.collectionId);
    }
    let s = [];
    n.where && (s = function __PRIVATE_fromFilters(e2) {
      const t2 = __PRIVATE_fromFilter(e2);
      if (t2 instanceof CompositeFilter && __PRIVATE_compositeFilterIsFlatConjunction(t2)) return t2.getFilters();
      return [t2];
    }(n.where));
    let o = [];
    n.orderBy && (o = function __PRIVATE_fromOrder(e2) {
      return e2.map((e3) => function __PRIVATE_fromPropertyOrder(e4) {
        return new OrderBy(
          __PRIVATE_fromFieldPathReference(e4.field),
          // visible for testing
          function __PRIVATE_fromDirection(e5) {
            switch (e5) {
              case "ASCENDING":
                return "asc";
              case "DESCENDING":
                return "desc";
              default:
                return;
            }
          }(e4.direction)
        );
      }(e3));
    }(n.orderBy));
    let _ = null;
    n.limit && (_ = function __PRIVATE_fromInt32Proto(e2) {
      let t2;
      return t2 = "object" == typeof e2 ? e2.value : e2, __PRIVATE_isNullOrUndefined(t2) ? null : t2;
    }(n.limit));
    let a = null;
    n.startAt && (a = function __PRIVATE_fromStartAtCursor(e2) {
      const t2 = !!e2.before, n2 = e2.values || [];
      return new Bound(n2, t2);
    }(n.startAt));
    let u = null;
    return n.endAt && (u = function __PRIVATE_fromEndAtCursor(e2) {
      const t2 = !e2.before, n2 = e2.values || [];
      return new Bound(n2, t2);
    }(n.endAt)), __PRIVATE_newQuery(t, i, o, s, _, "F", a, u);
  }
  function __PRIVATE_toListenRequestLabels(e, t) {
    const n = function __PRIVATE_toLabel(e2) {
      switch (e2) {
        case "TargetPurposeListen":
          return null;
        case "TargetPurposeExistenceFilterMismatch":
          return "existence-filter-mismatch";
        case "TargetPurposeExistenceFilterMismatchBloom":
          return "existence-filter-mismatch-bloom";
        case "TargetPurposeLimboResolution":
          return "limbo-document";
        default:
          return fail();
      }
    }(t.purpose);
    return null == n ? null : {
      "goog-listen-tags": n
    };
  }
  function __PRIVATE_fromFilter(e) {
    return void 0 !== e.unaryFilter ? function __PRIVATE_fromUnaryFilter(e2) {
      switch (e2.unaryFilter.op) {
        case "IS_NAN":
          const t = __PRIVATE_fromFieldPathReference(e2.unaryFilter.field);
          return FieldFilter.create(t, "==", {
            doubleValue: NaN
          });
        case "IS_NULL":
          const n = __PRIVATE_fromFieldPathReference(e2.unaryFilter.field);
          return FieldFilter.create(n, "==", {
            nullValue: "NULL_VALUE"
          });
        case "IS_NOT_NAN":
          const r = __PRIVATE_fromFieldPathReference(e2.unaryFilter.field);
          return FieldFilter.create(r, "!=", {
            doubleValue: NaN
          });
        case "IS_NOT_NULL":
          const i = __PRIVATE_fromFieldPathReference(e2.unaryFilter.field);
          return FieldFilter.create(i, "!=", {
            nullValue: "NULL_VALUE"
          });
        default:
          return fail();
      }
    }(e) : void 0 !== e.fieldFilter ? function __PRIVATE_fromFieldFilter(e2) {
      return FieldFilter.create(__PRIVATE_fromFieldPathReference(e2.fieldFilter.field), function __PRIVATE_fromOperatorName(e3) {
        switch (e3) {
          case "EQUAL":
            return "==";
          case "NOT_EQUAL":
            return "!=";
          case "GREATER_THAN":
            return ">";
          case "GREATER_THAN_OR_EQUAL":
            return ">=";
          case "LESS_THAN":
            return "<";
          case "LESS_THAN_OR_EQUAL":
            return "<=";
          case "ARRAY_CONTAINS":
            return "array-contains";
          case "IN":
            return "in";
          case "NOT_IN":
            return "not-in";
          case "ARRAY_CONTAINS_ANY":
            return "array-contains-any";
          default:
            return fail();
        }
      }(e2.fieldFilter.op), e2.fieldFilter.value);
    }(e) : void 0 !== e.compositeFilter ? function __PRIVATE_fromCompositeFilter(e2) {
      return CompositeFilter.create(e2.compositeFilter.filters.map((e3) => __PRIVATE_fromFilter(e3)), function __PRIVATE_fromCompositeOperatorName(e3) {
        switch (e3) {
          case "AND":
            return "and";
          case "OR":
            return "or";
          default:
            return fail();
        }
      }(e2.compositeFilter.op));
    }(e) : fail();
  }
  function __PRIVATE_toDirection(e) {
    return Te[e];
  }
  function __PRIVATE_toOperatorName(e) {
    return Ee[e];
  }
  function __PRIVATE_toCompositeOperatorName(e) {
    return de[e];
  }
  function __PRIVATE_toFieldPathReference(e) {
    return {
      fieldPath: e.canonicalString()
    };
  }
  function __PRIVATE_fromFieldPathReference(e) {
    return FieldPath$1.fromServerFormat(e.fieldPath);
  }
  function __PRIVATE_toFilter(e) {
    return e instanceof FieldFilter ? function __PRIVATE_toUnaryOrFieldFilter(e2) {
      if ("==" === e2.op) {
        if (__PRIVATE_isNanValue(e2.value)) return {
          unaryFilter: {
            field: __PRIVATE_toFieldPathReference(e2.field),
            op: "IS_NAN"
          }
        };
        if (__PRIVATE_isNullValue(e2.value)) return {
          unaryFilter: {
            field: __PRIVATE_toFieldPathReference(e2.field),
            op: "IS_NULL"
          }
        };
      } else if ("!=" === e2.op) {
        if (__PRIVATE_isNanValue(e2.value)) return {
          unaryFilter: {
            field: __PRIVATE_toFieldPathReference(e2.field),
            op: "IS_NOT_NAN"
          }
        };
        if (__PRIVATE_isNullValue(e2.value)) return {
          unaryFilter: {
            field: __PRIVATE_toFieldPathReference(e2.field),
            op: "IS_NOT_NULL"
          }
        };
      }
      return {
        fieldFilter: {
          field: __PRIVATE_toFieldPathReference(e2.field),
          op: __PRIVATE_toOperatorName(e2.op),
          value: e2.value
        }
      };
    }(e) : e instanceof CompositeFilter ? function __PRIVATE_toCompositeFilter(e2) {
      const t = e2.getFilters().map((e3) => __PRIVATE_toFilter(e3));
      if (1 === t.length) return t[0];
      return {
        compositeFilter: {
          op: __PRIVATE_toCompositeOperatorName(e2.op),
          filters: t
        }
      };
    }(e) : fail();
  }
  function __PRIVATE_isValidResourceName(e) {
    return e.length >= 4 && "projects" === e.get(0) && "databases" === e.get(2);
  }
  var TargetData = class _TargetData {
    constructor(e, t, n, r, i = SnapshotVersion.min(), s = SnapshotVersion.min(), o = ByteString.EMPTY_BYTE_STRING, _ = null) {
      this.target = e, this.targetId = t, this.purpose = n, this.sequenceNumber = r, this.snapshotVersion = i, this.lastLimboFreeSnapshotVersion = s, this.resumeToken = o, this.expectedCount = _;
    }
    /** Creates a new target data instance with an updated sequence number. */
    withSequenceNumber(e) {
      return new _TargetData(this.target, this.targetId, this.purpose, e, this.snapshotVersion, this.lastLimboFreeSnapshotVersion, this.resumeToken, this.expectedCount);
    }
    /**
     * Creates a new target data instance with an updated resume token and
     * snapshot version.
     */
    withResumeToken(e, t) {
      return new _TargetData(
        this.target,
        this.targetId,
        this.purpose,
        this.sequenceNumber,
        t,
        this.lastLimboFreeSnapshotVersion,
        e,
        /* expectedCount= */
        null
      );
    }
    /**
     * Creates a new target data instance with an updated expected count.
     */
    withExpectedCount(e) {
      return new _TargetData(this.target, this.targetId, this.purpose, this.sequenceNumber, this.snapshotVersion, this.lastLimboFreeSnapshotVersion, this.resumeToken, e);
    }
    /**
     * Creates a new target data instance with an updated last limbo free
     * snapshot version number.
     */
    withLastLimboFreeSnapshotVersion(e) {
      return new _TargetData(this.target, this.targetId, this.purpose, this.sequenceNumber, this.snapshotVersion, e, this.resumeToken, this.expectedCount);
    }
  };
  var __PRIVATE_LocalSerializer = class {
    constructor(e) {
      this.ct = e;
    }
  };
  function __PRIVATE_fromBundledQuery(e) {
    const t = __PRIVATE_convertQueryTargetToQuery({
      parent: e.parent,
      structuredQuery: e.structuredQuery
    });
    return "LAST" === e.limitType ? __PRIVATE_queryWithLimit(
      t,
      t.limit,
      "L"
      /* LimitType.Last */
    ) : t;
  }
  var __PRIVATE_FirestoreIndexValueWriter = class {
    constructor() {
    }
    // The write methods below short-circuit writing terminators for values
    // containing a (terminating) truncated value.
    // As an example, consider the resulting encoding for:
    // ["bar", [2, "foo"]] -> (STRING, "bar", TERM, ARRAY, NUMBER, 2, STRING, "foo", TERM, TERM, TERM)
    // ["bar", [2, truncated("foo")]] -> (STRING, "bar", TERM, ARRAY, NUMBER, 2, STRING, "foo", TRUNC)
    // ["bar", truncated(["foo"])] -> (STRING, "bar", TERM, ARRAY. STRING, "foo", TERM, TRUNC)
    /** Writes an index value.  */
    It(e, t) {
      this.Tt(e, t), // Write separator to split index values
      // (see go/firestore-storage-format#encodings).
      t.Et();
    }
    Tt(e, t) {
      if ("nullValue" in e) this.dt(t, 5);
      else if ("booleanValue" in e) this.dt(t, 10), t.At(e.booleanValue ? 1 : 0);
      else if ("integerValue" in e) this.dt(t, 15), t.At(__PRIVATE_normalizeNumber(e.integerValue));
      else if ("doubleValue" in e) {
        const n = __PRIVATE_normalizeNumber(e.doubleValue);
        isNaN(n) ? this.dt(t, 13) : (this.dt(t, 15), __PRIVATE_isNegativeZero(n) ? (
          // -0.0, 0 and 0.0 are all considered the same
          t.At(0)
        ) : t.At(n));
      } else if ("timestampValue" in e) {
        let n = e.timestampValue;
        this.dt(t, 20), "string" == typeof n && (n = __PRIVATE_normalizeTimestamp(n)), t.Rt(`${n.seconds || ""}`), t.At(n.nanos || 0);
      } else if ("stringValue" in e) this.Vt(e.stringValue, t), this.ft(t);
      else if ("bytesValue" in e) this.dt(t, 30), t.gt(__PRIVATE_normalizeByteString(e.bytesValue)), this.ft(t);
      else if ("referenceValue" in e) this.yt(e.referenceValue, t);
      else if ("geoPointValue" in e) {
        const n = e.geoPointValue;
        this.dt(t, 45), t.At(n.latitude || 0), t.At(n.longitude || 0);
      } else "mapValue" in e ? __PRIVATE_isMaxValue(e) ? this.dt(t, Number.MAX_SAFE_INTEGER) : __PRIVATE_isVectorValue(e) ? this.wt(e.mapValue, t) : (this.St(e.mapValue, t), this.ft(t)) : "arrayValue" in e ? (this.bt(e.arrayValue, t), this.ft(t)) : fail();
    }
    Vt(e, t) {
      this.dt(t, 25), this.Dt(e, t);
    }
    Dt(e, t) {
      t.Rt(e);
    }
    St(e, t) {
      const n = e.fields || {};
      this.dt(t, 55);
      for (const e2 of Object.keys(n)) this.Vt(e2, t), this.Tt(n[e2], t);
    }
    wt(e, t) {
      var n, r;
      const i = e.fields || {};
      this.dt(t, 53);
      const s = "value", o = (null === (r = null === (n = i[s].arrayValue) || void 0 === n ? void 0 : n.values) || void 0 === r ? void 0 : r.length) || 0;
      this.dt(t, 15), t.At(__PRIVATE_normalizeNumber(o)), // Vectors then sort by position value
      this.Vt(s, t), this.Tt(i[s], t);
    }
    bt(e, t) {
      const n = e.values || [];
      this.dt(t, 50);
      for (const e2 of n) this.Tt(e2, t);
    }
    yt(e, t) {
      this.dt(t, 37);
      DocumentKey.fromName(e).path.forEach((e2) => {
        this.dt(t, 60), this.Dt(e2, t);
      });
    }
    dt(e, t) {
      e.At(t);
    }
    ft(e) {
      e.At(2);
    }
  };
  __PRIVATE_FirestoreIndexValueWriter.vt = new __PRIVATE_FirestoreIndexValueWriter();
  var __PRIVATE_MemoryIndexManager = class {
    constructor() {
      this.un = new __PRIVATE_MemoryCollectionParentIndex();
    }
    addToCollectionParentIndex(e, t) {
      return this.un.add(t), PersistencePromise.resolve();
    }
    getCollectionParents(e, t) {
      return PersistencePromise.resolve(this.un.getEntries(t));
    }
    addFieldIndex(e, t) {
      return PersistencePromise.resolve();
    }
    deleteFieldIndex(e, t) {
      return PersistencePromise.resolve();
    }
    deleteAllFieldIndexes(e) {
      return PersistencePromise.resolve();
    }
    createTargetIndexes(e, t) {
      return PersistencePromise.resolve();
    }
    getDocumentsMatchingTarget(e, t) {
      return PersistencePromise.resolve(null);
    }
    getIndexType(e, t) {
      return PersistencePromise.resolve(
        0
        /* IndexType.NONE */
      );
    }
    getFieldIndexes(e, t) {
      return PersistencePromise.resolve([]);
    }
    getNextCollectionGroupToUpdate(e) {
      return PersistencePromise.resolve(null);
    }
    getMinOffset(e, t) {
      return PersistencePromise.resolve(IndexOffset.min());
    }
    getMinOffsetFromCollectionGroup(e, t) {
      return PersistencePromise.resolve(IndexOffset.min());
    }
    updateCollectionGroup(e, t, n) {
      return PersistencePromise.resolve();
    }
    updateIndexEntries(e, t) {
      return PersistencePromise.resolve();
    }
  };
  var __PRIVATE_MemoryCollectionParentIndex = class {
    constructor() {
      this.index = {};
    }
    // Returns false if the entry already existed.
    add(e) {
      const t = e.lastSegment(), n = e.popLast(), r = this.index[t] || new SortedSet(ResourcePath.comparator), i = !r.has(n);
      return this.index[t] = r.add(n), i;
    }
    has(e) {
      const t = e.lastSegment(), n = e.popLast(), r = this.index[t];
      return r && r.has(n);
    }
    getEntries(e) {
      return (this.index[e] || new SortedSet(ResourcePath.comparator)).toArray();
    }
  };
  var Ae = new Uint8Array(0);
  var LruParams = class _LruParams {
    constructor(e, t, n) {
      this.cacheSizeCollectionThreshold = e, this.percentileToCollect = t, this.maximumSequenceNumbersToCollect = n;
    }
    static withCacheSize(e) {
      return new _LruParams(e, _LruParams.DEFAULT_COLLECTION_PERCENTILE, _LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT);
    }
  };
  LruParams.DEFAULT_COLLECTION_PERCENTILE = 10, LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT = 1e3, LruParams.DEFAULT = new LruParams(41943040, LruParams.DEFAULT_COLLECTION_PERCENTILE, LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT), LruParams.DISABLED = new LruParams(-1, 0, 0);
  var __PRIVATE_TargetIdGenerator = class ___PRIVATE_TargetIdGenerator {
    constructor(e) {
      this.Ln = e;
    }
    next() {
      return this.Ln += 2, this.Ln;
    }
    static Bn() {
      return new ___PRIVATE_TargetIdGenerator(0);
    }
    static kn() {
      return new ___PRIVATE_TargetIdGenerator(-1);
    }
  };
  var RemoteDocumentChangeBuffer = class {
    constructor() {
      this.changes = new ObjectMap((e) => e.toString(), (e, t) => e.isEqual(t)), this.changesApplied = false;
    }
    /**
     * Buffers a `RemoteDocumentCache.addEntry()` call.
     *
     * You can only modify documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */
    addEntry(e) {
      this.assertNotApplied(), this.changes.set(e.key, e);
    }
    /**
     * Buffers a `RemoteDocumentCache.removeEntry()` call.
     *
     * You can only remove documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */
    removeEntry(e, t) {
      this.assertNotApplied(), this.changes.set(e, MutableDocument.newInvalidDocument(e).setReadTime(t));
    }
    /**
     * Looks up an entry in the cache. The buffered changes will first be checked,
     * and if no buffered change applies, this will forward to
     * `RemoteDocumentCache.getEntry()`.
     *
     * @param transaction - The transaction in which to perform any persistence
     *     operations.
     * @param documentKey - The key of the entry to look up.
     * @returns The cached document or an invalid document if we have nothing
     * cached.
     */
    getEntry(e, t) {
      this.assertNotApplied();
      const n = this.changes.get(t);
      return void 0 !== n ? PersistencePromise.resolve(n) : this.getFromCache(e, t);
    }
    /**
     * Looks up several entries in the cache, forwarding to
     * `RemoteDocumentCache.getEntry()`.
     *
     * @param transaction - The transaction in which to perform any persistence
     *     operations.
     * @param documentKeys - The keys of the entries to look up.
     * @returns A map of cached documents, indexed by key. If an entry cannot be
     *     found, the corresponding key will be mapped to an invalid document.
     */
    getEntries(e, t) {
      return this.getAllFromCache(e, t);
    }
    /**
     * Applies buffered changes to the underlying RemoteDocumentCache, using
     * the provided transaction.
     */
    apply(e) {
      return this.assertNotApplied(), this.changesApplied = true, this.applyChanges(e);
    }
    /** Helper to assert this.changes is not null  */
    assertNotApplied() {
    }
  };
  var OverlayedDocument = class {
    constructor(e, t) {
      this.overlayedDocument = e, this.mutatedFields = t;
    }
  };
  var LocalDocumentsView = class {
    constructor(e, t, n, r) {
      this.remoteDocumentCache = e, this.mutationQueue = t, this.documentOverlayCache = n, this.indexManager = r;
    }
    /**
     * Get the local view of the document identified by `key`.
     *
     * @returns Local view of the document or null if we don't have any cached
     * state for it.
     */
    getDocument(e, t) {
      let n = null;
      return this.documentOverlayCache.getOverlay(e, t).next((r) => (n = r, this.remoteDocumentCache.getEntry(e, t))).next((e2) => (null !== n && __PRIVATE_mutationApplyToLocalView(n.mutation, e2, FieldMask.empty(), Timestamp.now()), e2));
    }
    /**
     * Gets the local view of the documents identified by `keys`.
     *
     * If we don't have cached state for a document in `keys`, a NoDocument will
     * be stored for that key in the resulting set.
     */
    getDocuments(e, t) {
      return this.remoteDocumentCache.getEntries(e, t).next((t2) => this.getLocalViewOfDocuments(e, t2, __PRIVATE_documentKeySet()).next(() => t2));
    }
    /**
     * Similar to `getDocuments`, but creates the local view from the given
     * `baseDocs` without retrieving documents from the local store.
     *
     * @param transaction - The transaction this operation is scoped to.
     * @param docs - The documents to apply local mutations to get the local views.
     * @param existenceStateChanged - The set of document keys whose existence state
     *   is changed. This is useful to determine if some documents overlay needs
     *   to be recalculated.
     */
    getLocalViewOfDocuments(e, t, n = __PRIVATE_documentKeySet()) {
      const r = __PRIVATE_newOverlayMap();
      return this.populateOverlays(e, r, t).next(() => this.computeViews(e, t, r, n).next((e2) => {
        let t2 = documentMap();
        return e2.forEach((e3, n2) => {
          t2 = t2.insert(e3, n2.overlayedDocument);
        }), t2;
      }));
    }
    /**
     * Gets the overlayed documents for the given document map, which will include
     * the local view of those documents and a `FieldMask` indicating which fields
     * are mutated locally, `null` if overlay is a Set or Delete mutation.
     */
    getOverlayedDocuments(e, t) {
      const n = __PRIVATE_newOverlayMap();
      return this.populateOverlays(e, n, t).next(() => this.computeViews(e, t, n, __PRIVATE_documentKeySet()));
    }
    /**
     * Fetches the overlays for {@code docs} and adds them to provided overlay map
     * if the map does not already contain an entry for the given document key.
     */
    populateOverlays(e, t, n) {
      const r = [];
      return n.forEach((e2) => {
        t.has(e2) || r.push(e2);
      }), this.documentOverlayCache.getOverlays(e, r).next((e2) => {
        e2.forEach((e3, n2) => {
          t.set(e3, n2);
        });
      });
    }
    /**
     * Computes the local view for the given documents.
     *
     * @param docs - The documents to compute views for. It also has the base
     *   version of the documents.
     * @param overlays - The overlays that need to be applied to the given base
     *   version of the documents.
     * @param existenceStateChanged - A set of documents whose existence states
     *   might have changed. This is used to determine if we need to re-calculate
     *   overlays from mutation queues.
     * @return A map represents the local documents view.
     */
    computeViews(e, t, n, r) {
      let i = __PRIVATE_mutableDocumentMap();
      const s = __PRIVATE_newDocumentKeyMap(), o = function __PRIVATE_newOverlayedDocumentMap() {
        return __PRIVATE_newDocumentKeyMap();
      }();
      return t.forEach((e2, t2) => {
        const o2 = n.get(t2.key);
        r.has(t2.key) && (void 0 === o2 || o2.mutation instanceof __PRIVATE_PatchMutation) ? i = i.insert(t2.key, t2) : void 0 !== o2 ? (s.set(t2.key, o2.mutation.getFieldMask()), __PRIVATE_mutationApplyToLocalView(o2.mutation, t2, o2.mutation.getFieldMask(), Timestamp.now())) : (
          // no overlay exists
          // Using EMPTY to indicate there is no overlay for the document.
          s.set(t2.key, FieldMask.empty())
        );
      }), this.recalculateAndSaveOverlays(e, i).next((e2) => (e2.forEach((e3, t2) => s.set(e3, t2)), t.forEach((e3, t2) => {
        var n2;
        return o.set(e3, new OverlayedDocument(t2, null !== (n2 = s.get(e3)) && void 0 !== n2 ? n2 : null));
      }), o));
    }
    recalculateAndSaveOverlays(e, t) {
      const n = __PRIVATE_newDocumentKeyMap();
      let r = new SortedMap((e2, t2) => e2 - t2), i = __PRIVATE_documentKeySet();
      return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e, t).next((e2) => {
        for (const i2 of e2) i2.keys().forEach((e3) => {
          const s = t.get(e3);
          if (null === s) return;
          let o = n.get(e3) || FieldMask.empty();
          o = i2.applyToLocalView(s, o), n.set(e3, o);
          const _ = (r.get(i2.batchId) || __PRIVATE_documentKeySet()).add(e3);
          r = r.insert(i2.batchId, _);
        });
      }).next(() => {
        const s = [], o = r.getReverseIterator();
        for (; o.hasNext(); ) {
          const r2 = o.getNext(), _ = r2.key, a = r2.value, u = __PRIVATE_newMutationMap();
          a.forEach((e2) => {
            if (!i.has(e2)) {
              const r3 = __PRIVATE_calculateOverlayMutation(t.get(e2), n.get(e2));
              null !== r3 && u.set(e2, r3), i = i.add(e2);
            }
          }), s.push(this.documentOverlayCache.saveOverlays(e, _, u));
        }
        return PersistencePromise.waitFor(s);
      }).next(() => n);
    }
    /**
     * Recalculates overlays by reading the documents from remote document cache
     * first, and saves them after they are calculated.
     */
    recalculateAndSaveOverlaysForDocumentKeys(e, t) {
      return this.remoteDocumentCache.getEntries(e, t).next((t2) => this.recalculateAndSaveOverlays(e, t2));
    }
    /**
     * Performs a query against the local view of all documents.
     *
     * @param transaction - The persistence transaction.
     * @param query - The query to match documents against.
     * @param offset - Read time and key to start scanning by (exclusive).
     * @param context - A optional tracker to keep a record of important details
     *   during database local query execution.
     */
    getDocumentsMatchingQuery(e, t, n, r) {
      return function __PRIVATE_isDocumentQuery$1(e2) {
        return DocumentKey.isDocumentKey(e2.path) && null === e2.collectionGroup && 0 === e2.filters.length;
      }(t) ? this.getDocumentsMatchingDocumentQuery(e, t.path) : __PRIVATE_isCollectionGroupQuery(t) ? this.getDocumentsMatchingCollectionGroupQuery(e, t, n, r) : this.getDocumentsMatchingCollectionQuery(e, t, n, r);
    }
    /**
     * Given a collection group, returns the next documents that follow the provided offset, along
     * with an updated batch ID.
     *
     * <p>The documents returned by this method are ordered by remote version from the provided
     * offset. If there are no more remote documents after the provided offset, documents with
     * mutations in order of batch id from the offset are returned. Since all documents in a batch are
     * returned together, the total number of documents returned can exceed {@code count}.
     *
     * @param transaction
     * @param collectionGroup The collection group for the documents.
     * @param offset The offset to index into.
     * @param count The number of documents to return
     * @return A LocalWriteResult with the documents that follow the provided offset and the last processed batch id.
     */
    getNextDocuments(e, t, n, r) {
      return this.remoteDocumentCache.getAllFromCollectionGroup(e, t, n, r).next((i) => {
        const s = r - i.size > 0 ? this.documentOverlayCache.getOverlaysForCollectionGroup(e, t, n.largestBatchId, r - i.size) : PersistencePromise.resolve(__PRIVATE_newOverlayMap());
        let o = -1, _ = i;
        return s.next((t2) => PersistencePromise.forEach(t2, (t3, n2) => (o < n2.largestBatchId && (o = n2.largestBatchId), i.get(t3) ? PersistencePromise.resolve() : this.remoteDocumentCache.getEntry(e, t3).next((e2) => {
          _ = _.insert(t3, e2);
        }))).next(() => this.populateOverlays(e, t2, i)).next(() => this.computeViews(e, _, t2, __PRIVATE_documentKeySet())).next((e2) => ({
          batchId: o,
          changes: __PRIVATE_convertOverlayedDocumentMapToDocumentMap(e2)
        })));
      });
    }
    getDocumentsMatchingDocumentQuery(e, t) {
      return this.getDocument(e, new DocumentKey(t)).next((e2) => {
        let t2 = documentMap();
        return e2.isFoundDocument() && (t2 = t2.insert(e2.key, e2)), t2;
      });
    }
    getDocumentsMatchingCollectionGroupQuery(e, t, n, r) {
      const i = t.collectionGroup;
      let s = documentMap();
      return this.indexManager.getCollectionParents(e, i).next((o) => PersistencePromise.forEach(o, (o2) => {
        const _ = function __PRIVATE_asCollectionQueryAtPath(e2, t2) {
          return new __PRIVATE_QueryImpl(
            t2,
            /*collectionGroup=*/
            null,
            e2.explicitOrderBy.slice(),
            e2.filters.slice(),
            e2.limit,
            e2.limitType,
            e2.startAt,
            e2.endAt
          );
        }(t, o2.child(i));
        return this.getDocumentsMatchingCollectionQuery(e, _, n, r).next((e2) => {
          e2.forEach((e3, t2) => {
            s = s.insert(e3, t2);
          });
        });
      }).next(() => s));
    }
    getDocumentsMatchingCollectionQuery(e, t, n, r) {
      let i;
      return this.documentOverlayCache.getOverlaysForCollection(e, t.path, n.largestBatchId).next((s) => (i = s, this.remoteDocumentCache.getDocumentsMatchingQuery(e, t, n, i, r))).next((e2) => {
        i.forEach((t2, n3) => {
          const r2 = n3.getKey();
          null === e2.get(r2) && (e2 = e2.insert(r2, MutableDocument.newInvalidDocument(r2)));
        });
        let n2 = documentMap();
        return e2.forEach((e3, r2) => {
          const s = i.get(e3);
          void 0 !== s && __PRIVATE_mutationApplyToLocalView(s.mutation, r2, FieldMask.empty(), Timestamp.now()), // Finally, insert the documents that still match the query
          __PRIVATE_queryMatches(t, r2) && (n2 = n2.insert(e3, r2));
        }), n2;
      });
    }
  };
  var __PRIVATE_MemoryBundleCache = class {
    constructor(e) {
      this.serializer = e, this.hr = /* @__PURE__ */ new Map(), this.Pr = /* @__PURE__ */ new Map();
    }
    getBundleMetadata(e, t) {
      return PersistencePromise.resolve(this.hr.get(t));
    }
    saveBundleMetadata(e, t) {
      return this.hr.set(
        t.id,
        /** Decodes a BundleMetadata proto into a BundleMetadata object. */
        function __PRIVATE_fromBundleMetadata(e2) {
          return {
            id: e2.id,
            version: e2.version,
            createTime: __PRIVATE_fromVersion(e2.createTime)
          };
        }(t)
      ), PersistencePromise.resolve();
    }
    getNamedQuery(e, t) {
      return PersistencePromise.resolve(this.Pr.get(t));
    }
    saveNamedQuery(e, t) {
      return this.Pr.set(t.name, function __PRIVATE_fromProtoNamedQuery(e2) {
        return {
          name: e2.name,
          query: __PRIVATE_fromBundledQuery(e2.bundledQuery),
          readTime: __PRIVATE_fromVersion(e2.readTime)
        };
      }(t)), PersistencePromise.resolve();
    }
  };
  var __PRIVATE_MemoryDocumentOverlayCache = class {
    constructor() {
      this.overlays = new SortedMap(DocumentKey.comparator), this.Ir = /* @__PURE__ */ new Map();
    }
    getOverlay(e, t) {
      return PersistencePromise.resolve(this.overlays.get(t));
    }
    getOverlays(e, t) {
      const n = __PRIVATE_newOverlayMap();
      return PersistencePromise.forEach(t, (t2) => this.getOverlay(e, t2).next((e2) => {
        null !== e2 && n.set(t2, e2);
      })).next(() => n);
    }
    saveOverlays(e, t, n) {
      return n.forEach((n2, r) => {
        this.ht(e, t, r);
      }), PersistencePromise.resolve();
    }
    removeOverlaysForBatchId(e, t, n) {
      const r = this.Ir.get(n);
      return void 0 !== r && (r.forEach((e2) => this.overlays = this.overlays.remove(e2)), this.Ir.delete(n)), PersistencePromise.resolve();
    }
    getOverlaysForCollection(e, t, n) {
      const r = __PRIVATE_newOverlayMap(), i = t.length + 1, s = new DocumentKey(t.child("")), o = this.overlays.getIteratorFrom(s);
      for (; o.hasNext(); ) {
        const e2 = o.getNext().value, s2 = e2.getKey();
        if (!t.isPrefixOf(s2.path)) break;
        s2.path.length === i && (e2.largestBatchId > n && r.set(e2.getKey(), e2));
      }
      return PersistencePromise.resolve(r);
    }
    getOverlaysForCollectionGroup(e, t, n, r) {
      let i = new SortedMap((e2, t2) => e2 - t2);
      const s = this.overlays.getIterator();
      for (; s.hasNext(); ) {
        const e2 = s.getNext().value;
        if (e2.getKey().getCollectionGroup() === t && e2.largestBatchId > n) {
          let t2 = i.get(e2.largestBatchId);
          null === t2 && (t2 = __PRIVATE_newOverlayMap(), i = i.insert(e2.largestBatchId, t2)), t2.set(e2.getKey(), e2);
        }
      }
      const o = __PRIVATE_newOverlayMap(), _ = i.getIterator();
      for (; _.hasNext(); ) {
        if (_.getNext().value.forEach((e2, t2) => o.set(e2, t2)), o.size() >= r) break;
      }
      return PersistencePromise.resolve(o);
    }
    ht(e, t, n) {
      const r = this.overlays.get(n.key);
      if (null !== r) {
        const e2 = this.Ir.get(r.largestBatchId).delete(n.key);
        this.Ir.set(r.largestBatchId, e2);
      }
      this.overlays = this.overlays.insert(n.key, new Overlay(t, n));
      let i = this.Ir.get(t);
      void 0 === i && (i = __PRIVATE_documentKeySet(), this.Ir.set(t, i)), this.Ir.set(t, i.add(n.key));
    }
  };
  var __PRIVATE_MemoryGlobalsCache = class {
    constructor() {
      this.sessionToken = ByteString.EMPTY_BYTE_STRING;
    }
    getSessionToken(e) {
      return PersistencePromise.resolve(this.sessionToken);
    }
    setSessionToken(e, t) {
      return this.sessionToken = t, PersistencePromise.resolve();
    }
  };
  var __PRIVATE_ReferenceSet = class {
    constructor() {
      this.Tr = new SortedSet(__PRIVATE_DocReference.Er), // A set of outstanding references to a document sorted by target id.
      this.dr = new SortedSet(__PRIVATE_DocReference.Ar);
    }
    /** Returns true if the reference set contains no references. */
    isEmpty() {
      return this.Tr.isEmpty();
    }
    /** Adds a reference to the given document key for the given ID. */
    addReference(e, t) {
      const n = new __PRIVATE_DocReference(e, t);
      this.Tr = this.Tr.add(n), this.dr = this.dr.add(n);
    }
    /** Add references to the given document keys for the given ID. */
    Rr(e, t) {
      e.forEach((e2) => this.addReference(e2, t));
    }
    /**
     * Removes a reference to the given document key for the given
     * ID.
     */
    removeReference(e, t) {
      this.Vr(new __PRIVATE_DocReference(e, t));
    }
    mr(e, t) {
      e.forEach((e2) => this.removeReference(e2, t));
    }
    /**
     * Clears all references with a given ID. Calls removeRef() for each key
     * removed.
     */
    gr(e) {
      const t = new DocumentKey(new ResourcePath([])), n = new __PRIVATE_DocReference(t, e), r = new __PRIVATE_DocReference(t, e + 1), i = [];
      return this.dr.forEachInRange([n, r], (e2) => {
        this.Vr(e2), i.push(e2.key);
      }), i;
    }
    pr() {
      this.Tr.forEach((e) => this.Vr(e));
    }
    Vr(e) {
      this.Tr = this.Tr.delete(e), this.dr = this.dr.delete(e);
    }
    yr(e) {
      const t = new DocumentKey(new ResourcePath([])), n = new __PRIVATE_DocReference(t, e), r = new __PRIVATE_DocReference(t, e + 1);
      let i = __PRIVATE_documentKeySet();
      return this.dr.forEachInRange([n, r], (e2) => {
        i = i.add(e2.key);
      }), i;
    }
    containsKey(e) {
      const t = new __PRIVATE_DocReference(e, 0), n = this.Tr.firstAfterOrEqual(t);
      return null !== n && e.isEqual(n.key);
    }
  };
  var __PRIVATE_DocReference = class {
    constructor(e, t) {
      this.key = e, this.wr = t;
    }
    /** Compare by key then by ID */
    static Er(e, t) {
      return DocumentKey.comparator(e.key, t.key) || __PRIVATE_primitiveComparator(e.wr, t.wr);
    }
    /** Compare by ID then by key */
    static Ar(e, t) {
      return __PRIVATE_primitiveComparator(e.wr, t.wr) || DocumentKey.comparator(e.key, t.key);
    }
  };
  var __PRIVATE_MemoryMutationQueue = class {
    constructor(e, t) {
      this.indexManager = e, this.referenceDelegate = t, /**
       * The set of all mutations that have been sent but not yet been applied to
       * the backend.
       */
      this.mutationQueue = [], /** Next value to use when assigning sequential IDs to each mutation batch. */
      this.Sr = 1, /** An ordered mapping between documents and the mutations batch IDs. */
      this.br = new SortedSet(__PRIVATE_DocReference.Er);
    }
    checkEmpty(e) {
      return PersistencePromise.resolve(0 === this.mutationQueue.length);
    }
    addMutationBatch(e, t, n, r) {
      const i = this.Sr;
      this.Sr++, this.mutationQueue.length > 0 && this.mutationQueue[this.mutationQueue.length - 1];
      const s = new MutationBatch(i, t, n, r);
      this.mutationQueue.push(s);
      for (const t2 of r) this.br = this.br.add(new __PRIVATE_DocReference(t2.key, i)), this.indexManager.addToCollectionParentIndex(e, t2.key.path.popLast());
      return PersistencePromise.resolve(s);
    }
    lookupMutationBatch(e, t) {
      return PersistencePromise.resolve(this.Dr(t));
    }
    getNextMutationBatchAfterBatchId(e, t) {
      const n = t + 1, r = this.vr(n), i = r < 0 ? 0 : r;
      return PersistencePromise.resolve(this.mutationQueue.length > i ? this.mutationQueue[i] : null);
    }
    getHighestUnacknowledgedBatchId() {
      return PersistencePromise.resolve(0 === this.mutationQueue.length ? -1 : this.Sr - 1);
    }
    getAllMutationBatches(e) {
      return PersistencePromise.resolve(this.mutationQueue.slice());
    }
    getAllMutationBatchesAffectingDocumentKey(e, t) {
      const n = new __PRIVATE_DocReference(t, 0), r = new __PRIVATE_DocReference(t, Number.POSITIVE_INFINITY), i = [];
      return this.br.forEachInRange([n, r], (e2) => {
        const t2 = this.Dr(e2.wr);
        i.push(t2);
      }), PersistencePromise.resolve(i);
    }
    getAllMutationBatchesAffectingDocumentKeys(e, t) {
      let n = new SortedSet(__PRIVATE_primitiveComparator);
      return t.forEach((e2) => {
        const t2 = new __PRIVATE_DocReference(e2, 0), r = new __PRIVATE_DocReference(e2, Number.POSITIVE_INFINITY);
        this.br.forEachInRange([t2, r], (e3) => {
          n = n.add(e3.wr);
        });
      }), PersistencePromise.resolve(this.Cr(n));
    }
    getAllMutationBatchesAffectingQuery(e, t) {
      const n = t.path, r = n.length + 1;
      let i = n;
      DocumentKey.isDocumentKey(i) || (i = i.child(""));
      const s = new __PRIVATE_DocReference(new DocumentKey(i), 0);
      let o = new SortedSet(__PRIVATE_primitiveComparator);
      return this.br.forEachWhile((e2) => {
        const t2 = e2.key.path;
        return !!n.isPrefixOf(t2) && // Rows with document keys more than one segment longer than the query
        // path can't be matches. For example, a query on 'rooms' can't match
        // the document /rooms/abc/messages/xyx.
        // TODO(mcg): we'll need a different scanner when we implement
        // ancestor queries.
        (t2.length === r && (o = o.add(e2.wr)), true);
      }, s), PersistencePromise.resolve(this.Cr(o));
    }
    Cr(e) {
      const t = [];
      return e.forEach((e2) => {
        const n = this.Dr(e2);
        null !== n && t.push(n);
      }), t;
    }
    removeMutationBatch(e, t) {
      __PRIVATE_hardAssert(0 === this.Fr(t.batchId, "removed")), this.mutationQueue.shift();
      let n = this.br;
      return PersistencePromise.forEach(t.mutations, (r) => {
        const i = new __PRIVATE_DocReference(r.key, t.batchId);
        return n = n.delete(i), this.referenceDelegate.markPotentiallyOrphaned(e, r.key);
      }).next(() => {
        this.br = n;
      });
    }
    On(e) {
    }
    containsKey(e, t) {
      const n = new __PRIVATE_DocReference(t, 0), r = this.br.firstAfterOrEqual(n);
      return PersistencePromise.resolve(t.isEqual(r && r.key));
    }
    performConsistencyCheck(e) {
      return this.mutationQueue.length, PersistencePromise.resolve();
    }
    /**
     * Finds the index of the given batchId in the mutation queue and asserts that
     * the resulting index is within the bounds of the queue.
     *
     * @param batchId - The batchId to search for
     * @param action - A description of what the caller is doing, phrased in passive
     * form (e.g. "acknowledged" in a routine that acknowledges batches).
     */
    Fr(e, t) {
      return this.vr(e);
    }
    /**
     * Finds the index of the given batchId in the mutation queue. This operation
     * is O(1).
     *
     * @returns The computed index of the batch with the given batchId, based on
     * the state of the queue. Note this index can be negative if the requested
     * batchId has already been removed from the queue or past the end of the
     * queue if the batchId is larger than the last added batch.
     */
    vr(e) {
      if (0 === this.mutationQueue.length)
        return 0;
      return e - this.mutationQueue[0].batchId;
    }
    /**
     * A version of lookupMutationBatch that doesn't return a promise, this makes
     * other functions that uses this code easier to read and more efficient.
     */
    Dr(e) {
      const t = this.vr(e);
      if (t < 0 || t >= this.mutationQueue.length) return null;
      return this.mutationQueue[t];
    }
  };
  var __PRIVATE_MemoryRemoteDocumentCacheImpl = class {
    /**
     * @param sizer - Used to assess the size of a document. For eager GC, this is
     * expected to just return 0 to avoid unnecessarily doing the work of
     * calculating the size.
     */
    constructor(e) {
      this.Mr = e, /** Underlying cache of documents and their read times. */
      this.docs = function __PRIVATE_documentEntryMap() {
        return new SortedMap(DocumentKey.comparator);
      }(), /** Size of all cached documents. */
      this.size = 0;
    }
    setIndexManager(e) {
      this.indexManager = e;
    }
    /**
     * Adds the supplied entry to the cache and updates the cache size as appropriate.
     *
     * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */
    addEntry(e, t) {
      const n = t.key, r = this.docs.get(n), i = r ? r.size : 0, s = this.Mr(t);
      return this.docs = this.docs.insert(n, {
        document: t.mutableCopy(),
        size: s
      }), this.size += s - i, this.indexManager.addToCollectionParentIndex(e, n.path.popLast());
    }
    /**
     * Removes the specified entry from the cache and updates the cache size as appropriate.
     *
     * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */
    removeEntry(e) {
      const t = this.docs.get(e);
      t && (this.docs = this.docs.remove(e), this.size -= t.size);
    }
    getEntry(e, t) {
      const n = this.docs.get(t);
      return PersistencePromise.resolve(n ? n.document.mutableCopy() : MutableDocument.newInvalidDocument(t));
    }
    getEntries(e, t) {
      let n = __PRIVATE_mutableDocumentMap();
      return t.forEach((e2) => {
        const t2 = this.docs.get(e2);
        n = n.insert(e2, t2 ? t2.document.mutableCopy() : MutableDocument.newInvalidDocument(e2));
      }), PersistencePromise.resolve(n);
    }
    getDocumentsMatchingQuery(e, t, n, r) {
      let i = __PRIVATE_mutableDocumentMap();
      const s = t.path, o = new DocumentKey(s.child("")), _ = this.docs.getIteratorFrom(o);
      for (; _.hasNext(); ) {
        const { key: e2, value: { document: o2 } } = _.getNext();
        if (!s.isPrefixOf(e2.path)) break;
        e2.path.length > s.length + 1 || (__PRIVATE_indexOffsetComparator(__PRIVATE_newIndexOffsetFromDocument(o2), n) <= 0 || (r.has(o2.key) || __PRIVATE_queryMatches(t, o2)) && (i = i.insert(o2.key, o2.mutableCopy())));
      }
      return PersistencePromise.resolve(i);
    }
    getAllFromCollectionGroup(e, t, n, r) {
      fail();
    }
    Or(e, t) {
      return PersistencePromise.forEach(this.docs, (e2) => t(e2));
    }
    newChangeBuffer(e) {
      return new __PRIVATE_MemoryRemoteDocumentChangeBuffer(this);
    }
    getSize(e) {
      return PersistencePromise.resolve(this.size);
    }
  };
  var __PRIVATE_MemoryRemoteDocumentChangeBuffer = class extends RemoteDocumentChangeBuffer {
    constructor(e) {
      super(), this.cr = e;
    }
    applyChanges(e) {
      const t = [];
      return this.changes.forEach((n, r) => {
        r.isValidDocument() ? t.push(this.cr.addEntry(e, r)) : this.cr.removeEntry(n);
      }), PersistencePromise.waitFor(t);
    }
    getFromCache(e, t) {
      return this.cr.getEntry(e, t);
    }
    getAllFromCache(e, t) {
      return this.cr.getEntries(e, t);
    }
  };
  var __PRIVATE_MemoryTargetCache = class {
    constructor(e) {
      this.persistence = e, /**
       * Maps a target to the data about that target
       */
      this.Nr = new ObjectMap((e2) => __PRIVATE_canonifyTarget(e2), __PRIVATE_targetEquals), /** The last received snapshot version. */
      this.lastRemoteSnapshotVersion = SnapshotVersion.min(), /** The highest numbered target ID encountered. */
      this.highestTargetId = 0, /** The highest sequence number encountered. */
      this.Lr = 0, /**
       * A ordered bidirectional mapping between documents and the remote target
       * IDs.
       */
      this.Br = new __PRIVATE_ReferenceSet(), this.targetCount = 0, this.kr = __PRIVATE_TargetIdGenerator.Bn();
    }
    forEachTarget(e, t) {
      return this.Nr.forEach((e2, n) => t(n)), PersistencePromise.resolve();
    }
    getLastRemoteSnapshotVersion(e) {
      return PersistencePromise.resolve(this.lastRemoteSnapshotVersion);
    }
    getHighestSequenceNumber(e) {
      return PersistencePromise.resolve(this.Lr);
    }
    allocateTargetId(e) {
      return this.highestTargetId = this.kr.next(), PersistencePromise.resolve(this.highestTargetId);
    }
    setTargetsMetadata(e, t, n) {
      return n && (this.lastRemoteSnapshotVersion = n), t > this.Lr && (this.Lr = t), PersistencePromise.resolve();
    }
    Kn(e) {
      this.Nr.set(e.target, e);
      const t = e.targetId;
      t > this.highestTargetId && (this.kr = new __PRIVATE_TargetIdGenerator(t), this.highestTargetId = t), e.sequenceNumber > this.Lr && (this.Lr = e.sequenceNumber);
    }
    addTargetData(e, t) {
      return this.Kn(t), this.targetCount += 1, PersistencePromise.resolve();
    }
    updateTargetData(e, t) {
      return this.Kn(t), PersistencePromise.resolve();
    }
    removeTargetData(e, t) {
      return this.Nr.delete(t.target), this.Br.gr(t.targetId), this.targetCount -= 1, PersistencePromise.resolve();
    }
    removeTargets(e, t, n) {
      let r = 0;
      const i = [];
      return this.Nr.forEach((s, o) => {
        o.sequenceNumber <= t && null === n.get(o.targetId) && (this.Nr.delete(s), i.push(this.removeMatchingKeysForTargetId(e, o.targetId)), r++);
      }), PersistencePromise.waitFor(i).next(() => r);
    }
    getTargetCount(e) {
      return PersistencePromise.resolve(this.targetCount);
    }
    getTargetData(e, t) {
      const n = this.Nr.get(t) || null;
      return PersistencePromise.resolve(n);
    }
    addMatchingKeys(e, t, n) {
      return this.Br.Rr(t, n), PersistencePromise.resolve();
    }
    removeMatchingKeys(e, t, n) {
      this.Br.mr(t, n);
      const r = this.persistence.referenceDelegate, i = [];
      return r && t.forEach((t2) => {
        i.push(r.markPotentiallyOrphaned(e, t2));
      }), PersistencePromise.waitFor(i);
    }
    removeMatchingKeysForTargetId(e, t) {
      return this.Br.gr(t), PersistencePromise.resolve();
    }
    getMatchingKeysForTargetId(e, t) {
      const n = this.Br.yr(t);
      return PersistencePromise.resolve(n);
    }
    containsKey(e, t) {
      return PersistencePromise.resolve(this.Br.containsKey(t));
    }
  };
  var __PRIVATE_MemoryPersistence = class {
    /**
     * The constructor accepts a factory for creating a reference delegate. This
     * allows both the delegate and this instance to have strong references to
     * each other without having nullable fields that would then need to be
     * checked or asserted on every access.
     */
    constructor(e, t) {
      this.qr = {}, this.overlays = {}, this.Qr = new __PRIVATE_ListenSequence(0), this.Kr = false, this.Kr = true, this.$r = new __PRIVATE_MemoryGlobalsCache(), this.referenceDelegate = e(this), this.Ur = new __PRIVATE_MemoryTargetCache(this);
      this.indexManager = new __PRIVATE_MemoryIndexManager(), this.remoteDocumentCache = function __PRIVATE_newMemoryRemoteDocumentCache(e2) {
        return new __PRIVATE_MemoryRemoteDocumentCacheImpl(e2);
      }((e2) => this.referenceDelegate.Wr(e2)), this.serializer = new __PRIVATE_LocalSerializer(t), this.Gr = new __PRIVATE_MemoryBundleCache(this.serializer);
    }
    start() {
      return Promise.resolve();
    }
    shutdown() {
      return this.Kr = false, Promise.resolve();
    }
    get started() {
      return this.Kr;
    }
    setDatabaseDeletedListener() {
    }
    setNetworkEnabled() {
    }
    getIndexManager(e) {
      return this.indexManager;
    }
    getDocumentOverlayCache(e) {
      let t = this.overlays[e.toKey()];
      return t || (t = new __PRIVATE_MemoryDocumentOverlayCache(), this.overlays[e.toKey()] = t), t;
    }
    getMutationQueue(e, t) {
      let n = this.qr[e.toKey()];
      return n || (n = new __PRIVATE_MemoryMutationQueue(t, this.referenceDelegate), this.qr[e.toKey()] = n), n;
    }
    getGlobalsCache() {
      return this.$r;
    }
    getTargetCache() {
      return this.Ur;
    }
    getRemoteDocumentCache() {
      return this.remoteDocumentCache;
    }
    getBundleCache() {
      return this.Gr;
    }
    runTransaction(e, t, n) {
      __PRIVATE_logDebug("MemoryPersistence", "Starting transaction:", e);
      const r = new __PRIVATE_MemoryTransaction(this.Qr.next());
      return this.referenceDelegate.zr(), n(r).next((e2) => this.referenceDelegate.jr(r).next(() => e2)).toPromise().then((e2) => (r.raiseOnCommittedEvent(), e2));
    }
    Hr(e, t) {
      return PersistencePromise.or(Object.values(this.qr).map((n) => () => n.containsKey(e, t)));
    }
  };
  var __PRIVATE_MemoryTransaction = class extends PersistenceTransaction {
    constructor(e) {
      super(), this.currentSequenceNumber = e;
    }
  };
  var __PRIVATE_MemoryEagerDelegate = class ___PRIVATE_MemoryEagerDelegate {
    constructor(e) {
      this.persistence = e, /** Tracks all documents that are active in Query views. */
      this.Jr = new __PRIVATE_ReferenceSet(), /** The list of documents that are potentially GCed after each transaction. */
      this.Yr = null;
    }
    static Zr(e) {
      return new ___PRIVATE_MemoryEagerDelegate(e);
    }
    get Xr() {
      if (this.Yr) return this.Yr;
      throw fail();
    }
    addReference(e, t, n) {
      return this.Jr.addReference(n, t), this.Xr.delete(n.toString()), PersistencePromise.resolve();
    }
    removeReference(e, t, n) {
      return this.Jr.removeReference(n, t), this.Xr.add(n.toString()), PersistencePromise.resolve();
    }
    markPotentiallyOrphaned(e, t) {
      return this.Xr.add(t.toString()), PersistencePromise.resolve();
    }
    removeTarget(e, t) {
      this.Jr.gr(t.targetId).forEach((e2) => this.Xr.add(e2.toString()));
      const n = this.persistence.getTargetCache();
      return n.getMatchingKeysForTargetId(e, t.targetId).next((e2) => {
        e2.forEach((e3) => this.Xr.add(e3.toString()));
      }).next(() => n.removeTargetData(e, t));
    }
    zr() {
      this.Yr = /* @__PURE__ */ new Set();
    }
    jr(e) {
      const t = this.persistence.getRemoteDocumentCache().newChangeBuffer();
      return PersistencePromise.forEach(this.Xr, (n) => {
        const r = DocumentKey.fromPath(n);
        return this.ei(e, r).next((e2) => {
          e2 || t.removeEntry(r, SnapshotVersion.min());
        });
      }).next(() => (this.Yr = null, t.apply(e)));
    }
    updateLimboDocument(e, t) {
      return this.ei(e, t).next((e2) => {
        e2 ? this.Xr.delete(t.toString()) : this.Xr.add(t.toString());
      });
    }
    Wr(e) {
      return 0;
    }
    ei(e, t) {
      return PersistencePromise.or([() => PersistencePromise.resolve(this.Jr.containsKey(t)), () => this.persistence.getTargetCache().containsKey(e, t), () => this.persistence.Hr(e, t)]);
    }
  };
  var __PRIVATE_LocalViewChanges = class ___PRIVATE_LocalViewChanges {
    constructor(e, t, n, r) {
      this.targetId = e, this.fromCache = t, this.$i = n, this.Ui = r;
    }
    static Wi(e, t) {
      let n = __PRIVATE_documentKeySet(), r = __PRIVATE_documentKeySet();
      for (const e2 of t.docChanges) switch (e2.type) {
        case 0:
          n = n.add(e2.doc.key);
          break;
        case 1:
          r = r.add(e2.doc.key);
      }
      return new ___PRIVATE_LocalViewChanges(e, t.fromCache, n, r);
    }
  };
  var QueryContext = class {
    constructor() {
      this._documentReadCount = 0;
    }
    get documentReadCount() {
      return this._documentReadCount;
    }
    incrementDocumentReadCount(e) {
      this._documentReadCount += e;
    }
  };
  var __PRIVATE_QueryEngine = class {
    constructor() {
      this.Gi = false, this.zi = false, /**
       * SDK only decides whether it should create index when collection size is
       * larger than this.
       */
      this.ji = 100, this.Hi = /**
      * This cost represents the evaluation result of
      * (([index, docKey] + [docKey, docContent]) per document in the result set)
      * / ([docKey, docContent] per documents in full collection scan) coming from
      * experiment [enter PR experiment URL here].
      */
      function __PRIVATE_getDefaultRelativeIndexReadCostPerDocument() {
        return isSafari() ? 8 : __PRIVATE_getAndroidVersion(getUA()) > 0 ? 6 : 4;
      }();
    }
    /** Sets the document view to query against. */
    initialize(e, t) {
      this.Ji = e, this.indexManager = t, this.Gi = true;
    }
    /** Returns all local documents matching the specified query. */
    getDocumentsMatchingQuery(e, t, n, r) {
      const i = {
        result: null
      };
      return this.Yi(e, t).next((e2) => {
        i.result = e2;
      }).next(() => {
        if (!i.result) return this.Zi(e, t, r, n).next((e2) => {
          i.result = e2;
        });
      }).next(() => {
        if (i.result) return;
        const n2 = new QueryContext();
        return this.Xi(e, t, n2).next((r2) => {
          if (i.result = r2, this.zi) return this.es(e, t, n2, r2.size);
        });
      }).next(() => i.result);
    }
    es(e, t, n, r) {
      return n.documentReadCount < this.ji ? (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "SDK will not create cache indexes for query:", __PRIVATE_stringifyQuery(t), "since it only creates cache indexes for collection contains", "more than or equal to", this.ji, "documents"), PersistencePromise.resolve()) : (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "Query:", __PRIVATE_stringifyQuery(t), "scans", n.documentReadCount, "local documents and returns", r, "documents as results."), n.documentReadCount > this.Hi * r ? (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "The SDK decides to create cache indexes for query:", __PRIVATE_stringifyQuery(t), "as using cache indexes may help improve performance."), this.indexManager.createTargetIndexes(e, __PRIVATE_queryToTarget(t))) : PersistencePromise.resolve());
    }
    /**
     * Performs an indexed query that evaluates the query based on a collection's
     * persisted index values. Returns `null` if an index is not available.
     */
    Yi(e, t) {
      if (__PRIVATE_queryMatchesAllDocuments(t))
        return PersistencePromise.resolve(null);
      let n = __PRIVATE_queryToTarget(t);
      return this.indexManager.getIndexType(e, n).next((r) => 0 === r ? null : (null !== t.limit && 1 === r && // We cannot apply a limit for targets that are served using a partial
      // index. If a partial index will be used to serve the target, the
      // query may return a superset of documents that match the target
      // (e.g. if the index doesn't include all the target's filters), or
      // may return the correct set of documents in the wrong order (e.g. if
      // the index doesn't include a segment for one of the orderBys).
      // Therefore, a limit should not be applied in such cases.
      (t = __PRIVATE_queryWithLimit(
        t,
        null,
        "F"
        /* LimitType.First */
      ), n = __PRIVATE_queryToTarget(t)), this.indexManager.getDocumentsMatchingTarget(e, n).next((r2) => {
        const i = __PRIVATE_documentKeySet(...r2);
        return this.Ji.getDocuments(e, i).next((r3) => this.indexManager.getMinOffset(e, n).next((n2) => {
          const s = this.ts(t, r3);
          return this.ns(t, s, i, n2.readTime) ? this.Yi(e, __PRIVATE_queryWithLimit(
            t,
            null,
            "F"
            /* LimitType.First */
          )) : this.rs(e, s, t, n2);
        }));
      })));
    }
    /**
     * Performs a query based on the target's persisted query mapping. Returns
     * `null` if the mapping is not available or cannot be used.
     */
    Zi(e, t, n, r) {
      return __PRIVATE_queryMatchesAllDocuments(t) || r.isEqual(SnapshotVersion.min()) ? PersistencePromise.resolve(null) : this.Ji.getDocuments(e, n).next((i) => {
        const s = this.ts(t, i);
        return this.ns(t, s, n, r) ? PersistencePromise.resolve(null) : (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "Re-using previous result from %s to execute query: %s", r.toString(), __PRIVATE_stringifyQuery(t)), this.rs(e, s, t, __PRIVATE_newIndexOffsetSuccessorFromReadTime(r, -1)).next((e2) => e2));
      });
    }
    /** Applies the query filter and sorting to the provided documents.  */
    ts(e, t) {
      let n = new SortedSet(__PRIVATE_newQueryComparator(e));
      return t.forEach((t2, r) => {
        __PRIVATE_queryMatches(e, r) && (n = n.add(r));
      }), n;
    }
    /**
     * Determines if a limit query needs to be refilled from cache, making it
     * ineligible for index-free execution.
     *
     * @param query - The query.
     * @param sortedPreviousResults - The documents that matched the query when it
     * was last synchronized, sorted by the query's comparator.
     * @param remoteKeys - The document keys that matched the query at the last
     * snapshot.
     * @param limboFreeSnapshotVersion - The version of the snapshot when the
     * query was last synchronized.
     */
    ns(e, t, n, r) {
      if (null === e.limit)
        return false;
      if (n.size !== t.size)
        return true;
      const i = "F" === e.limitType ? t.last() : t.first();
      return !!i && (i.hasPendingWrites || i.version.compareTo(r) > 0);
    }
    Xi(e, t, n) {
      return __PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "Using full collection scan to execute query:", __PRIVATE_stringifyQuery(t)), this.Ji.getDocumentsMatchingQuery(e, t, IndexOffset.min(), n);
    }
    /**
     * Combines the results from an indexed execution with the remaining documents
     * that have not yet been indexed.
     */
    rs(e, t, n, r) {
      return this.Ji.getDocumentsMatchingQuery(e, n, r).next((e2) => (
        // Merge with existing results
        (t.forEach((t2) => {
          e2 = e2.insert(t2.key, t2);
        }), e2)
      ));
    }
  };
  var __PRIVATE_LocalStoreImpl = class {
    constructor(e, t, n, r) {
      this.persistence = e, this.ss = t, this.serializer = r, /**
       * Maps a targetID to data about its target.
       *
       * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
       * of `applyRemoteEvent()` idempotent.
       */
      this.os = new SortedMap(__PRIVATE_primitiveComparator), /** Maps a target to its targetID. */
      // TODO(wuandy): Evaluate if TargetId can be part of Target.
      this._s = new ObjectMap((e2) => __PRIVATE_canonifyTarget(e2), __PRIVATE_targetEquals), /**
       * A per collection group index of the last read time processed by
       * `getNewDocumentChanges()`.
       *
       * PORTING NOTE: This is only used for multi-tab synchronization.
       */
      this.us = /* @__PURE__ */ new Map(), this.cs = e.getRemoteDocumentCache(), this.Ur = e.getTargetCache(), this.Gr = e.getBundleCache(), this.ls(n);
    }
    ls(e) {
      this.documentOverlayCache = this.persistence.getDocumentOverlayCache(e), this.indexManager = this.persistence.getIndexManager(e), this.mutationQueue = this.persistence.getMutationQueue(e, this.indexManager), this.localDocuments = new LocalDocumentsView(this.cs, this.mutationQueue, this.documentOverlayCache, this.indexManager), this.cs.setIndexManager(this.indexManager), this.ss.initialize(this.localDocuments, this.indexManager);
    }
    collectGarbage(e) {
      return this.persistence.runTransaction("Collect garbage", "readwrite-primary", (t) => e.collect(t, this.os));
    }
  };
  function __PRIVATE_newLocalStore(e, t, n, r) {
    return new __PRIVATE_LocalStoreImpl(e, t, n, r);
  }
  async function __PRIVATE_localStoreHandleUserChange(e, t) {
    const n = __PRIVATE_debugCast(e);
    return await n.persistence.runTransaction("Handle user change", "readonly", (e2) => {
      let r;
      return n.mutationQueue.getAllMutationBatches(e2).next((i) => (r = i, n.ls(t), n.mutationQueue.getAllMutationBatches(e2))).next((t2) => {
        const i = [], s = [];
        let o = __PRIVATE_documentKeySet();
        for (const e3 of r) {
          i.push(e3.batchId);
          for (const t3 of e3.mutations) o = o.add(t3.key);
        }
        for (const e3 of t2) {
          s.push(e3.batchId);
          for (const t3 of e3.mutations) o = o.add(t3.key);
        }
        return n.localDocuments.getDocuments(e2, o).next((e3) => ({
          hs: e3,
          removedBatchIds: i,
          addedBatchIds: s
        }));
      });
    });
  }
  function __PRIVATE_localStoreGetLastRemoteSnapshotVersion(e) {
    const t = __PRIVATE_debugCast(e);
    return t.persistence.runTransaction("Get last remote snapshot version", "readonly", (e2) => t.Ur.getLastRemoteSnapshotVersion(e2));
  }
  function __PRIVATE_localStoreApplyRemoteEventToLocalCache(e, t) {
    const n = __PRIVATE_debugCast(e), r = t.snapshotVersion;
    let i = n.os;
    return n.persistence.runTransaction("Apply remote event", "readwrite-primary", (e2) => {
      const s = n.cs.newChangeBuffer({
        trackRemovals: true
      });
      i = n.os;
      const o = [];
      t.targetChanges.forEach((s2, _2) => {
        const a2 = i.get(_2);
        if (!a2) return;
        o.push(n.Ur.removeMatchingKeys(e2, s2.removedDocuments, _2).next(() => n.Ur.addMatchingKeys(e2, s2.addedDocuments, _2)));
        let u = a2.withSequenceNumber(e2.currentSequenceNumber);
        null !== t.targetMismatches.get(_2) ? u = u.withResumeToken(ByteString.EMPTY_BYTE_STRING, SnapshotVersion.min()).withLastLimboFreeSnapshotVersion(SnapshotVersion.min()) : s2.resumeToken.approximateByteSize() > 0 && (u = u.withResumeToken(s2.resumeToken, r)), i = i.insert(_2, u), // Update the target data if there are target changes (or if
        // sufficient time has passed since the last update).
        /**
        * Returns true if the newTargetData should be persisted during an update of
        * an active target. TargetData should always be persisted when a target is
        * being released and should not call this function.
        *
        * While the target is active, TargetData updates can be omitted when nothing
        * about the target has changed except metadata like the resume token or
        * snapshot version. Occasionally it's worth the extra write to prevent these
        * values from getting too stale after a crash, but this doesn't have to be
        * too frequent.
        */
        function __PRIVATE_shouldPersistTargetData(e3, t2, n2) {
          if (0 === e3.resumeToken.approximateByteSize()) return true;
          if (t2.snapshotVersion.toMicroseconds() - e3.snapshotVersion.toMicroseconds() >= 3e8) return true;
          return n2.addedDocuments.size + n2.modifiedDocuments.size + n2.removedDocuments.size > 0;
        }(a2, u, s2) && o.push(n.Ur.updateTargetData(e2, u));
      });
      let _ = __PRIVATE_mutableDocumentMap(), a = __PRIVATE_documentKeySet();
      if (t.documentUpdates.forEach((r2) => {
        t.resolvedLimboDocuments.has(r2) && o.push(n.persistence.referenceDelegate.updateLimboDocument(e2, r2));
      }), // Each loop iteration only affects its "own" doc, so it's safe to get all
      // the remote documents in advance in a single call.
      o.push(__PRIVATE_populateDocumentChangeBuffer(e2, s, t.documentUpdates).next((e3) => {
        _ = e3.Ps, a = e3.Is;
      })), !r.isEqual(SnapshotVersion.min())) {
        const t2 = n.Ur.getLastRemoteSnapshotVersion(e2).next((t3) => n.Ur.setTargetsMetadata(e2, e2.currentSequenceNumber, r));
        o.push(t2);
      }
      return PersistencePromise.waitFor(o).next(() => s.apply(e2)).next(() => n.localDocuments.getLocalViewOfDocuments(e2, _, a)).next(() => _);
    }).then((e2) => (n.os = i, e2));
  }
  function __PRIVATE_populateDocumentChangeBuffer(e, t, n) {
    let r = __PRIVATE_documentKeySet(), i = __PRIVATE_documentKeySet();
    return n.forEach((e2) => r = r.add(e2)), t.getEntries(e, r).next((e2) => {
      let r2 = __PRIVATE_mutableDocumentMap();
      return n.forEach((n2, s) => {
        const o = e2.get(n2);
        s.isFoundDocument() !== o.isFoundDocument() && (i = i.add(n2)), // Note: The order of the steps below is important, since we want
        // to ensure that rejected limbo resolutions (which fabricate
        // NoDocuments with SnapshotVersion.min()) never add documents to
        // cache.
        s.isNoDocument() && s.version.isEqual(SnapshotVersion.min()) ? (
          // NoDocuments with SnapshotVersion.min() are used in manufactured
          // events. We remove these documents from cache since we lost
          // access.
          (t.removeEntry(n2, s.readTime), r2 = r2.insert(n2, s))
        ) : !o.isValidDocument() || s.version.compareTo(o.version) > 0 || 0 === s.version.compareTo(o.version) && o.hasPendingWrites ? (t.addEntry(s), r2 = r2.insert(n2, s)) : __PRIVATE_logDebug("LocalStore", "Ignoring outdated watch update for ", n2, ". Current version:", o.version, " Watch version:", s.version);
      }), {
        Ps: r2,
        Is: i
      };
    });
  }
  function __PRIVATE_localStoreAllocateTarget(e, t) {
    const n = __PRIVATE_debugCast(e);
    return n.persistence.runTransaction("Allocate target", "readwrite", (e2) => {
      let r;
      return n.Ur.getTargetData(e2, t).next((i) => i ? (
        // This target has been listened to previously, so reuse the
        // previous targetID.
        // TODO(mcg): freshen last accessed date?
        (r = i, PersistencePromise.resolve(r))
      ) : n.Ur.allocateTargetId(e2).next((i2) => (r = new TargetData(t, i2, "TargetPurposeListen", e2.currentSequenceNumber), n.Ur.addTargetData(e2, r).next(() => r))));
    }).then((e2) => {
      const r = n.os.get(e2.targetId);
      return (null === r || e2.snapshotVersion.compareTo(r.snapshotVersion) > 0) && (n.os = n.os.insert(e2.targetId, e2), n._s.set(t, e2.targetId)), e2;
    });
  }
  async function __PRIVATE_localStoreReleaseTarget(e, t, n) {
    const r = __PRIVATE_debugCast(e), i = r.os.get(t), s = n ? "readwrite" : "readwrite-primary";
    try {
      n || await r.persistence.runTransaction("Release target", s, (e2) => r.persistence.referenceDelegate.removeTarget(e2, i));
    } catch (e2) {
      if (!__PRIVATE_isIndexedDbTransactionError(e2)) throw e2;
      __PRIVATE_logDebug("LocalStore", `Failed to update sequence numbers for target ${t}: ${e2}`);
    }
    r.os = r.os.remove(t), r._s.delete(i.target);
  }
  function __PRIVATE_localStoreExecuteQuery(e, t, n) {
    const r = __PRIVATE_debugCast(e);
    let i = SnapshotVersion.min(), s = __PRIVATE_documentKeySet();
    return r.persistence.runTransaction(
      "Execute query",
      "readwrite",
      // Use readwrite instead of readonly so indexes can be created
      // Use readwrite instead of readonly so indexes can be created
      (e2) => function __PRIVATE_localStoreGetTargetData(e3, t2, n2) {
        const r2 = __PRIVATE_debugCast(e3), i2 = r2._s.get(n2);
        return void 0 !== i2 ? PersistencePromise.resolve(r2.os.get(i2)) : r2.Ur.getTargetData(t2, n2);
      }(r, e2, __PRIVATE_queryToTarget(t)).next((t2) => {
        if (t2) return i = t2.lastLimboFreeSnapshotVersion, r.Ur.getMatchingKeysForTargetId(e2, t2.targetId).next((e3) => {
          s = e3;
        });
      }).next(() => r.ss.getDocumentsMatchingQuery(e2, t, n ? i : SnapshotVersion.min(), n ? s : __PRIVATE_documentKeySet())).next((e3) => (__PRIVATE_setMaxReadTime(r, __PRIVATE_queryCollectionGroup(t), e3), {
        documents: e3,
        Ts: s
      }))
    );
  }
  function __PRIVATE_setMaxReadTime(e, t, n) {
    let r = e.us.get(t) || SnapshotVersion.min();
    n.forEach((e2, t2) => {
      t2.readTime.compareTo(r) > 0 && (r = t2.readTime);
    }), e.us.set(t, r);
  }
  var __PRIVATE_LocalClientState = class {
    constructor() {
      this.activeTargetIds = __PRIVATE_targetIdSet();
    }
    fs(e) {
      this.activeTargetIds = this.activeTargetIds.add(e);
    }
    gs(e) {
      this.activeTargetIds = this.activeTargetIds.delete(e);
    }
    /**
     * Converts this entry into a JSON-encoded format we can use for WebStorage.
     * Does not encode `clientId` as it is part of the key in WebStorage.
     */
    Vs() {
      const e = {
        activeTargetIds: this.activeTargetIds.toArray(),
        updateTimeMs: Date.now()
      };
      return JSON.stringify(e);
    }
  };
  var __PRIVATE_MemorySharedClientState = class {
    constructor() {
      this.so = new __PRIVATE_LocalClientState(), this.oo = {}, this.onlineStateHandler = null, this.sequenceNumberHandler = null;
    }
    addPendingMutation(e) {
    }
    updateMutationState(e, t, n) {
    }
    addLocalQueryTarget(e, t = true) {
      return t && this.so.fs(e), this.oo[e] || "not-current";
    }
    updateQueryState(e, t, n) {
      this.oo[e] = t;
    }
    removeLocalQueryTarget(e) {
      this.so.gs(e);
    }
    isLocalQueryTarget(e) {
      return this.so.activeTargetIds.has(e);
    }
    clearQueryState(e) {
      delete this.oo[e];
    }
    getAllActiveQueryTargets() {
      return this.so.activeTargetIds;
    }
    isActiveQueryTarget(e) {
      return this.so.activeTargetIds.has(e);
    }
    start() {
      return this.so = new __PRIVATE_LocalClientState(), Promise.resolve();
    }
    handleUserChange(e, t, n) {
    }
    setOnlineState(e) {
    }
    shutdown() {
    }
    writeSequenceNumber(e) {
    }
    notifyBundleLoaded(e) {
    }
  };
  var __PRIVATE_NoopConnectivityMonitor = class {
    _o(e) {
    }
    shutdown() {
    }
  };
  var __PRIVATE_BrowserConnectivityMonitor = class {
    constructor() {
      this.ao = () => this.uo(), this.co = () => this.lo(), this.ho = [], this.Po();
    }
    _o(e) {
      this.ho.push(e);
    }
    shutdown() {
      window.removeEventListener("online", this.ao), window.removeEventListener("offline", this.co);
    }
    Po() {
      window.addEventListener("online", this.ao), window.addEventListener("offline", this.co);
    }
    uo() {
      __PRIVATE_logDebug("ConnectivityMonitor", "Network connectivity changed: AVAILABLE");
      for (const e of this.ho) e(
        0
        /* NetworkStatus.AVAILABLE */
      );
    }
    lo() {
      __PRIVATE_logDebug("ConnectivityMonitor", "Network connectivity changed: UNAVAILABLE");
      for (const e of this.ho) e(
        1
        /* NetworkStatus.UNAVAILABLE */
      );
    }
    // TODO(chenbrian): Consider passing in window either into this component or
    // here for testing via FakeWindow.
    /** Checks that all used attributes of window are available. */
    static D() {
      return "undefined" != typeof window && void 0 !== window.addEventListener && void 0 !== window.removeEventListener;
    }
  };
  var me = null;
  function __PRIVATE_generateUniqueDebugId() {
    return null === me ? me = function __PRIVATE_generateInitialUniqueDebugId() {
      return 268435456 + Math.round(2147483648 * Math.random());
    }() : me++, "0x" + me.toString(16);
  }
  var fe = {
    BatchGetDocuments: "batchGet",
    Commit: "commit",
    RunQuery: "runQuery",
    RunAggregationQuery: "runAggregationQuery"
  };
  var __PRIVATE_StreamBridge = class {
    constructor(e) {
      this.Io = e.Io, this.To = e.To;
    }
    Eo(e) {
      this.Ao = e;
    }
    Ro(e) {
      this.Vo = e;
    }
    mo(e) {
      this.fo = e;
    }
    onMessage(e) {
      this.po = e;
    }
    close() {
      this.To();
    }
    send(e) {
      this.Io(e);
    }
    yo() {
      this.Ao();
    }
    wo() {
      this.Vo();
    }
    So(e) {
      this.fo(e);
    }
    bo(e) {
      this.po(e);
    }
  };
  var ge = "WebChannelConnection";
  var __PRIVATE_WebChannelConnection = class extends /**
   * Base class for all Rest-based connections to the backend (WebChannel and
   * HTTP).
   */
  class __PRIVATE_RestConnection {
    constructor(e) {
      this.databaseInfo = e, this.databaseId = e.databaseId;
      const t = e.ssl ? "https" : "http", n = encodeURIComponent(this.databaseId.projectId), r = encodeURIComponent(this.databaseId.database);
      this.Do = t + "://" + e.host, this.vo = `projects/${n}/databases/${r}`, this.Co = "(default)" === this.databaseId.database ? `project_id=${n}` : `project_id=${n}&database_id=${r}`;
    }
    get Fo() {
      return false;
    }
    Mo(e, t, n, r, i) {
      const s = __PRIVATE_generateUniqueDebugId(), o = this.xo(e, t.toUriEncodedString());
      __PRIVATE_logDebug("RestConnection", `Sending RPC '${e}' ${s}:`, o, n);
      const _ = {
        "google-cloud-resource-prefix": this.vo,
        "x-goog-request-params": this.Co
      };
      return this.Oo(_, r, i), this.No(e, o, _, n).then((t2) => (__PRIVATE_logDebug("RestConnection", `Received RPC '${e}' ${s}: `, t2), t2), (t2) => {
        throw __PRIVATE_logWarn("RestConnection", `RPC '${e}' ${s} failed with error: `, t2, "url: ", o, "request:", n), t2;
      });
    }
    Lo(e, t, n, r, i, s) {
      return this.Mo(e, t, n, r, i);
    }
    /**
     * Modifies the headers for a request, adding any authorization token if
     * present and any additional headers for the request.
     */
    Oo(e, t, n) {
      e["X-Goog-Api-Client"] = // SDK_VERSION is updated to different value at runtime depending on the entry point,
      // so we need to get its value when we need it in a function.
      function __PRIVATE_getGoogApiClientValue() {
        return "gl-js/ fire/" + S;
      }(), // Content-Type: text/plain will avoid preflight requests which might
      // mess with CORS and redirects by proxies. If we add custom headers
      // we will need to change this code to potentially use the $httpOverwrite
      // parameter supported by ESF to avoid triggering preflight requests.
      e["Content-Type"] = "text/plain", this.databaseInfo.appId && (e["X-Firebase-GMPID"] = this.databaseInfo.appId), t && t.headers.forEach((t2, n2) => e[n2] = t2), n && n.headers.forEach((t2, n2) => e[n2] = t2);
    }
    xo(e, t) {
      const n = fe[e];
      return `${this.Do}/v1/${t}:${n}`;
    }
    /**
     * Closes and cleans up any resources associated with the connection. This
     * implementation is a no-op because there are no resources associated
     * with the RestConnection that need to be cleaned up.
     */
    terminate() {
    }
  } {
    constructor(e) {
      super(e), this.forceLongPolling = e.forceLongPolling, this.autoDetectLongPolling = e.autoDetectLongPolling, this.useFetchStreams = e.useFetchStreams, this.longPollingOptions = e.longPollingOptions;
    }
    No(e, t, n, r) {
      const i = __PRIVATE_generateUniqueDebugId();
      return new Promise((s, o) => {
        const _ = new XhrIo();
        _.setWithCredentials(true), _.listenOnce(EventType.COMPLETE, () => {
          try {
            switch (_.getLastErrorCode()) {
              case ErrorCode.NO_ERROR:
                const t2 = _.getResponseJson();
                __PRIVATE_logDebug(ge, `XHR for RPC '${e}' ${i} received:`, JSON.stringify(t2)), s(t2);
                break;
              case ErrorCode.TIMEOUT:
                __PRIVATE_logDebug(ge, `RPC '${e}' ${i} timed out`), o(new FirestoreError(D.DEADLINE_EXCEEDED, "Request time out"));
                break;
              case ErrorCode.HTTP_ERROR:
                const n2 = _.getStatus();
                if (__PRIVATE_logDebug(ge, `RPC '${e}' ${i} failed with status:`, n2, "response text:", _.getResponseText()), n2 > 0) {
                  let e2 = _.getResponseJson();
                  Array.isArray(e2) && (e2 = e2[0]);
                  const t3 = null == e2 ? void 0 : e2.error;
                  if (t3 && t3.status && t3.message) {
                    const e3 = function __PRIVATE_mapCodeFromHttpResponseErrorStatus(e4) {
                      const t4 = e4.toLowerCase().replace(/_/g, "-");
                      return Object.values(D).indexOf(t4) >= 0 ? t4 : D.UNKNOWN;
                    }(t3.status);
                    o(new FirestoreError(e3, t3.message));
                  } else o(new FirestoreError(D.UNKNOWN, "Server responded with status " + _.getStatus()));
                } else
                  o(new FirestoreError(D.UNAVAILABLE, "Connection failed."));
                break;
              default:
                fail();
            }
          } finally {
            __PRIVATE_logDebug(ge, `RPC '${e}' ${i} completed.`);
          }
        });
        const a = JSON.stringify(r);
        __PRIVATE_logDebug(ge, `RPC '${e}' ${i} sending request:`, r), _.send(t, "POST", a, n, 15);
      });
    }
    Bo(e, t, n) {
      const r = __PRIVATE_generateUniqueDebugId(), i = [this.Do, "/", "google.firestore.v1.Firestore", "/", e, "/channel"], s = createWebChannelTransport(), o = getStatEventTarget(), _ = {
        // Required for backend stickiness, routing behavior is based on this
        // parameter.
        httpSessionIdParam: "gsessionid",
        initMessageHeaders: {},
        messageUrlParams: {
          // This param is used to improve routing and project isolation by the
          // backend and must be included in every request.
          database: `projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`
        },
        sendRawJson: true,
        supportsCrossDomainXhr: true,
        internalChannelParams: {
          // Override the default timeout (randomized between 10-20 seconds) since
          // a large write batch on a slow internet connection may take a long
          // time to send to the backend. Rather than have WebChannel impose a
          // tight timeout which could lead to infinite timeouts and retries, we
          // set it very large (5-10 minutes) and rely on the browser's builtin
          // timeouts to kick in if the request isn't working.
          forwardChannelRequestTimeoutMs: 6e5
        },
        forceLongPolling: this.forceLongPolling,
        detectBufferingProxy: this.autoDetectLongPolling
      }, a = this.longPollingOptions.timeoutSeconds;
      void 0 !== a && (_.longPollingTimeout = Math.round(1e3 * a)), this.useFetchStreams && (_.useFetchStreams = true), this.Oo(_.initMessageHeaders, t, n), // Sending the custom headers we just added to request.initMessageHeaders
      // (Authorization, etc.) will trigger the browser to make a CORS preflight
      // request because the XHR will no longer meet the criteria for a "simple"
      // CORS request:
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
      // Therefore to avoid the CORS preflight request (an extra network
      // roundtrip), we use the encodeInitMessageHeaders option to specify that
      // the headers should instead be encoded in the request's POST payload,
      // which is recognized by the webchannel backend.
      _.encodeInitMessageHeaders = true;
      const u = i.join("");
      __PRIVATE_logDebug(ge, `Creating RPC '${e}' stream ${r}: ${u}`, _);
      const c = s.createWebChannel(u, _);
      let l = false, h = false;
      const P = new __PRIVATE_StreamBridge({
        Io: (t2) => {
          h ? __PRIVATE_logDebug(ge, `Not sending because RPC '${e}' stream ${r} is closed:`, t2) : (l || (__PRIVATE_logDebug(ge, `Opening RPC '${e}' stream ${r} transport.`), c.open(), l = true), __PRIVATE_logDebug(ge, `RPC '${e}' stream ${r} sending:`, t2), c.send(t2));
        },
        To: () => c.close()
      }), __PRIVATE_unguardedEventListen = (e2, t2, n2) => {
        e2.listen(t2, (e3) => {
          try {
            n2(e3);
          } catch (e4) {
            setTimeout(() => {
              throw e4;
            }, 0);
          }
        });
      };
      return __PRIVATE_unguardedEventListen(c, WebChannel.EventType.OPEN, () => {
        h || (__PRIVATE_logDebug(ge, `RPC '${e}' stream ${r} transport opened.`), P.yo());
      }), __PRIVATE_unguardedEventListen(c, WebChannel.EventType.CLOSE, () => {
        h || (h = true, __PRIVATE_logDebug(ge, `RPC '${e}' stream ${r} transport closed`), P.So());
      }), __PRIVATE_unguardedEventListen(c, WebChannel.EventType.ERROR, (t2) => {
        h || (h = true, __PRIVATE_logWarn(ge, `RPC '${e}' stream ${r} transport errored:`, t2), P.So(new FirestoreError(D.UNAVAILABLE, "The operation could not be completed")));
      }), __PRIVATE_unguardedEventListen(c, WebChannel.EventType.MESSAGE, (t2) => {
        var n2;
        if (!h) {
          const i2 = t2.data[0];
          __PRIVATE_hardAssert(!!i2);
          const s2 = i2, o2 = s2.error || (null === (n2 = s2[0]) || void 0 === n2 ? void 0 : n2.error);
          if (o2) {
            __PRIVATE_logDebug(ge, `RPC '${e}' stream ${r} received error:`, o2);
            const t3 = o2.status;
            let n3 = (
              /**
              * Maps an error Code from a GRPC status identifier like 'NOT_FOUND'.
              *
              * @returns The Code equivalent to the given status string or undefined if
              *     there is no match.
              */
              function __PRIVATE_mapCodeFromRpcStatus(e2) {
                const t4 = le[e2];
                if (void 0 !== t4) return __PRIVATE_mapCodeFromRpcCode(t4);
              }(t3)
            ), i3 = o2.message;
            void 0 === n3 && (n3 = D.INTERNAL, i3 = "Unknown error status: " + t3 + " with message " + o2.message), // Mark closed so no further events are propagated
            h = true, P.So(new FirestoreError(n3, i3)), c.close();
          } else __PRIVATE_logDebug(ge, `RPC '${e}' stream ${r} received:`, i2), P.bo(i2);
        }
      }), __PRIVATE_unguardedEventListen(o, Event.STAT_EVENT, (t2) => {
        t2.stat === Stat.PROXY ? __PRIVATE_logDebug(ge, `RPC '${e}' stream ${r} detected buffering proxy`) : t2.stat === Stat.NOPROXY && __PRIVATE_logDebug(ge, `RPC '${e}' stream ${r} detected no buffering proxy`);
      }), setTimeout(() => {
        P.wo();
      }, 0), P;
    }
  };
  function getDocument() {
    return "undefined" != typeof document ? document : null;
  }
  function __PRIVATE_newSerializer(e) {
    return new JsonProtoSerializer(
      e,
      /* useProto3Json= */
      true
    );
  }
  var __PRIVATE_ExponentialBackoff = class {
    constructor(e, t, n = 1e3, r = 1.5, i = 6e4) {
      this.ui = e, this.timerId = t, this.ko = n, this.qo = r, this.Qo = i, this.Ko = 0, this.$o = null, /** The last backoff attempt, as epoch milliseconds. */
      this.Uo = Date.now(), this.reset();
    }
    /**
     * Resets the backoff delay.
     *
     * The very next backoffAndWait() will have no delay. If it is called again
     * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
     * subsequent ones will increase according to the backoffFactor.
     */
    reset() {
      this.Ko = 0;
    }
    /**
     * Resets the backoff delay to the maximum delay (e.g. for use after a
     * RESOURCE_EXHAUSTED error).
     */
    Wo() {
      this.Ko = this.Qo;
    }
    /**
     * Returns a promise that resolves after currentDelayMs, and increases the
     * delay for any subsequent attempts. If there was a pending backoff operation
     * already, it will be canceled.
     */
    Go(e) {
      this.cancel();
      const t = Math.floor(this.Ko + this.zo()), n = Math.max(0, Date.now() - this.Uo), r = Math.max(0, t - n);
      r > 0 && __PRIVATE_logDebug("ExponentialBackoff", `Backing off for ${r} ms (base delay: ${this.Ko} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`), this.$o = this.ui.enqueueAfterDelay(this.timerId, r, () => (this.Uo = Date.now(), e())), // Apply backoff factor to determine next delay and ensure it is within
      // bounds.
      this.Ko *= this.qo, this.Ko < this.ko && (this.Ko = this.ko), this.Ko > this.Qo && (this.Ko = this.Qo);
    }
    jo() {
      null !== this.$o && (this.$o.skipDelay(), this.$o = null);
    }
    cancel() {
      null !== this.$o && (this.$o.cancel(), this.$o = null);
    }
    /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */
    zo() {
      return (Math.random() - 0.5) * this.Ko;
    }
  };
  var __PRIVATE_PersistentStream = class {
    constructor(e, t, n, r, i, s, o, _) {
      this.ui = e, this.Ho = n, this.Jo = r, this.connection = i, this.authCredentialsProvider = s, this.appCheckCredentialsProvider = o, this.listener = _, this.state = 0, /**
       * A close count that's incremented every time the stream is closed; used by
       * getCloseGuardedDispatcher() to invalidate callbacks that happen after
       * close.
       */
      this.Yo = 0, this.Zo = null, this.Xo = null, this.stream = null, /**
       * Count of response messages received.
       */
      this.e_ = 0, this.t_ = new __PRIVATE_ExponentialBackoff(e, t);
    }
    /**
     * Returns true if start() has been called and no error has occurred. True
     * indicates the stream is open or in the process of opening (which
     * encompasses respecting backoff, getting auth tokens, and starting the
     * actual RPC). Use isOpen() to determine if the stream is open and ready for
     * outbound requests.
     */
    n_() {
      return 1 === this.state || 5 === this.state || this.r_();
    }
    /**
     * Returns true if the underlying RPC is open (the onOpen() listener has been
     * called) and the stream is ready for outbound requests.
     */
    r_() {
      return 2 === this.state || 3 === this.state;
    }
    /**
     * Starts the RPC. Only allowed if isStarted() returns false. The stream is
     * not immediately ready for use: onOpen() will be invoked when the RPC is
     * ready for outbound requests, at which point isOpen() will return true.
     *
     * When start returns, isStarted() will return true.
     */
    start() {
      this.e_ = 0, 4 !== this.state ? this.auth() : this.i_();
    }
    /**
     * Stops the RPC. This call is idempotent and allowed regardless of the
     * current isStarted() state.
     *
     * When stop returns, isStarted() and isOpen() will both return false.
     */
    async stop() {
      this.n_() && await this.close(
        0
        /* PersistentStreamState.Initial */
      );
    }
    /**
     * After an error the stream will usually back off on the next attempt to
     * start it. If the error warrants an immediate restart of the stream, the
     * sender can use this to indicate that the receiver should not back off.
     *
     * Each error will call the onClose() listener. That function can decide to
     * inhibit backoff if required.
     */
    s_() {
      this.state = 0, this.t_.reset();
    }
    /**
     * Marks this stream as idle. If no further actions are performed on the
     * stream for one minute, the stream will automatically close itself and
     * notify the stream's onClose() handler with Status.OK. The stream will then
     * be in a !isStarted() state, requiring the caller to start the stream again
     * before further use.
     *
     * Only streams that are in state 'Open' can be marked idle, as all other
     * states imply pending network operations.
     */
    o_() {
      this.r_() && null === this.Zo && (this.Zo = this.ui.enqueueAfterDelay(this.Ho, 6e4, () => this.__()));
    }
    /** Sends a message to the underlying stream. */
    a_(e) {
      this.u_(), this.stream.send(e);
    }
    /** Called by the idle timer when the stream should close due to inactivity. */
    async __() {
      if (this.r_())
        return this.close(
          0
          /* PersistentStreamState.Initial */
        );
    }
    /** Marks the stream as active again. */
    u_() {
      this.Zo && (this.Zo.cancel(), this.Zo = null);
    }
    /** Cancels the health check delayed operation. */
    c_() {
      this.Xo && (this.Xo.cancel(), this.Xo = null);
    }
    /**
     * Closes the stream and cleans up as necessary:
     *
     * * closes the underlying GRPC stream;
     * * calls the onClose handler with the given 'error';
     * * sets internal stream state to 'finalState';
     * * adjusts the backoff timer based on the error
     *
     * A new stream can be opened by calling start().
     *
     * @param finalState - the intended state of the stream after closing.
     * @param error - the error the connection was closed with.
     */
    async close(e, t) {
      this.u_(), this.c_(), this.t_.cancel(), // Invalidates any stream-related callbacks (e.g. from auth or the
      // underlying stream), guaranteeing they won't execute.
      this.Yo++, 4 !== e ? (
        // If this is an intentional close ensure we don't delay our next connection attempt.
        this.t_.reset()
      ) : t && t.code === D.RESOURCE_EXHAUSTED ? (
        // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
        (__PRIVATE_logError(t.toString()), __PRIVATE_logError("Using maximum backoff delay to prevent overloading the backend."), this.t_.Wo())
      ) : t && t.code === D.UNAUTHENTICATED && 3 !== this.state && // "unauthenticated" error means the token was rejected. This should rarely
      // happen since both Auth and AppCheck ensure a sufficient TTL when we
      // request a token. If a user manually resets their system clock this can
      // fail, however. In this case, we should get a Code.UNAUTHENTICATED error
      // before we received the first message and we need to invalidate the token
      // to ensure that we fetch a new token.
      (this.authCredentialsProvider.invalidateToken(), this.appCheckCredentialsProvider.invalidateToken()), // Clean up the underlying stream because we are no longer interested in events.
      null !== this.stream && (this.l_(), this.stream.close(), this.stream = null), // This state must be assigned before calling onClose() to allow the callback to
      // inhibit backoff or otherwise manipulate the state in its non-started state.
      this.state = e, // Notify the listener that the stream closed.
      await this.listener.mo(t);
    }
    /**
     * Can be overridden to perform additional cleanup before the stream is closed.
     * Calling super.tearDown() is not required.
     */
    l_() {
    }
    auth() {
      this.state = 1;
      const e = this.h_(this.Yo), t = this.Yo;
      Promise.all([this.authCredentialsProvider.getToken(), this.appCheckCredentialsProvider.getToken()]).then(([e2, n]) => {
        this.Yo === t && // Normally we'd have to schedule the callback on the AsyncQueue.
        // However, the following calls are safe to be called outside the
        // AsyncQueue since they don't chain asynchronous calls
        this.P_(e2, n);
      }, (t2) => {
        e(() => {
          const e2 = new FirestoreError(D.UNKNOWN, "Fetching auth token failed: " + t2.message);
          return this.I_(e2);
        });
      });
    }
    P_(e, t) {
      const n = this.h_(this.Yo);
      this.stream = this.T_(e, t), this.stream.Eo(() => {
        n(() => this.listener.Eo());
      }), this.stream.Ro(() => {
        n(() => (this.state = 2, this.Xo = this.ui.enqueueAfterDelay(this.Jo, 1e4, () => (this.r_() && (this.state = 3), Promise.resolve())), this.listener.Ro()));
      }), this.stream.mo((e2) => {
        n(() => this.I_(e2));
      }), this.stream.onMessage((e2) => {
        n(() => 1 == ++this.e_ ? this.E_(e2) : this.onNext(e2));
      });
    }
    i_() {
      this.state = 5, this.t_.Go(async () => {
        this.state = 0, this.start();
      });
    }
    // Visible for tests
    I_(e) {
      return __PRIVATE_logDebug("PersistentStream", `close with error: ${e}`), this.stream = null, this.close(4, e);
    }
    /**
     * Returns a "dispatcher" function that dispatches operations onto the
     * AsyncQueue but only runs them if closeCount remains unchanged. This allows
     * us to turn auth / stream callbacks into no-ops if the stream is closed /
     * re-opened, etc.
     */
    h_(e) {
      return (t) => {
        this.ui.enqueueAndForget(() => this.Yo === e ? t() : (__PRIVATE_logDebug("PersistentStream", "stream callback skipped by getCloseGuardedDispatcher."), Promise.resolve()));
      };
    }
  };
  var __PRIVATE_PersistentListenStream = class extends __PRIVATE_PersistentStream {
    constructor(e, t, n, r, i, s) {
      super(e, "listen_stream_connection_backoff", "listen_stream_idle", "health_check_timeout", t, n, r, s), this.serializer = i;
    }
    T_(e, t) {
      return this.connection.Bo("Listen", e, t);
    }
    E_(e) {
      return this.onNext(e);
    }
    onNext(e) {
      this.t_.reset();
      const t = __PRIVATE_fromWatchChange(this.serializer, e), n = function __PRIVATE_versionFromListenResponse(e2) {
        if (!("targetChange" in e2)) return SnapshotVersion.min();
        const t2 = e2.targetChange;
        return t2.targetIds && t2.targetIds.length ? SnapshotVersion.min() : t2.readTime ? __PRIVATE_fromVersion(t2.readTime) : SnapshotVersion.min();
      }(e);
      return this.listener.d_(t, n);
    }
    /**
     * Registers interest in the results of the given target. If the target
     * includes a resumeToken it will be included in the request. Results that
     * affect the target will be streamed back as WatchChange messages that
     * reference the targetId.
     */
    A_(e) {
      const t = {};
      t.database = __PRIVATE_getEncodedDatabaseId(this.serializer), t.addTarget = function __PRIVATE_toTarget(e2, t2) {
        let n2;
        const r = t2.target;
        if (n2 = __PRIVATE_targetIsDocumentTarget(r) ? {
          documents: __PRIVATE_toDocumentsTarget(e2, r)
        } : {
          query: __PRIVATE_toQueryTarget(e2, r)._t
        }, n2.targetId = t2.targetId, t2.resumeToken.approximateByteSize() > 0) {
          n2.resumeToken = __PRIVATE_toBytes(e2, t2.resumeToken);
          const r2 = __PRIVATE_toInt32Proto(e2, t2.expectedCount);
          null !== r2 && (n2.expectedCount = r2);
        } else if (t2.snapshotVersion.compareTo(SnapshotVersion.min()) > 0) {
          n2.readTime = toTimestamp(e2, t2.snapshotVersion.toTimestamp());
          const r2 = __PRIVATE_toInt32Proto(e2, t2.expectedCount);
          null !== r2 && (n2.expectedCount = r2);
        }
        return n2;
      }(this.serializer, e);
      const n = __PRIVATE_toListenRequestLabels(this.serializer, e);
      n && (t.labels = n), this.a_(t);
    }
    /**
     * Unregisters interest in the results of the target associated with the
     * given targetId.
     */
    R_(e) {
      const t = {};
      t.database = __PRIVATE_getEncodedDatabaseId(this.serializer), t.removeTarget = e, this.a_(t);
    }
  };
  var __PRIVATE_DatastoreImpl = class extends class Datastore {
  } {
    constructor(e, t, n, r) {
      super(), this.authCredentials = e, this.appCheckCredentials = t, this.connection = n, this.serializer = r, this.y_ = false;
    }
    w_() {
      if (this.y_) throw new FirestoreError(D.FAILED_PRECONDITION, "The client has already been terminated.");
    }
    /** Invokes the provided RPC with auth and AppCheck tokens. */
    Mo(e, t, n, r) {
      return this.w_(), Promise.all([this.authCredentials.getToken(), this.appCheckCredentials.getToken()]).then(([i, s]) => this.connection.Mo(e, __PRIVATE_toResourcePath(t, n), r, i, s)).catch((e2) => {
        throw "FirebaseError" === e2.name ? (e2.code === D.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), this.appCheckCredentials.invalidateToken()), e2) : new FirestoreError(D.UNKNOWN, e2.toString());
      });
    }
    /** Invokes the provided RPC with streamed results with auth and AppCheck tokens. */
    Lo(e, t, n, r, i) {
      return this.w_(), Promise.all([this.authCredentials.getToken(), this.appCheckCredentials.getToken()]).then(([s, o]) => this.connection.Lo(e, __PRIVATE_toResourcePath(t, n), r, s, o, i)).catch((e2) => {
        throw "FirebaseError" === e2.name ? (e2.code === D.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), this.appCheckCredentials.invalidateToken()), e2) : new FirestoreError(D.UNKNOWN, e2.toString());
      });
    }
    terminate() {
      this.y_ = true, this.connection.terminate();
    }
  };
  var __PRIVATE_OnlineStateTracker = class {
    constructor(e, t) {
      this.asyncQueue = e, this.onlineStateHandler = t, /** The current OnlineState. */
      this.state = "Unknown", /**
       * A count of consecutive failures to open the stream. If it reaches the
       * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
       * Offline.
       */
      this.S_ = 0, /**
       * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
       * transition from OnlineState.Unknown to OnlineState.Offline without waiting
       * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
       */
      this.b_ = null, /**
       * Whether the client should log a warning message if it fails to connect to
       * the backend (initially true, cleared after a successful stream, or if we've
       * logged the message already).
       */
      this.D_ = true;
    }
    /**
     * Called by RemoteStore when a watch stream is started (including on each
     * backoff attempt).
     *
     * If this is the first attempt, it sets the OnlineState to Unknown and starts
     * the onlineStateTimer.
     */
    v_() {
      0 === this.S_ && (this.C_(
        "Unknown"
        /* OnlineState.Unknown */
      ), this.b_ = this.asyncQueue.enqueueAfterDelay("online_state_timeout", 1e4, () => (this.b_ = null, this.F_("Backend didn't respond within 10 seconds."), this.C_(
        "Offline"
        /* OnlineState.Offline */
      ), Promise.resolve())));
    }
    /**
     * Updates our OnlineState as appropriate after the watch stream reports a
     * failure. The first failure moves us to the 'Unknown' state. We then may
     * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
     * actually transition to the 'Offline' state.
     */
    M_(e) {
      "Online" === this.state ? this.C_(
        "Unknown"
        /* OnlineState.Unknown */
      ) : (this.S_++, this.S_ >= 1 && (this.x_(), this.F_(`Connection failed 1 times. Most recent error: ${e.toString()}`), this.C_(
        "Offline"
        /* OnlineState.Offline */
      )));
    }
    /**
     * Explicitly sets the OnlineState to the specified state.
     *
     * Note that this resets our timers / failure counters, etc. used by our
     * Offline heuristics, so must not be used in place of
     * handleWatchStreamStart() and handleWatchStreamFailure().
     */
    set(e) {
      this.x_(), this.S_ = 0, "Online" === e && // We've connected to watch at least once. Don't warn the developer
      // about being offline going forward.
      (this.D_ = false), this.C_(e);
    }
    C_(e) {
      e !== this.state && (this.state = e, this.onlineStateHandler(e));
    }
    F_(e) {
      const t = `Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;
      this.D_ ? (__PRIVATE_logError(t), this.D_ = false) : __PRIVATE_logDebug("OnlineStateTracker", t);
    }
    x_() {
      null !== this.b_ && (this.b_.cancel(), this.b_ = null);
    }
  };
  var __PRIVATE_RemoteStoreImpl = class {
    constructor(e, t, n, r, i) {
      this.localStore = e, this.datastore = t, this.asyncQueue = n, this.remoteSyncer = {}, /**
       * A list of up to MAX_PENDING_WRITES writes that we have fetched from the
       * LocalStore via fillWritePipeline() and have or will send to the write
       * stream.
       *
       * Whenever writePipeline.length > 0 the RemoteStore will attempt to start or
       * restart the write stream. When the stream is established the writes in the
       * pipeline will be sent in order.
       *
       * Writes remain in writePipeline until they are acknowledged by the backend
       * and thus will automatically be re-sent if the stream is interrupted /
       * restarted before they're acknowledged.
       *
       * Write responses from the backend are linked to their originating request
       * purely based on order, and so we can just shift() writes from the front of
       * the writePipeline as we receive responses.
       */
      this.O_ = [], /**
       * A mapping of watched targets that the client cares about tracking and the
       * user has explicitly called a 'listen' for this target.
       *
       * These targets may or may not have been sent to or acknowledged by the
       * server. On re-establishing the listen stream, these targets should be sent
       * to the server. The targets removed with unlistens are removed eagerly
       * without waiting for confirmation from the listen stream.
       */
      this.N_ = /* @__PURE__ */ new Map(), /**
       * A set of reasons for why the RemoteStore may be offline. If empty, the
       * RemoteStore may start its network connections.
       */
      this.L_ = /* @__PURE__ */ new Set(), /**
       * Event handlers that get called when the network is disabled or enabled.
       *
       * PORTING NOTE: These functions are used on the Web client to create the
       * underlying streams (to support tree-shakeable streams). On Android and iOS,
       * the streams are created during construction of RemoteStore.
       */
      this.B_ = [], this.k_ = i, this.k_._o((e2) => {
        n.enqueueAndForget(async () => {
          __PRIVATE_canUseNetwork(this) && (__PRIVATE_logDebug("RemoteStore", "Restarting streams for network reachability change."), await async function __PRIVATE_restartNetwork(e3) {
            const t2 = __PRIVATE_debugCast(e3);
            t2.L_.add(
              4
              /* OfflineCause.ConnectivityChange */
            ), await __PRIVATE_disableNetworkInternal(t2), t2.q_.set(
              "Unknown"
              /* OnlineState.Unknown */
            ), t2.L_.delete(
              4
              /* OfflineCause.ConnectivityChange */
            ), await __PRIVATE_enableNetworkInternal(t2);
          }(this));
        });
      }), this.q_ = new __PRIVATE_OnlineStateTracker(n, r);
    }
  };
  async function __PRIVATE_enableNetworkInternal(e) {
    if (__PRIVATE_canUseNetwork(e)) for (const t of e.B_) await t(
      /* enabled= */
      true
    );
  }
  async function __PRIVATE_disableNetworkInternal(e) {
    for (const t of e.B_) await t(
      /* enabled= */
      false
    );
  }
  function __PRIVATE_remoteStoreListen(e, t) {
    const n = __PRIVATE_debugCast(e);
    n.N_.has(t.targetId) || // Mark this as something the client is currently listening for.
    (n.N_.set(t.targetId, t), __PRIVATE_shouldStartWatchStream(n) ? (
      // The listen will be sent in onWatchStreamOpen
      __PRIVATE_startWatchStream(n)
    ) : __PRIVATE_ensureWatchStream(n).r_() && __PRIVATE_sendWatchRequest(n, t));
  }
  function __PRIVATE_remoteStoreUnlisten(e, t) {
    const n = __PRIVATE_debugCast(e), r = __PRIVATE_ensureWatchStream(n);
    n.N_.delete(t), r.r_() && __PRIVATE_sendUnwatchRequest(n, t), 0 === n.N_.size && (r.r_() ? r.o_() : __PRIVATE_canUseNetwork(n) && // Revert to OnlineState.Unknown if the watch stream is not open and we
    // have no listeners, since without any listens to send we cannot
    // confirm if the stream is healthy and upgrade to OnlineState.Online.
    n.q_.set(
      "Unknown"
      /* OnlineState.Unknown */
    ));
  }
  function __PRIVATE_sendWatchRequest(e, t) {
    if (e.Q_.xe(t.targetId), t.resumeToken.approximateByteSize() > 0 || t.snapshotVersion.compareTo(SnapshotVersion.min()) > 0) {
      const n = e.remoteSyncer.getRemoteKeysForTarget(t.targetId).size;
      t = t.withExpectedCount(n);
    }
    __PRIVATE_ensureWatchStream(e).A_(t);
  }
  function __PRIVATE_sendUnwatchRequest(e, t) {
    e.Q_.xe(t), __PRIVATE_ensureWatchStream(e).R_(t);
  }
  function __PRIVATE_startWatchStream(e) {
    e.Q_ = new __PRIVATE_WatchChangeAggregator({
      getRemoteKeysForTarget: (t) => e.remoteSyncer.getRemoteKeysForTarget(t),
      ot: (t) => e.N_.get(t) || null,
      tt: () => e.datastore.serializer.databaseId
    }), __PRIVATE_ensureWatchStream(e).start(), e.q_.v_();
  }
  function __PRIVATE_shouldStartWatchStream(e) {
    return __PRIVATE_canUseNetwork(e) && !__PRIVATE_ensureWatchStream(e).n_() && e.N_.size > 0;
  }
  function __PRIVATE_canUseNetwork(e) {
    return 0 === __PRIVATE_debugCast(e).L_.size;
  }
  function __PRIVATE_cleanUpWatchStreamState(e) {
    e.Q_ = void 0;
  }
  async function __PRIVATE_onWatchStreamConnected(e) {
    e.q_.set(
      "Online"
      /* OnlineState.Online */
    );
  }
  async function __PRIVATE_onWatchStreamOpen(e) {
    e.N_.forEach((t, n) => {
      __PRIVATE_sendWatchRequest(e, t);
    });
  }
  async function __PRIVATE_onWatchStreamClose(e, t) {
    __PRIVATE_cleanUpWatchStreamState(e), // If we still need the watch stream, retry the connection.
    __PRIVATE_shouldStartWatchStream(e) ? (e.q_.M_(t), __PRIVATE_startWatchStream(e)) : (
      // No need to restart watch stream because there are no active targets.
      // The online state is set to unknown because there is no active attempt
      // at establishing a connection
      e.q_.set(
        "Unknown"
        /* OnlineState.Unknown */
      )
    );
  }
  async function __PRIVATE_onWatchStreamChange(e, t, n) {
    if (
      // Mark the client as online since we got a message from the server
      e.q_.set(
        "Online"
        /* OnlineState.Online */
      ), t instanceof __PRIVATE_WatchTargetChange && 2 === t.state && t.cause
    )
      try {
        await /** Handles an error on a target */
        async function __PRIVATE_handleTargetError(e2, t2) {
          const n2 = t2.cause;
          for (const r of t2.targetIds)
            e2.N_.has(r) && (await e2.remoteSyncer.rejectListen(r, n2), e2.N_.delete(r), e2.Q_.removeTarget(r));
        }(e, t);
      } catch (n2) {
        __PRIVATE_logDebug("RemoteStore", "Failed to remove targets %s: %s ", t.targetIds.join(","), n2), await __PRIVATE_disableNetworkUntilRecovery(e, n2);
      }
    else if (t instanceof __PRIVATE_DocumentWatchChange ? e.Q_.Ke(t) : t instanceof __PRIVATE_ExistenceFilterChange ? e.Q_.He(t) : e.Q_.We(t), !n.isEqual(SnapshotVersion.min())) try {
      const t2 = await __PRIVATE_localStoreGetLastRemoteSnapshotVersion(e.localStore);
      n.compareTo(t2) >= 0 && // We have received a target change with a global snapshot if the snapshot
      // version is not equal to SnapshotVersion.min().
      await /**
      * Takes a batch of changes from the Datastore, repackages them as a
      * RemoteEvent, and passes that on to the listener, which is typically the
      * SyncEngine.
      */
      function __PRIVATE_raiseWatchSnapshot(e2, t3) {
        const n2 = e2.Q_.rt(t3);
        return n2.targetChanges.forEach((n3, r) => {
          if (n3.resumeToken.approximateByteSize() > 0) {
            const i = e2.N_.get(r);
            i && e2.N_.set(r, i.withResumeToken(n3.resumeToken, t3));
          }
        }), // Re-establish listens for the targets that have been invalidated by
        // existence filter mismatches.
        n2.targetMismatches.forEach((t4, n3) => {
          const r = e2.N_.get(t4);
          if (!r)
            return;
          e2.N_.set(t4, r.withResumeToken(ByteString.EMPTY_BYTE_STRING, r.snapshotVersion)), // Cause a hard reset by unwatching and rewatching immediately, but
          // deliberately don't send a resume token so that we get a full update.
          __PRIVATE_sendUnwatchRequest(e2, t4);
          const i = new TargetData(r.target, t4, n3, r.sequenceNumber);
          __PRIVATE_sendWatchRequest(e2, i);
        }), e2.remoteSyncer.applyRemoteEvent(n2);
      }(e, n);
    } catch (t2) {
      __PRIVATE_logDebug("RemoteStore", "Failed to raise snapshot:", t2), await __PRIVATE_disableNetworkUntilRecovery(e, t2);
    }
  }
  async function __PRIVATE_disableNetworkUntilRecovery(e, t, n) {
    if (!__PRIVATE_isIndexedDbTransactionError(t)) throw t;
    e.L_.add(
      1
      /* OfflineCause.IndexedDbFailed */
    ), // Disable network and raise offline snapshots
    await __PRIVATE_disableNetworkInternal(e), e.q_.set(
      "Offline"
      /* OnlineState.Offline */
    ), n || // Use a simple read operation to determine if IndexedDB recovered.
    // Ideally, we would expose a health check directly on SimpleDb, but
    // RemoteStore only has access to persistence through LocalStore.
    (n = () => __PRIVATE_localStoreGetLastRemoteSnapshotVersion(e.localStore)), // Probe IndexedDB periodically and re-enable network
    e.asyncQueue.enqueueRetryable(async () => {
      __PRIVATE_logDebug("RemoteStore", "Retrying IndexedDB access"), await n(), e.L_.delete(
        1
        /* OfflineCause.IndexedDbFailed */
      ), await __PRIVATE_enableNetworkInternal(e);
    });
  }
  async function __PRIVATE_remoteStoreHandleCredentialChange(e, t) {
    const n = __PRIVATE_debugCast(e);
    n.asyncQueue.verifyOperationInProgress(), __PRIVATE_logDebug("RemoteStore", "RemoteStore received new credentials");
    const r = __PRIVATE_canUseNetwork(n);
    n.L_.add(
      3
      /* OfflineCause.CredentialChange */
    ), await __PRIVATE_disableNetworkInternal(n), r && // Don't set the network status to Unknown if we are offline.
    n.q_.set(
      "Unknown"
      /* OnlineState.Unknown */
    ), await n.remoteSyncer.handleCredentialChange(t), n.L_.delete(
      3
      /* OfflineCause.CredentialChange */
    ), await __PRIVATE_enableNetworkInternal(n);
  }
  async function __PRIVATE_remoteStoreApplyPrimaryState(e, t) {
    const n = __PRIVATE_debugCast(e);
    t ? (n.L_.delete(
      2
      /* OfflineCause.IsSecondary */
    ), await __PRIVATE_enableNetworkInternal(n)) : t || (n.L_.add(
      2
      /* OfflineCause.IsSecondary */
    ), await __PRIVATE_disableNetworkInternal(n), n.q_.set(
      "Unknown"
      /* OnlineState.Unknown */
    ));
  }
  function __PRIVATE_ensureWatchStream(e) {
    return e.K_ || // Create stream (but note that it is not started yet).
    (e.K_ = function __PRIVATE_newPersistentWatchStream(e2, t, n) {
      const r = __PRIVATE_debugCast(e2);
      return r.w_(), new __PRIVATE_PersistentListenStream(t, r.connection, r.authCredentials, r.appCheckCredentials, r.serializer, n);
    }(e.datastore, e.asyncQueue, {
      Eo: __PRIVATE_onWatchStreamConnected.bind(null, e),
      Ro: __PRIVATE_onWatchStreamOpen.bind(null, e),
      mo: __PRIVATE_onWatchStreamClose.bind(null, e),
      d_: __PRIVATE_onWatchStreamChange.bind(null, e)
    }), e.B_.push(async (t) => {
      t ? (e.K_.s_(), __PRIVATE_shouldStartWatchStream(e) ? __PRIVATE_startWatchStream(e) : e.q_.set(
        "Unknown"
        /* OnlineState.Unknown */
      )) : (await e.K_.stop(), __PRIVATE_cleanUpWatchStreamState(e));
    })), e.K_;
  }
  var DelayedOperation = class _DelayedOperation {
    constructor(e, t, n, r, i) {
      this.asyncQueue = e, this.timerId = t, this.targetTimeMs = n, this.op = r, this.removalCallback = i, this.deferred = new __PRIVATE_Deferred(), this.then = this.deferred.promise.then.bind(this.deferred.promise), // It's normal for the deferred promise to be canceled (due to cancellation)
      // and so we attach a dummy catch callback to avoid
      // 'UnhandledPromiseRejectionWarning' log spam.
      this.deferred.promise.catch((e2) => {
      });
    }
    get promise() {
      return this.deferred.promise;
    }
    /**
     * Creates and returns a DelayedOperation that has been scheduled to be
     * executed on the provided asyncQueue after the provided delayMs.
     *
     * @param asyncQueue - The queue to schedule the operation on.
     * @param id - A Timer ID identifying the type of operation this is.
     * @param delayMs - The delay (ms) before the operation should be scheduled.
     * @param op - The operation to run.
     * @param removalCallback - A callback to be called synchronously once the
     *   operation is executed or canceled, notifying the AsyncQueue to remove it
     *   from its delayedOperations list.
     *   PORTING NOTE: This exists to prevent making removeDelayedOperation() and
     *   the DelayedOperation class public.
     */
    static createAndSchedule(e, t, n, r, i) {
      const s = Date.now() + n, o = new _DelayedOperation(e, t, s, r, i);
      return o.start(n), o;
    }
    /**
     * Starts the timer. This is called immediately after construction by
     * createAndSchedule().
     */
    start(e) {
      this.timerHandle = setTimeout(() => this.handleDelayElapsed(), e);
    }
    /**
     * Queues the operation to run immediately (if it hasn't already been run or
     * canceled).
     */
    skipDelay() {
      return this.handleDelayElapsed();
    }
    /**
     * Cancels the operation if it hasn't already been executed or canceled. The
     * promise will be rejected.
     *
     * As long as the operation has not yet been run, calling cancel() provides a
     * guarantee that the operation will not be run.
     */
    cancel(e) {
      null !== this.timerHandle && (this.clearTimeout(), this.deferred.reject(new FirestoreError(D.CANCELLED, "Operation cancelled" + (e ? ": " + e : ""))));
    }
    handleDelayElapsed() {
      this.asyncQueue.enqueueAndForget(() => null !== this.timerHandle ? (this.clearTimeout(), this.op().then((e) => this.deferred.resolve(e))) : Promise.resolve());
    }
    clearTimeout() {
      null !== this.timerHandle && (this.removalCallback(this), clearTimeout(this.timerHandle), this.timerHandle = null);
    }
  };
  function __PRIVATE_wrapInUserErrorIfRecoverable(e, t) {
    if (__PRIVATE_logError("AsyncQueue", `${t}: ${e}`), __PRIVATE_isIndexedDbTransactionError(e)) return new FirestoreError(D.UNAVAILABLE, `${t}: ${e}`);
    throw e;
  }
  var DocumentSet = class _DocumentSet {
    /** The default ordering is by key if the comparator is omitted */
    constructor(e) {
      this.comparator = e ? (t, n) => e(t, n) || DocumentKey.comparator(t.key, n.key) : (e2, t) => DocumentKey.comparator(e2.key, t.key), this.keyedMap = documentMap(), this.sortedSet = new SortedMap(this.comparator);
    }
    /**
     * Returns an empty copy of the existing DocumentSet, using the same
     * comparator.
     */
    static emptySet(e) {
      return new _DocumentSet(e.comparator);
    }
    has(e) {
      return null != this.keyedMap.get(e);
    }
    get(e) {
      return this.keyedMap.get(e);
    }
    first() {
      return this.sortedSet.minKey();
    }
    last() {
      return this.sortedSet.maxKey();
    }
    isEmpty() {
      return this.sortedSet.isEmpty();
    }
    /**
     * Returns the index of the provided key in the document set, or -1 if the
     * document key is not present in the set;
     */
    indexOf(e) {
      const t = this.keyedMap.get(e);
      return t ? this.sortedSet.indexOf(t) : -1;
    }
    get size() {
      return this.sortedSet.size;
    }
    /** Iterates documents in order defined by "comparator" */
    forEach(e) {
      this.sortedSet.inorderTraversal((t, n) => (e(t), false));
    }
    /** Inserts or updates a document with the same key */
    add(e) {
      const t = this.delete(e.key);
      return t.copy(t.keyedMap.insert(e.key, e), t.sortedSet.insert(e, null));
    }
    /** Deletes a document with a given key */
    delete(e) {
      const t = this.get(e);
      return t ? this.copy(this.keyedMap.remove(e), this.sortedSet.remove(t)) : this;
    }
    isEqual(e) {
      if (!(e instanceof _DocumentSet)) return false;
      if (this.size !== e.size) return false;
      const t = this.sortedSet.getIterator(), n = e.sortedSet.getIterator();
      for (; t.hasNext(); ) {
        const e2 = t.getNext().key, r = n.getNext().key;
        if (!e2.isEqual(r)) return false;
      }
      return true;
    }
    toString() {
      const e = [];
      return this.forEach((t) => {
        e.push(t.toString());
      }), 0 === e.length ? "DocumentSet ()" : "DocumentSet (\n  " + e.join("  \n") + "\n)";
    }
    copy(e, t) {
      const n = new _DocumentSet();
      return n.comparator = this.comparator, n.keyedMap = e, n.sortedSet = t, n;
    }
  };
  var __PRIVATE_DocumentChangeSet = class {
    constructor() {
      this.W_ = new SortedMap(DocumentKey.comparator);
    }
    track(e) {
      const t = e.doc.key, n = this.W_.get(t);
      n ? (
        // Merge the new change with the existing change.
        0 !== e.type && 3 === n.type ? this.W_ = this.W_.insert(t, e) : 3 === e.type && 1 !== n.type ? this.W_ = this.W_.insert(t, {
          type: n.type,
          doc: e.doc
        }) : 2 === e.type && 2 === n.type ? this.W_ = this.W_.insert(t, {
          type: 2,
          doc: e.doc
        }) : 2 === e.type && 0 === n.type ? this.W_ = this.W_.insert(t, {
          type: 0,
          doc: e.doc
        }) : 1 === e.type && 0 === n.type ? this.W_ = this.W_.remove(t) : 1 === e.type && 2 === n.type ? this.W_ = this.W_.insert(t, {
          type: 1,
          doc: n.doc
        }) : 0 === e.type && 1 === n.type ? this.W_ = this.W_.insert(t, {
          type: 2,
          doc: e.doc
        }) : (
          // This includes these cases, which don't make sense:
          // Added->Added
          // Removed->Removed
          // Modified->Added
          // Removed->Modified
          // Metadata->Added
          // Removed->Metadata
          fail()
        )
      ) : this.W_ = this.W_.insert(t, e);
    }
    G_() {
      const e = [];
      return this.W_.inorderTraversal((t, n) => {
        e.push(n);
      }), e;
    }
  };
  var ViewSnapshot = class _ViewSnapshot {
    constructor(e, t, n, r, i, s, o, _, a) {
      this.query = e, this.docs = t, this.oldDocs = n, this.docChanges = r, this.mutatedKeys = i, this.fromCache = s, this.syncStateChanged = o, this.excludesMetadataChanges = _, this.hasCachedResults = a;
    }
    /** Returns a view snapshot as if all documents in the snapshot were added. */
    static fromInitialDocuments(e, t, n, r, i) {
      const s = [];
      return t.forEach((e2) => {
        s.push({
          type: 0,
          doc: e2
        });
      }), new _ViewSnapshot(
        e,
        t,
        DocumentSet.emptySet(t),
        s,
        n,
        r,
        /* syncStateChanged= */
        true,
        /* excludesMetadataChanges= */
        false,
        i
      );
    }
    get hasPendingWrites() {
      return !this.mutatedKeys.isEmpty();
    }
    isEqual(e) {
      if (!(this.fromCache === e.fromCache && this.hasCachedResults === e.hasCachedResults && this.syncStateChanged === e.syncStateChanged && this.mutatedKeys.isEqual(e.mutatedKeys) && __PRIVATE_queryEquals(this.query, e.query) && this.docs.isEqual(e.docs) && this.oldDocs.isEqual(e.oldDocs))) return false;
      const t = this.docChanges, n = e.docChanges;
      if (t.length !== n.length) return false;
      for (let e2 = 0; e2 < t.length; e2++) if (t[e2].type !== n[e2].type || !t[e2].doc.isEqual(n[e2].doc)) return false;
      return true;
    }
  };
  var __PRIVATE_QueryListenersInfo = class {
    constructor() {
      this.z_ = void 0, this.j_ = [];
    }
    // Helper methods that checks if the query has listeners that listening to remote store
    H_() {
      return this.j_.some((e) => e.J_());
    }
  };
  var __PRIVATE_EventManagerImpl = class {
    constructor() {
      this.queries = __PRIVATE_newQueriesObjectMap(), this.onlineState = "Unknown", this.Y_ = /* @__PURE__ */ new Set();
    }
    terminate() {
      !function __PRIVATE_errorAllTargets(e, t) {
        const n = __PRIVATE_debugCast(e), r = n.queries;
        n.queries = __PRIVATE_newQueriesObjectMap(), r.forEach((e2, n2) => {
          for (const e3 of n2.j_) e3.onError(t);
        });
      }(this, new FirestoreError(D.ABORTED, "Firestore shutting down"));
    }
  };
  function __PRIVATE_newQueriesObjectMap() {
    return new ObjectMap((e) => __PRIVATE_canonifyQuery(e), __PRIVATE_queryEquals);
  }
  async function __PRIVATE_eventManagerListen(e, t) {
    const n = __PRIVATE_debugCast(e);
    let r = 3;
    const i = t.query;
    let s = n.queries.get(i);
    s ? !s.H_() && t.J_() && // Query has been listening to local cache, and tries to add a new listener sourced from watch.
    (r = 2) : (s = new __PRIVATE_QueryListenersInfo(), r = t.J_() ? 0 : 1);
    try {
      switch (r) {
        case 0:
          s.z_ = await n.onListen(
            i,
            /** enableRemoteListen= */
            true
          );
          break;
        case 1:
          s.z_ = await n.onListen(
            i,
            /** enableRemoteListen= */
            false
          );
          break;
        case 2:
          await n.onFirstRemoteStoreListen(i);
      }
    } catch (e2) {
      const n2 = __PRIVATE_wrapInUserErrorIfRecoverable(e2, `Initialization of query '${__PRIVATE_stringifyQuery(t.query)}' failed`);
      return void t.onError(n2);
    }
    if (n.queries.set(i, s), s.j_.push(t), // Run global snapshot listeners if a consistent snapshot has been emitted.
    t.Z_(n.onlineState), s.z_) {
      t.X_(s.z_) && __PRIVATE_raiseSnapshotsInSyncEvent(n);
    }
  }
  async function __PRIVATE_eventManagerUnlisten(e, t) {
    const n = __PRIVATE_debugCast(e), r = t.query;
    let i = 3;
    const s = n.queries.get(r);
    if (s) {
      const e2 = s.j_.indexOf(t);
      e2 >= 0 && (s.j_.splice(e2, 1), 0 === s.j_.length ? i = t.J_() ? 0 : 1 : !s.H_() && t.J_() && // The removed listener is the last one that sourced from watch.
      (i = 2));
    }
    switch (i) {
      case 0:
        return n.queries.delete(r), n.onUnlisten(
          r,
          /** disableRemoteListen= */
          true
        );
      case 1:
        return n.queries.delete(r), n.onUnlisten(
          r,
          /** disableRemoteListen= */
          false
        );
      case 2:
        return n.onLastRemoteStoreUnlisten(r);
      default:
        return;
    }
  }
  function __PRIVATE_eventManagerOnWatchChange(e, t) {
    const n = __PRIVATE_debugCast(e);
    let r = false;
    for (const e2 of t) {
      const t2 = e2.query, i = n.queries.get(t2);
      if (i) {
        for (const t3 of i.j_) t3.X_(e2) && (r = true);
        i.z_ = e2;
      }
    }
    r && __PRIVATE_raiseSnapshotsInSyncEvent(n);
  }
  function __PRIVATE_eventManagerOnWatchError(e, t, n) {
    const r = __PRIVATE_debugCast(e), i = r.queries.get(t);
    if (i) for (const e2 of i.j_) e2.onError(n);
    r.queries.delete(t);
  }
  function __PRIVATE_raiseSnapshotsInSyncEvent(e) {
    e.Y_.forEach((e2) => {
      e2.next();
    });
  }
  var pe;
  var ye;
  (ye = pe || (pe = {})).ea = "default", /** Listen to changes in cache only */
  ye.Cache = "cache";
  var __PRIVATE_QueryListener = class {
    constructor(e, t, n) {
      this.query = e, this.ta = t, /**
       * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
       * observer. This flag is set to true once we've actually raised an event.
       */
      this.na = false, this.ra = null, this.onlineState = "Unknown", this.options = n || {};
    }
    /**
     * Applies the new ViewSnapshot to this listener, raising a user-facing event
     * if applicable (depending on what changed, whether the user has opted into
     * metadata-only changes, etc.). Returns true if a user-facing event was
     * indeed raised.
     */
    X_(e) {
      if (!this.options.includeMetadataChanges) {
        const t2 = [];
        for (const n of e.docChanges) 3 !== n.type && t2.push(n);
        e = new ViewSnapshot(
          e.query,
          e.docs,
          e.oldDocs,
          t2,
          e.mutatedKeys,
          e.fromCache,
          e.syncStateChanged,
          /* excludesMetadataChanges= */
          true,
          e.hasCachedResults
        );
      }
      let t = false;
      return this.na ? this.ia(e) && (this.ta.next(e), t = true) : this.sa(e, this.onlineState) && (this.oa(e), t = true), this.ra = e, t;
    }
    onError(e) {
      this.ta.error(e);
    }
    /** Returns whether a snapshot was raised. */
    Z_(e) {
      this.onlineState = e;
      let t = false;
      return this.ra && !this.na && this.sa(this.ra, e) && (this.oa(this.ra), t = true), t;
    }
    sa(e, t) {
      if (!e.fromCache) return true;
      if (!this.J_()) return true;
      const n = "Offline" !== t;
      return (!this.options._a || !n) && (!e.docs.isEmpty() || e.hasCachedResults || "Offline" === t);
    }
    ia(e) {
      if (e.docChanges.length > 0) return true;
      const t = this.ra && this.ra.hasPendingWrites !== e.hasPendingWrites;
      return !(!e.syncStateChanged && !t) && true === this.options.includeMetadataChanges;
    }
    oa(e) {
      e = ViewSnapshot.fromInitialDocuments(e.query, e.docs, e.mutatedKeys, e.fromCache, e.hasCachedResults), this.na = true, this.ta.next(e);
    }
    J_() {
      return this.options.source !== pe.Cache;
    }
  };
  var __PRIVATE_AddedLimboDocument = class {
    constructor(e) {
      this.key = e;
    }
  };
  var __PRIVATE_RemovedLimboDocument = class {
    constructor(e) {
      this.key = e;
    }
  };
  var __PRIVATE_View = class {
    constructor(e, t) {
      this.query = e, this.Ta = t, this.Ea = null, this.hasCachedResults = false, /**
       * A flag whether the view is current with the backend. A view is considered
       * current after it has seen the current flag from the backend and did not
       * lose consistency within the watch stream (e.g. because of an existence
       * filter mismatch).
       */
      this.current = false, /** Documents in the view but not in the remote target */
      this.da = __PRIVATE_documentKeySet(), /** Document Keys that have local changes */
      this.mutatedKeys = __PRIVATE_documentKeySet(), this.Aa = __PRIVATE_newQueryComparator(e), this.Ra = new DocumentSet(this.Aa);
    }
    /**
     * The set of remote documents that the server has told us belongs to the target associated with
     * this view.
     */
    get Va() {
      return this.Ta;
    }
    /**
     * Iterates over a set of doc changes, applies the query limit, and computes
     * what the new results should be, what the changes were, and whether we may
     * need to go back to the local cache for more results. Does not make any
     * changes to the view.
     * @param docChanges - The doc changes to apply to this view.
     * @param previousChanges - If this is being called with a refill, then start
     *        with this set of docs and changes instead of the current view.
     * @returns a new set of docs, changes, and refill flag.
     */
    ma(e, t) {
      const n = t ? t.fa : new __PRIVATE_DocumentChangeSet(), r = t ? t.Ra : this.Ra;
      let i = t ? t.mutatedKeys : this.mutatedKeys, s = r, o = false;
      const _ = "F" === this.query.limitType && r.size === this.query.limit ? r.last() : null, a = "L" === this.query.limitType && r.size === this.query.limit ? r.first() : null;
      if (e.inorderTraversal((e2, t2) => {
        const u = r.get(e2), c = __PRIVATE_queryMatches(this.query, t2) ? t2 : null, l = !!u && this.mutatedKeys.has(u.key), h = !!c && (c.hasLocalMutations || // We only consider committed mutations for documents that were
        // mutated during the lifetime of the view.
        this.mutatedKeys.has(c.key) && c.hasCommittedMutations);
        let P = false;
        if (u && c) {
          u.data.isEqual(c.data) ? l !== h && (n.track({
            type: 3,
            doc: c
          }), P = true) : this.ga(u, c) || (n.track({
            type: 2,
            doc: c
          }), P = true, (_ && this.Aa(c, _) > 0 || a && this.Aa(c, a) < 0) && // This doc moved from inside the limit to outside the limit.
          // That means there may be some other doc in the local cache
          // that should be included instead.
          (o = true));
        } else !u && c ? (n.track({
          type: 0,
          doc: c
        }), P = true) : u && !c && (n.track({
          type: 1,
          doc: u
        }), P = true, (_ || a) && // A doc was removed from a full limit query. We'll need to
        // requery from the local cache to see if we know about some other
        // doc that should be in the results.
        (o = true));
        P && (c ? (s = s.add(c), i = h ? i.add(e2) : i.delete(e2)) : (s = s.delete(e2), i = i.delete(e2)));
      }), null !== this.query.limit) for (; s.size > this.query.limit; ) {
        const e2 = "F" === this.query.limitType ? s.last() : s.first();
        s = s.delete(e2.key), i = i.delete(e2.key), n.track({
          type: 1,
          doc: e2
        });
      }
      return {
        Ra: s,
        fa: n,
        ns: o,
        mutatedKeys: i
      };
    }
    ga(e, t) {
      return e.hasLocalMutations && t.hasCommittedMutations && !t.hasLocalMutations;
    }
    /**
     * Updates the view with the given ViewDocumentChanges and optionally updates
     * limbo docs and sync state from the provided target change.
     * @param docChanges - The set of changes to make to the view's docs.
     * @param limboResolutionEnabled - Whether to update limbo documents based on
     *        this change.
     * @param targetChange - A target change to apply for computing limbo docs and
     *        sync state.
     * @param targetIsPendingReset - Whether the target is pending to reset due to
     *        existence filter mismatch. If not explicitly specified, it is treated
     *        equivalently to `false`.
     * @returns A new ViewChange with the given docs, changes, and sync state.
     */
    // PORTING NOTE: The iOS/Android clients always compute limbo document changes.
    applyChanges(e, t, n, r) {
      const i = this.Ra;
      this.Ra = e.Ra, this.mutatedKeys = e.mutatedKeys;
      const s = e.fa.G_();
      s.sort((e2, t2) => function __PRIVATE_compareChangeType(e3, t3) {
        const order = (e4) => {
          switch (e4) {
            case 0:
              return 1;
            case 2:
            case 3:
              return 2;
            case 1:
              return 0;
            default:
              return fail();
          }
        };
        return order(e3) - order(t3);
      }(e2.type, t2.type) || this.Aa(e2.doc, t2.doc)), this.pa(n), r = null != r && r;
      const o = t && !r ? this.ya() : [], _ = 0 === this.da.size && this.current && !r ? 1 : 0, a = _ !== this.Ea;
      if (this.Ea = _, 0 !== s.length || a) {
        return {
          snapshot: new ViewSnapshot(
            this.query,
            e.Ra,
            i,
            s,
            e.mutatedKeys,
            0 === _,
            a,
            /* excludesMetadataChanges= */
            false,
            !!n && n.resumeToken.approximateByteSize() > 0
          ),
          wa: o
        };
      }
      return {
        wa: o
      };
    }
    /**
     * Applies an OnlineState change to the view, potentially generating a
     * ViewChange if the view's syncState changes as a result.
     */
    Z_(e) {
      return this.current && "Offline" === e ? (
        // If we're offline, set `current` to false and then call applyChanges()
        // to refresh our syncState and generate a ViewChange as appropriate. We
        // are guaranteed to get a new TargetChange that sets `current` back to
        // true once the client is back online.
        (this.current = false, this.applyChanges(
          {
            Ra: this.Ra,
            fa: new __PRIVATE_DocumentChangeSet(),
            mutatedKeys: this.mutatedKeys,
            ns: false
          },
          /* limboResolutionEnabled= */
          false
        ))
      ) : {
        wa: []
      };
    }
    /**
     * Returns whether the doc for the given key should be in limbo.
     */
    Sa(e) {
      return !this.Ta.has(e) && // The local store doesn't think it's a result, so it shouldn't be in limbo.
      (!!this.Ra.has(e) && !this.Ra.get(e).hasLocalMutations);
    }
    /**
     * Updates syncedDocuments, current, and limbo docs based on the given change.
     * Returns the list of changes to which docs are in limbo.
     */
    pa(e) {
      e && (e.addedDocuments.forEach((e2) => this.Ta = this.Ta.add(e2)), e.modifiedDocuments.forEach((e2) => {
      }), e.removedDocuments.forEach((e2) => this.Ta = this.Ta.delete(e2)), this.current = e.current);
    }
    ya() {
      if (!this.current) return [];
      const e = this.da;
      this.da = __PRIVATE_documentKeySet(), this.Ra.forEach((e2) => {
        this.Sa(e2.key) && (this.da = this.da.add(e2.key));
      });
      const t = [];
      return e.forEach((e2) => {
        this.da.has(e2) || t.push(new __PRIVATE_RemovedLimboDocument(e2));
      }), this.da.forEach((n) => {
        e.has(n) || t.push(new __PRIVATE_AddedLimboDocument(n));
      }), t;
    }
    /**
     * Update the in-memory state of the current view with the state read from
     * persistence.
     *
     * We update the query view whenever a client's primary status changes:
     * - When a client transitions from primary to secondary, it can miss
     *   LocalStorage updates and its query views may temporarily not be
     *   synchronized with the state on disk.
     * - For secondary to primary transitions, the client needs to update the list
     *   of `syncedDocuments` since secondary clients update their query views
     *   based purely on synthesized RemoteEvents.
     *
     * @param queryResult.documents - The documents that match the query according
     * to the LocalStore.
     * @param queryResult.remoteKeys - The keys of the documents that match the
     * query according to the backend.
     *
     * @returns The ViewChange that resulted from this synchronization.
     */
    // PORTING NOTE: Multi-tab only.
    ba(e) {
      this.Ta = e.Ts, this.da = __PRIVATE_documentKeySet();
      const t = this.ma(e.documents);
      return this.applyChanges(
        t,
        /* limboResolutionEnabled= */
        true
      );
    }
    /**
     * Returns a view snapshot as if this query was just listened to. Contains
     * a document add for every existing document and the `fromCache` and
     * `hasPendingWrites` status of the already established view.
     */
    // PORTING NOTE: Multi-tab only.
    Da() {
      return ViewSnapshot.fromInitialDocuments(this.query, this.Ra, this.mutatedKeys, 0 === this.Ea, this.hasCachedResults);
    }
  };
  var __PRIVATE_QueryView = class {
    constructor(e, t, n) {
      this.query = e, this.targetId = t, this.view = n;
    }
  };
  var LimboResolution = class {
    constructor(e) {
      this.key = e, /**
       * Set to true once we've received a document. This is used in
       * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
       * decide whether it needs to manufacture a delete event for the target once
       * the target is CURRENT.
       */
      this.va = false;
    }
  };
  var __PRIVATE_SyncEngineImpl = class {
    constructor(e, t, n, r, i, s) {
      this.localStore = e, this.remoteStore = t, this.eventManager = n, this.sharedClientState = r, this.currentUser = i, this.maxConcurrentLimboResolutions = s, this.Ca = {}, this.Fa = new ObjectMap((e2) => __PRIVATE_canonifyQuery(e2), __PRIVATE_queryEquals), this.Ma = /* @__PURE__ */ new Map(), /**
       * The keys of documents that are in limbo for which we haven't yet started a
       * limbo resolution query. The strings in this set are the result of calling
       * `key.path.canonicalString()` where `key` is a `DocumentKey` object.
       *
       * The `Set` type was chosen because it provides efficient lookup and removal
       * of arbitrary elements and it also maintains insertion order, providing the
       * desired queue-like FIFO semantics.
       */
      this.xa = /* @__PURE__ */ new Set(), /**
       * Keeps track of the target ID for each document that is in limbo with an
       * active target.
       */
      this.Oa = new SortedMap(DocumentKey.comparator), /**
       * Keeps track of the information about an active limbo resolution for each
       * active target ID that was started for the purpose of limbo resolution.
       */
      this.Na = /* @__PURE__ */ new Map(), this.La = new __PRIVATE_ReferenceSet(), /** Stores user completion handlers, indexed by User and BatchId. */
      this.Ba = {}, /** Stores user callbacks waiting for all pending writes to be acknowledged. */
      this.ka = /* @__PURE__ */ new Map(), this.qa = __PRIVATE_TargetIdGenerator.kn(), this.onlineState = "Unknown", // The primary state is set to `true` or `false` immediately after Firestore
      // startup. In the interim, a client should only be considered primary if
      // `isPrimary` is true.
      this.Qa = void 0;
    }
    get isPrimaryClient() {
      return true === this.Qa;
    }
  };
  async function __PRIVATE_syncEngineListen(e, t, n = true) {
    const r = __PRIVATE_ensureWatchCallbacks(e);
    let i;
    const s = r.Fa.get(t);
    return s ? (
      // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
      // already exists when EventManager calls us for the first time. This
      // happens when the primary tab is already listening to this query on
      // behalf of another tab and the user of the primary also starts listening
      // to the query. EventManager will not have an assigned target ID in this
      // case and calls `listen` to obtain this ID.
      (r.sharedClientState.addLocalQueryTarget(s.targetId), i = s.view.Da())
    ) : i = await __PRIVATE_allocateTargetAndMaybeListen(
      r,
      t,
      n,
      /** shouldInitializeView= */
      true
    ), i;
  }
  async function __PRIVATE_triggerRemoteStoreListen(e, t) {
    const n = __PRIVATE_ensureWatchCallbacks(e);
    await __PRIVATE_allocateTargetAndMaybeListen(
      n,
      t,
      /** shouldListenToRemote= */
      true,
      /** shouldInitializeView= */
      false
    );
  }
  async function __PRIVATE_allocateTargetAndMaybeListen(e, t, n, r) {
    const i = await __PRIVATE_localStoreAllocateTarget(e.localStore, __PRIVATE_queryToTarget(t)), s = i.targetId, o = e.sharedClientState.addLocalQueryTarget(s, n);
    let _;
    return r && (_ = await __PRIVATE_initializeViewAndComputeSnapshot(e, t, s, "current" === o, i.resumeToken)), e.isPrimaryClient && n && __PRIVATE_remoteStoreListen(e.remoteStore, i), _;
  }
  async function __PRIVATE_initializeViewAndComputeSnapshot(e, t, n, r, i) {
    e.Ka = (t2, n2, r2) => async function __PRIVATE_applyDocChanges(e2, t3, n3, r3) {
      let i2 = t3.view.ma(n3);
      i2.ns && // The query has a limit and some docs were removed, so we need
      // to re-run the query against the local store to make sure we
      // didn't lose any good docs that had been past the limit.
      (i2 = await __PRIVATE_localStoreExecuteQuery(
        e2.localStore,
        t3.query,
        /* usePreviousResults= */
        false
      ).then(({ documents: e3 }) => t3.view.ma(e3, i2)));
      const s2 = r3 && r3.targetChanges.get(t3.targetId), o2 = r3 && null != r3.targetMismatches.get(t3.targetId), _2 = t3.view.applyChanges(
        i2,
        /* limboResolutionEnabled= */
        e2.isPrimaryClient,
        s2,
        o2
      );
      return __PRIVATE_updateTrackedLimbos(e2, t3.targetId, _2.wa), _2.snapshot;
    }(e, t2, n2, r2);
    const s = await __PRIVATE_localStoreExecuteQuery(
      e.localStore,
      t,
      /* usePreviousResults= */
      true
    ), o = new __PRIVATE_View(t, s.Ts), _ = o.ma(s.documents), a = TargetChange.createSynthesizedTargetChangeForCurrentChange(n, r && "Offline" !== e.onlineState, i), u = o.applyChanges(
      _,
      /* limboResolutionEnabled= */
      e.isPrimaryClient,
      a
    );
    __PRIVATE_updateTrackedLimbos(e, n, u.wa);
    const c = new __PRIVATE_QueryView(t, n, o);
    return e.Fa.set(t, c), e.Ma.has(n) ? e.Ma.get(n).push(t) : e.Ma.set(n, [t]), u.snapshot;
  }
  async function __PRIVATE_syncEngineUnlisten(e, t, n) {
    const r = __PRIVATE_debugCast(e), i = r.Fa.get(t), s = r.Ma.get(i.targetId);
    if (s.length > 1) return r.Ma.set(i.targetId, s.filter((e2) => !__PRIVATE_queryEquals(e2, t))), void r.Fa.delete(t);
    if (r.isPrimaryClient) {
      r.sharedClientState.removeLocalQueryTarget(i.targetId);
      r.sharedClientState.isActiveQueryTarget(i.targetId) || await __PRIVATE_localStoreReleaseTarget(
        r.localStore,
        i.targetId,
        /*keepPersistedTargetData=*/
        false
      ).then(() => {
        r.sharedClientState.clearQueryState(i.targetId), n && __PRIVATE_remoteStoreUnlisten(r.remoteStore, i.targetId), __PRIVATE_removeAndCleanupTarget(r, i.targetId);
      }).catch(__PRIVATE_ignoreIfPrimaryLeaseLoss);
    } else __PRIVATE_removeAndCleanupTarget(r, i.targetId), await __PRIVATE_localStoreReleaseTarget(
      r.localStore,
      i.targetId,
      /*keepPersistedTargetData=*/
      true
    );
  }
  async function __PRIVATE_triggerRemoteStoreUnlisten(e, t) {
    const n = __PRIVATE_debugCast(e), r = n.Fa.get(t), i = n.Ma.get(r.targetId);
    n.isPrimaryClient && 1 === i.length && // PORTING NOTE: Unregister the target ID with local Firestore client as
    // watch target.
    (n.sharedClientState.removeLocalQueryTarget(r.targetId), __PRIVATE_remoteStoreUnlisten(n.remoteStore, r.targetId));
  }
  async function __PRIVATE_syncEngineApplyRemoteEvent(e, t) {
    const n = __PRIVATE_debugCast(e);
    try {
      const e2 = await __PRIVATE_localStoreApplyRemoteEventToLocalCache(n.localStore, t);
      t.targetChanges.forEach((e3, t2) => {
        const r = n.Na.get(t2);
        r && // Since this is a limbo resolution lookup, it's for a single document
        // and it could be added, modified, or removed, but not a combination.
        (__PRIVATE_hardAssert(e3.addedDocuments.size + e3.modifiedDocuments.size + e3.removedDocuments.size <= 1), e3.addedDocuments.size > 0 ? r.va = true : e3.modifiedDocuments.size > 0 ? __PRIVATE_hardAssert(r.va) : e3.removedDocuments.size > 0 && (__PRIVATE_hardAssert(r.va), r.va = false));
      }), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(n, e2, t);
    } catch (e2) {
      await __PRIVATE_ignoreIfPrimaryLeaseLoss(e2);
    }
  }
  function __PRIVATE_syncEngineApplyOnlineStateChange(e, t, n) {
    const r = __PRIVATE_debugCast(e);
    if (r.isPrimaryClient && 0 === n || !r.isPrimaryClient && 1 === n) {
      const e2 = [];
      r.Fa.forEach((n2, r2) => {
        const i = r2.view.Z_(t);
        i.snapshot && e2.push(i.snapshot);
      }), function __PRIVATE_eventManagerOnOnlineStateChange(e3, t2) {
        const n2 = __PRIVATE_debugCast(e3);
        n2.onlineState = t2;
        let r2 = false;
        n2.queries.forEach((e4, n3) => {
          for (const e5 of n3.j_)
            e5.Z_(t2) && (r2 = true);
        }), r2 && __PRIVATE_raiseSnapshotsInSyncEvent(n2);
      }(r.eventManager, t), e2.length && r.Ca.d_(e2), r.onlineState = t, r.isPrimaryClient && r.sharedClientState.setOnlineState(t);
    }
  }
  async function __PRIVATE_syncEngineRejectListen(e, t, n) {
    const r = __PRIVATE_debugCast(e);
    r.sharedClientState.updateQueryState(t, "rejected", n);
    const i = r.Na.get(t), s = i && i.key;
    if (s) {
      let e2 = new SortedMap(DocumentKey.comparator);
      e2 = e2.insert(s, MutableDocument.newNoDocument(s, SnapshotVersion.min()));
      const n2 = __PRIVATE_documentKeySet().add(s), i2 = new RemoteEvent(
        SnapshotVersion.min(),
        /* targetChanges= */
        /* @__PURE__ */ new Map(),
        /* targetMismatches= */
        new SortedMap(__PRIVATE_primitiveComparator),
        e2,
        n2
      );
      await __PRIVATE_syncEngineApplyRemoteEvent(r, i2), // Since this query failed, we won't want to manually unlisten to it.
      // We only remove it from bookkeeping after we successfully applied the
      // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
      // this query when the RemoteStore restarts the Watch stream, which should
      // re-trigger the target failure.
      r.Oa = r.Oa.remove(s), r.Na.delete(t), __PRIVATE_pumpEnqueuedLimboResolutions(r);
    } else await __PRIVATE_localStoreReleaseTarget(
      r.localStore,
      t,
      /* keepPersistedTargetData */
      false
    ).then(() => __PRIVATE_removeAndCleanupTarget(r, t, n)).catch(__PRIVATE_ignoreIfPrimaryLeaseLoss);
  }
  function __PRIVATE_removeAndCleanupTarget(e, t, n = null) {
    e.sharedClientState.removeLocalQueryTarget(t);
    for (const r of e.Ma.get(t)) e.Fa.delete(r), n && e.Ca.$a(r, n);
    if (e.Ma.delete(t), e.isPrimaryClient) {
      e.La.gr(t).forEach((t2) => {
        e.La.containsKey(t2) || // We removed the last reference for this key
        __PRIVATE_removeLimboTarget(e, t2);
      });
    }
  }
  function __PRIVATE_removeLimboTarget(e, t) {
    e.xa.delete(t.path.canonicalString());
    const n = e.Oa.get(t);
    null !== n && (__PRIVATE_remoteStoreUnlisten(e.remoteStore, n), e.Oa = e.Oa.remove(t), e.Na.delete(n), __PRIVATE_pumpEnqueuedLimboResolutions(e));
  }
  function __PRIVATE_updateTrackedLimbos(e, t, n) {
    for (const r of n) if (r instanceof __PRIVATE_AddedLimboDocument) e.La.addReference(r.key, t), __PRIVATE_trackLimboChange(e, r);
    else if (r instanceof __PRIVATE_RemovedLimboDocument) {
      __PRIVATE_logDebug("SyncEngine", "Document no longer in limbo: " + r.key), e.La.removeReference(r.key, t);
      e.La.containsKey(r.key) || // We removed the last reference for this key
      __PRIVATE_removeLimboTarget(e, r.key);
    } else fail();
  }
  function __PRIVATE_trackLimboChange(e, t) {
    const n = t.key, r = n.path.canonicalString();
    e.Oa.get(n) || e.xa.has(r) || (__PRIVATE_logDebug("SyncEngine", "New document in limbo: " + n), e.xa.add(r), __PRIVATE_pumpEnqueuedLimboResolutions(e));
  }
  function __PRIVATE_pumpEnqueuedLimboResolutions(e) {
    for (; e.xa.size > 0 && e.Oa.size < e.maxConcurrentLimboResolutions; ) {
      const t = e.xa.values().next().value;
      e.xa.delete(t);
      const n = new DocumentKey(ResourcePath.fromString(t)), r = e.qa.next();
      e.Na.set(r, new LimboResolution(n)), e.Oa = e.Oa.insert(n, r), __PRIVATE_remoteStoreListen(e.remoteStore, new TargetData(__PRIVATE_queryToTarget(__PRIVATE_newQueryForPath(n.path)), r, "TargetPurposeLimboResolution", __PRIVATE_ListenSequence.oe));
    }
  }
  async function __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(e, t, n) {
    const r = __PRIVATE_debugCast(e), i = [], s = [], o = [];
    r.Fa.isEmpty() || (r.Fa.forEach((e2, _) => {
      o.push(r.Ka(_, t, n).then((e3) => {
        var t2;
        if ((e3 || n) && r.isPrimaryClient) {
          const i2 = e3 ? !e3.fromCache : null === (t2 = null == n ? void 0 : n.targetChanges.get(_.targetId)) || void 0 === t2 ? void 0 : t2.current;
          r.sharedClientState.updateQueryState(_.targetId, i2 ? "current" : "not-current");
        }
        if (e3) {
          i.push(e3);
          const t3 = __PRIVATE_LocalViewChanges.Wi(_.targetId, e3);
          s.push(t3);
        }
      }));
    }), await Promise.all(o), r.Ca.d_(i), await async function __PRIVATE_localStoreNotifyLocalViewChanges(e2, t2) {
      const n2 = __PRIVATE_debugCast(e2);
      try {
        await n2.persistence.runTransaction("notifyLocalViewChanges", "readwrite", (e3) => PersistencePromise.forEach(t2, (t3) => PersistencePromise.forEach(t3.$i, (r2) => n2.persistence.referenceDelegate.addReference(e3, t3.targetId, r2)).next(() => PersistencePromise.forEach(t3.Ui, (r2) => n2.persistence.referenceDelegate.removeReference(e3, t3.targetId, r2)))));
      } catch (e3) {
        if (!__PRIVATE_isIndexedDbTransactionError(e3)) throw e3;
        __PRIVATE_logDebug("LocalStore", "Failed to update sequence numbers: " + e3);
      }
      for (const e3 of t2) {
        const t3 = e3.targetId;
        if (!e3.fromCache) {
          const e4 = n2.os.get(t3), r2 = e4.snapshotVersion, i2 = e4.withLastLimboFreeSnapshotVersion(r2);
          n2.os = n2.os.insert(t3, i2);
        }
      }
    }(r.localStore, s));
  }
  async function __PRIVATE_syncEngineHandleCredentialChange(e, t) {
    const n = __PRIVATE_debugCast(e);
    if (!n.currentUser.isEqual(t)) {
      __PRIVATE_logDebug("SyncEngine", "User change. New user:", t.toKey());
      const e2 = await __PRIVATE_localStoreHandleUserChange(n.localStore, t);
      n.currentUser = t, // Fails tasks waiting for pending writes requested by previous user.
      function __PRIVATE_rejectOutstandingPendingWritesCallbacks(e3, t2) {
        e3.ka.forEach((e4) => {
          e4.forEach((e5) => {
            e5.reject(new FirestoreError(D.CANCELLED, t2));
          });
        }), e3.ka.clear();
      }(n, "'waitForPendingWrites' promise is rejected due to a user change."), // TODO(b/114226417): Consider calling this only in the primary tab.
      n.sharedClientState.handleUserChange(t, e2.removedBatchIds, e2.addedBatchIds), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(n, e2.hs);
    }
  }
  function __PRIVATE_syncEngineGetRemoteKeysForTarget(e, t) {
    const n = __PRIVATE_debugCast(e), r = n.Na.get(t);
    if (r && r.va) return __PRIVATE_documentKeySet().add(r.key);
    {
      let e2 = __PRIVATE_documentKeySet();
      const r2 = n.Ma.get(t);
      if (!r2) return e2;
      for (const t2 of r2) {
        const r3 = n.Fa.get(t2);
        e2 = e2.unionWith(r3.view.Va);
      }
      return e2;
    }
  }
  function __PRIVATE_ensureWatchCallbacks(e) {
    const t = __PRIVATE_debugCast(e);
    return t.remoteStore.remoteSyncer.applyRemoteEvent = __PRIVATE_syncEngineApplyRemoteEvent.bind(null, t), t.remoteStore.remoteSyncer.getRemoteKeysForTarget = __PRIVATE_syncEngineGetRemoteKeysForTarget.bind(null, t), t.remoteStore.remoteSyncer.rejectListen = __PRIVATE_syncEngineRejectListen.bind(null, t), t.Ca.d_ = __PRIVATE_eventManagerOnWatchChange.bind(null, t.eventManager), t.Ca.$a = __PRIVATE_eventManagerOnWatchError.bind(null, t.eventManager), t;
  }
  var __PRIVATE_MemoryOfflineComponentProvider = class {
    constructor() {
      this.kind = "memory", this.synchronizeTabs = false;
    }
    async initialize(e) {
      this.serializer = __PRIVATE_newSerializer(e.databaseInfo.databaseId), this.sharedClientState = this.Wa(e), this.persistence = this.Ga(e), await this.persistence.start(), this.localStore = this.za(e), this.gcScheduler = this.ja(e, this.localStore), this.indexBackfillerScheduler = this.Ha(e, this.localStore);
    }
    ja(e, t) {
      return null;
    }
    Ha(e, t) {
      return null;
    }
    za(e) {
      return __PRIVATE_newLocalStore(this.persistence, new __PRIVATE_QueryEngine(), e.initialUser, this.serializer);
    }
    Ga(e) {
      return new __PRIVATE_MemoryPersistence(__PRIVATE_MemoryEagerDelegate.Zr, this.serializer);
    }
    Wa(e) {
      return new __PRIVATE_MemorySharedClientState();
    }
    async terminate() {
      var e, t;
      null === (e = this.gcScheduler) || void 0 === e || e.stop(), null === (t = this.indexBackfillerScheduler) || void 0 === t || t.stop(), this.sharedClientState.shutdown(), await this.persistence.shutdown();
    }
  };
  __PRIVATE_MemoryOfflineComponentProvider.provider = {
    build: () => new __PRIVATE_MemoryOfflineComponentProvider()
  };
  var OnlineComponentProvider = class {
    async initialize(e, t) {
      this.localStore || (this.localStore = e.localStore, this.sharedClientState = e.sharedClientState, this.datastore = this.createDatastore(t), this.remoteStore = this.createRemoteStore(t), this.eventManager = this.createEventManager(t), this.syncEngine = this.createSyncEngine(
        t,
        /* startAsPrimary=*/
        !e.synchronizeTabs
      ), this.sharedClientState.onlineStateHandler = (e2) => __PRIVATE_syncEngineApplyOnlineStateChange(
        this.syncEngine,
        e2,
        1
        /* OnlineStateSource.SharedClientState */
      ), this.remoteStore.remoteSyncer.handleCredentialChange = __PRIVATE_syncEngineHandleCredentialChange.bind(null, this.syncEngine), await __PRIVATE_remoteStoreApplyPrimaryState(this.remoteStore, this.syncEngine.isPrimaryClient));
    }
    createEventManager(e) {
      return function __PRIVATE_newEventManager() {
        return new __PRIVATE_EventManagerImpl();
      }();
    }
    createDatastore(e) {
      const t = __PRIVATE_newSerializer(e.databaseInfo.databaseId), n = function __PRIVATE_newConnection(e2) {
        return new __PRIVATE_WebChannelConnection(e2);
      }(e.databaseInfo);
      return function __PRIVATE_newDatastore(e2, t2, n2, r) {
        return new __PRIVATE_DatastoreImpl(e2, t2, n2, r);
      }(e.authCredentials, e.appCheckCredentials, n, t);
    }
    createRemoteStore(e) {
      return function __PRIVATE_newRemoteStore(e2, t, n, r, i) {
        return new __PRIVATE_RemoteStoreImpl(e2, t, n, r, i);
      }(this.localStore, this.datastore, e.asyncQueue, (e2) => __PRIVATE_syncEngineApplyOnlineStateChange(
        this.syncEngine,
        e2,
        0
        /* OnlineStateSource.RemoteStore */
      ), function __PRIVATE_newConnectivityMonitor() {
        return __PRIVATE_BrowserConnectivityMonitor.D() ? new __PRIVATE_BrowserConnectivityMonitor() : new __PRIVATE_NoopConnectivityMonitor();
      }());
    }
    createSyncEngine(e, t) {
      return function __PRIVATE_newSyncEngine(e2, t2, n, r, i, s, o) {
        const _ = new __PRIVATE_SyncEngineImpl(e2, t2, n, r, i, s);
        return o && (_.Qa = true), _;
      }(this.localStore, this.remoteStore, this.eventManager, this.sharedClientState, e.initialUser, e.maxConcurrentLimboResolutions, t);
    }
    async terminate() {
      var e, t;
      await async function __PRIVATE_remoteStoreShutdown(e2) {
        const t2 = __PRIVATE_debugCast(e2);
        __PRIVATE_logDebug("RemoteStore", "RemoteStore shutting down."), t2.L_.add(
          5
          /* OfflineCause.Shutdown */
        ), await __PRIVATE_disableNetworkInternal(t2), t2.k_.shutdown(), // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
        // triggering spurious listener events with cached data, etc.
        t2.q_.set(
          "Unknown"
          /* OnlineState.Unknown */
        );
      }(this.remoteStore), null === (e = this.datastore) || void 0 === e || e.terminate(), null === (t = this.eventManager) || void 0 === t || t.terminate();
    }
  };
  OnlineComponentProvider.provider = {
    build: () => new OnlineComponentProvider()
  };
  var __PRIVATE_AsyncObserver = class {
    constructor(e) {
      this.observer = e, /**
       * When set to true, will not raise future events. Necessary to deal with
       * async detachment of listener.
       */
      this.muted = false;
    }
    next(e) {
      this.muted || this.observer.next && this.Ya(this.observer.next, e);
    }
    error(e) {
      this.muted || (this.observer.error ? this.Ya(this.observer.error, e) : __PRIVATE_logError("Uncaught Error in snapshot listener:", e.toString()));
    }
    Za() {
      this.muted = true;
    }
    Ya(e, t) {
      setTimeout(() => {
        this.muted || e(t);
      }, 0);
    }
  };
  var FirestoreClient = class {
    constructor(e, t, n, r, i) {
      this.authCredentials = e, this.appCheckCredentials = t, this.asyncQueue = n, this.databaseInfo = r, this.user = User.UNAUTHENTICATED, this.clientId = __PRIVATE_AutoId.newId(), this.authCredentialListener = () => Promise.resolve(), this.appCheckCredentialListener = () => Promise.resolve(), this._uninitializedComponentsProvider = i, this.authCredentials.start(n, async (e2) => {
        __PRIVATE_logDebug("FirestoreClient", "Received user=", e2.uid), await this.authCredentialListener(e2), this.user = e2;
      }), this.appCheckCredentials.start(n, (e2) => (__PRIVATE_logDebug("FirestoreClient", "Received new app check token=", e2), this.appCheckCredentialListener(e2, this.user)));
    }
    get configuration() {
      return {
        asyncQueue: this.asyncQueue,
        databaseInfo: this.databaseInfo,
        clientId: this.clientId,
        authCredentials: this.authCredentials,
        appCheckCredentials: this.appCheckCredentials,
        initialUser: this.user,
        maxConcurrentLimboResolutions: 100
      };
    }
    setCredentialChangeListener(e) {
      this.authCredentialListener = e;
    }
    setAppCheckTokenChangeListener(e) {
      this.appCheckCredentialListener = e;
    }
    terminate() {
      this.asyncQueue.enterRestrictedMode();
      const e = new __PRIVATE_Deferred();
      return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async () => {
        try {
          this._onlineComponents && await this._onlineComponents.terminate(), this._offlineComponents && await this._offlineComponents.terminate(), // The credentials provider must be terminated after shutting down the
          // RemoteStore as it will prevent the RemoteStore from retrieving auth
          // tokens.
          this.authCredentials.shutdown(), this.appCheckCredentials.shutdown(), e.resolve();
        } catch (t) {
          const n = __PRIVATE_wrapInUserErrorIfRecoverable(t, "Failed to shutdown persistence");
          e.reject(n);
        }
      }), e.promise;
    }
  };
  async function __PRIVATE_setOfflineComponentProvider(e, t) {
    e.asyncQueue.verifyOperationInProgress(), __PRIVATE_logDebug("FirestoreClient", "Initializing OfflineComponentProvider");
    const n = e.configuration;
    await t.initialize(n);
    let r = n.initialUser;
    e.setCredentialChangeListener(async (e2) => {
      r.isEqual(e2) || (await __PRIVATE_localStoreHandleUserChange(t.localStore, e2), r = e2);
    }), // When a user calls clearPersistence() in one client, all other clients
    // need to be terminated to allow the delete to succeed.
    t.persistence.setDatabaseDeletedListener(() => e.terminate()), e._offlineComponents = t;
  }
  async function __PRIVATE_setOnlineComponentProvider(e, t) {
    e.asyncQueue.verifyOperationInProgress();
    const n = await __PRIVATE_ensureOfflineComponents(e);
    __PRIVATE_logDebug("FirestoreClient", "Initializing OnlineComponentProvider"), await t.initialize(n, e.configuration), // The CredentialChangeListener of the online component provider takes
    // precedence over the offline component provider.
    e.setCredentialChangeListener((e2) => __PRIVATE_remoteStoreHandleCredentialChange(t.remoteStore, e2)), e.setAppCheckTokenChangeListener((e2, n2) => __PRIVATE_remoteStoreHandleCredentialChange(t.remoteStore, n2)), e._onlineComponents = t;
  }
  async function __PRIVATE_ensureOfflineComponents(e) {
    if (!e._offlineComponents) if (e._uninitializedComponentsProvider) {
      __PRIVATE_logDebug("FirestoreClient", "Using user provided OfflineComponentProvider");
      try {
        await __PRIVATE_setOfflineComponentProvider(e, e._uninitializedComponentsProvider._offline);
      } catch (t) {
        const n = t;
        if (!function __PRIVATE_canFallbackFromIndexedDbError(e2) {
          return "FirebaseError" === e2.name ? e2.code === D.FAILED_PRECONDITION || e2.code === D.UNIMPLEMENTED : !("undefined" != typeof DOMException && e2 instanceof DOMException) || // When the browser is out of quota we could get either quota exceeded
          // or an aborted error depending on whether the error happened during
          // schema migration.
          22 === e2.code || 20 === e2.code || // Firefox Private Browsing mode disables IndexedDb and returns
          // INVALID_STATE for any usage.
          11 === e2.code;
        }(n)) throw n;
        __PRIVATE_logWarn("Error using user provided cache. Falling back to memory cache: " + n), await __PRIVATE_setOfflineComponentProvider(e, new __PRIVATE_MemoryOfflineComponentProvider());
      }
    } else __PRIVATE_logDebug("FirestoreClient", "Using default OfflineComponentProvider"), await __PRIVATE_setOfflineComponentProvider(e, new __PRIVATE_MemoryOfflineComponentProvider());
    return e._offlineComponents;
  }
  async function __PRIVATE_ensureOnlineComponents(e) {
    return e._onlineComponents || (e._uninitializedComponentsProvider ? (__PRIVATE_logDebug("FirestoreClient", "Using user provided OnlineComponentProvider"), await __PRIVATE_setOnlineComponentProvider(e, e._uninitializedComponentsProvider._online)) : (__PRIVATE_logDebug("FirestoreClient", "Using default OnlineComponentProvider"), await __PRIVATE_setOnlineComponentProvider(e, new OnlineComponentProvider()))), e._onlineComponents;
  }
  async function __PRIVATE_getEventManager(e) {
    const t = await __PRIVATE_ensureOnlineComponents(e), n = t.eventManager;
    return n.onListen = __PRIVATE_syncEngineListen.bind(null, t.syncEngine), n.onUnlisten = __PRIVATE_syncEngineUnlisten.bind(null, t.syncEngine), n.onFirstRemoteStoreListen = __PRIVATE_triggerRemoteStoreListen.bind(null, t.syncEngine), n.onLastRemoteStoreUnlisten = __PRIVATE_triggerRemoteStoreUnlisten.bind(null, t.syncEngine), n;
  }
  function __PRIVATE_firestoreClientGetDocumentsViaSnapshotListener(e, t, n = {}) {
    const r = new __PRIVATE_Deferred();
    return e.asyncQueue.enqueueAndForget(async () => function __PRIVATE_executeQueryViaSnapshotListener(e2, t2, n2, r2, i) {
      const s = new __PRIVATE_AsyncObserver({
        next: (n3) => {
          s.Za(), t2.enqueueAndForget(() => __PRIVATE_eventManagerUnlisten(e2, o)), n3.fromCache && "server" === r2.source ? i.reject(new FirestoreError(D.UNAVAILABLE, 'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')) : i.resolve(n3);
        },
        error: (e3) => i.reject(e3)
      }), o = new __PRIVATE_QueryListener(n2, s, {
        includeMetadataChanges: true,
        _a: true
      });
      return __PRIVATE_eventManagerListen(e2, o);
    }(await __PRIVATE_getEventManager(e), e.asyncQueue, t, n, r)), r.promise;
  }
  function __PRIVATE_cloneLongPollingOptions(e) {
    const t = {};
    return void 0 !== e.timeoutSeconds && (t.timeoutSeconds = e.timeoutSeconds), t;
  }
  var we = /* @__PURE__ */ new Map();
  function __PRIVATE_validateNonEmptyArgument(e, t, n) {
    if (!n) throw new FirestoreError(D.INVALID_ARGUMENT, `Function ${e}() cannot be called with an empty ${t}.`);
  }
  function __PRIVATE_validateIsNotUsedTogether(e, t, n, r) {
    if (true === t && true === r) throw new FirestoreError(D.INVALID_ARGUMENT, `${e} and ${n} cannot be used together.`);
  }
  function __PRIVATE_validateCollectionPath(e) {
    if (DocumentKey.isDocumentKey(e)) throw new FirestoreError(D.INVALID_ARGUMENT, `Invalid collection reference. Collection references must have an odd number of segments, but ${e} has ${e.length}.`);
  }
  function __PRIVATE_valueDescription(e) {
    if (void 0 === e) return "undefined";
    if (null === e) return "null";
    if ("string" == typeof e) return e.length > 20 && (e = `${e.substring(0, 20)}...`), JSON.stringify(e);
    if ("number" == typeof e || "boolean" == typeof e) return "" + e;
    if ("object" == typeof e) {
      if (e instanceof Array) return "an array";
      {
        const t = (
          /** try to get the constructor name for an object. */
          function __PRIVATE_tryGetCustomObjectType(e2) {
            if (e2.constructor) return e2.constructor.name;
            return null;
          }(e)
        );
        return t ? `a custom ${t} object` : "an object";
      }
    }
    return "function" == typeof e ? "a function" : fail();
  }
  function __PRIVATE_cast(e, t) {
    if ("_delegate" in e && // Unwrap Compat types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e = e._delegate), !(e instanceof t)) {
      if (t.name === e.constructor.name) throw new FirestoreError(D.INVALID_ARGUMENT, "Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");
      {
        const n = __PRIVATE_valueDescription(e);
        throw new FirestoreError(D.INVALID_ARGUMENT, `Expected type '${t.name}', but it was: ${n}`);
      }
    }
    return e;
  }
  var FirestoreSettingsImpl = class {
    constructor(e) {
      var t, n;
      if (void 0 === e.host) {
        if (void 0 !== e.ssl) throw new FirestoreError(D.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
        this.host = "firestore.googleapis.com", this.ssl = true;
      } else this.host = e.host, this.ssl = null === (t = e.ssl) || void 0 === t || t;
      if (this.credentials = e.credentials, this.ignoreUndefinedProperties = !!e.ignoreUndefinedProperties, this.localCache = e.localCache, void 0 === e.cacheSizeBytes) this.cacheSizeBytes = 41943040;
      else {
        if (-1 !== e.cacheSizeBytes && e.cacheSizeBytes < 1048576) throw new FirestoreError(D.INVALID_ARGUMENT, "cacheSizeBytes must be at least 1048576");
        this.cacheSizeBytes = e.cacheSizeBytes;
      }
      __PRIVATE_validateIsNotUsedTogether("experimentalForceLongPolling", e.experimentalForceLongPolling, "experimentalAutoDetectLongPolling", e.experimentalAutoDetectLongPolling), this.experimentalForceLongPolling = !!e.experimentalForceLongPolling, this.experimentalForceLongPolling ? this.experimentalAutoDetectLongPolling = false : void 0 === e.experimentalAutoDetectLongPolling ? this.experimentalAutoDetectLongPolling = true : (
        // For backwards compatibility, coerce the value to boolean even though
        // the TypeScript compiler has narrowed the type to boolean already.
        // noinspection PointlessBooleanExpressionJS
        this.experimentalAutoDetectLongPolling = !!e.experimentalAutoDetectLongPolling
      ), this.experimentalLongPollingOptions = __PRIVATE_cloneLongPollingOptions(null !== (n = e.experimentalLongPollingOptions) && void 0 !== n ? n : {}), function __PRIVATE_validateLongPollingOptions(e2) {
        if (void 0 !== e2.timeoutSeconds) {
          if (isNaN(e2.timeoutSeconds)) throw new FirestoreError(D.INVALID_ARGUMENT, `invalid long polling timeout: ${e2.timeoutSeconds} (must not be NaN)`);
          if (e2.timeoutSeconds < 5) throw new FirestoreError(D.INVALID_ARGUMENT, `invalid long polling timeout: ${e2.timeoutSeconds} (minimum allowed value is 5)`);
          if (e2.timeoutSeconds > 30) throw new FirestoreError(D.INVALID_ARGUMENT, `invalid long polling timeout: ${e2.timeoutSeconds} (maximum allowed value is 30)`);
        }
      }(this.experimentalLongPollingOptions), this.useFetchStreams = !!e.useFetchStreams;
    }
    isEqual(e) {
      return this.host === e.host && this.ssl === e.ssl && this.credentials === e.credentials && this.cacheSizeBytes === e.cacheSizeBytes && this.experimentalForceLongPolling === e.experimentalForceLongPolling && this.experimentalAutoDetectLongPolling === e.experimentalAutoDetectLongPolling && function __PRIVATE_longPollingOptionsEqual(e2, t) {
        return e2.timeoutSeconds === t.timeoutSeconds;
      }(this.experimentalLongPollingOptions, e.experimentalLongPollingOptions) && this.ignoreUndefinedProperties === e.ignoreUndefinedProperties && this.useFetchStreams === e.useFetchStreams;
    }
  };
  var Firestore$1 = class {
    /** @hideconstructor */
    constructor(e, t, n, r) {
      this._authCredentials = e, this._appCheckCredentials = t, this._databaseId = n, this._app = r, /**
       * Whether it's a Firestore or Firestore Lite instance.
       */
      this.type = "firestore-lite", this._persistenceKey = "(lite)", this._settings = new FirestoreSettingsImpl({}), this._settingsFrozen = false, // A task that is assigned when the terminate() is invoked and resolved when
      // all components have shut down. Otherwise, Firestore is not terminated,
      // which can mean either the FirestoreClient is in the process of starting,
      // or restarting.
      this._terminateTask = "notTerminated";
    }
    /**
     * The {@link @firebase/app#FirebaseApp} associated with this `Firestore` service
     * instance.
     */
    get app() {
      if (!this._app) throw new FirestoreError(D.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
      return this._app;
    }
    get _initialized() {
      return this._settingsFrozen;
    }
    get _terminated() {
      return "notTerminated" !== this._terminateTask;
    }
    _setSettings(e) {
      if (this._settingsFrozen) throw new FirestoreError(D.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");
      this._settings = new FirestoreSettingsImpl(e), void 0 !== e.credentials && (this._authCredentials = function __PRIVATE_makeAuthCredentialsProvider(e2) {
        if (!e2) return new __PRIVATE_EmptyAuthCredentialsProvider();
        switch (e2.type) {
          case "firstParty":
            return new __PRIVATE_FirstPartyAuthCredentialsProvider(e2.sessionIndex || "0", e2.iamToken || null, e2.authTokenFactory || null);
          case "provider":
            return e2.client;
          default:
            throw new FirestoreError(D.INVALID_ARGUMENT, "makeAuthCredentialsProvider failed due to invalid credential type");
        }
      }(e.credentials));
    }
    _getSettings() {
      return this._settings;
    }
    _freezeSettings() {
      return this._settingsFrozen = true, this._settings;
    }
    _delete() {
      return "notTerminated" === this._terminateTask && (this._terminateTask = this._terminate()), this._terminateTask;
    }
    async _restart() {
      "notTerminated" === this._terminateTask ? await this._terminate() : this._terminateTask = "notTerminated";
    }
    /** Returns a JSON-serializable representation of this `Firestore` instance. */
    toJSON() {
      return {
        app: this._app,
        databaseId: this._databaseId,
        settings: this._settings
      };
    }
    /**
     * Terminates all components used by this client. Subclasses can override
     * this method to clean up their own dependencies, but must also call this
     * method.
     *
     * Only ever called once.
     */
    _terminate() {
      return function __PRIVATE_removeComponents(e) {
        const t = we.get(e);
        t && (__PRIVATE_logDebug("ComponentProvider", "Removing Datastore"), we.delete(e), t.terminate());
      }(this), Promise.resolve();
    }
  };
  function connectFirestoreEmulator(e, t, n, r = {}) {
    var i;
    const s = (e = __PRIVATE_cast(e, Firestore$1))._getSettings(), o = `${t}:${n}`;
    if ("firestore.googleapis.com" !== s.host && s.host !== o && __PRIVATE_logWarn("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."), e._setSettings(Object.assign(Object.assign({}, s), {
      host: o,
      ssl: false
    })), r.mockUserToken) {
      let t2, n2;
      if ("string" == typeof r.mockUserToken) t2 = r.mockUserToken, n2 = User.MOCK_USER;
      else {
        t2 = createMockUserToken(r.mockUserToken, null === (i = e._app) || void 0 === i ? void 0 : i.options.projectId);
        const s2 = r.mockUserToken.sub || r.mockUserToken.user_id;
        if (!s2) throw new FirestoreError(D.INVALID_ARGUMENT, "mockUserToken must contain 'sub' or 'user_id' field!");
        n2 = new User(s2);
      }
      e._authCredentials = new __PRIVATE_EmulatorAuthCredentialsProvider(new __PRIVATE_OAuthToken(t2, n2));
    }
  }
  var Query = class _Query {
    // This is the lite version of the Query class in the main SDK.
    /** @hideconstructor protected */
    constructor(e, t, n) {
      this.converter = t, this._query = n, /** The type of this Firestore reference. */
      this.type = "query", this.firestore = e;
    }
    withConverter(e) {
      return new _Query(this.firestore, e, this._query);
    }
  };
  var DocumentReference = class _DocumentReference {
    /** @hideconstructor */
    constructor(e, t, n) {
      this.converter = t, this._key = n, /** The type of this Firestore reference. */
      this.type = "document", this.firestore = e;
    }
    get _path() {
      return this._key.path;
    }
    /**
     * The document's identifier within its collection.
     */
    get id() {
      return this._key.path.lastSegment();
    }
    /**
     * A string representing the path of the referenced document (relative
     * to the root of the database).
     */
    get path() {
      return this._key.path.canonicalString();
    }
    /**
     * The collection this `DocumentReference` belongs to.
     */
    get parent() {
      return new CollectionReference(this.firestore, this.converter, this._key.path.popLast());
    }
    withConverter(e) {
      return new _DocumentReference(this.firestore, e, this._key);
    }
  };
  var CollectionReference = class _CollectionReference extends Query {
    /** @hideconstructor */
    constructor(e, t, n) {
      super(e, t, __PRIVATE_newQueryForPath(n)), this._path = n, /** The type of this Firestore reference. */
      this.type = "collection";
    }
    /** The collection's identifier. */
    get id() {
      return this._query.path.lastSegment();
    }
    /**
     * A string representing the path of the referenced collection (relative
     * to the root of the database).
     */
    get path() {
      return this._query.path.canonicalString();
    }
    /**
     * A reference to the containing `DocumentReference` if this is a
     * subcollection. If this isn't a subcollection, the reference is null.
     */
    get parent() {
      const e = this._path.popLast();
      return e.isEmpty() ? null : new DocumentReference(
        this.firestore,
        /* converter= */
        null,
        new DocumentKey(e)
      );
    }
    withConverter(e) {
      return new _CollectionReference(this.firestore, e, this._path);
    }
  };
  function collection(e, t, ...n) {
    if (e = getModularInstance(e), __PRIVATE_validateNonEmptyArgument("collection", "path", t), e instanceof Firestore$1) {
      const r = ResourcePath.fromString(t, ...n);
      return __PRIVATE_validateCollectionPath(r), new CollectionReference(
        e,
        /* converter= */
        null,
        r
      );
    }
    {
      if (!(e instanceof DocumentReference || e instanceof CollectionReference)) throw new FirestoreError(D.INVALID_ARGUMENT, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
      const r = e._path.child(ResourcePath.fromString(t, ...n));
      return __PRIVATE_validateCollectionPath(r), new CollectionReference(
        e.firestore,
        /* converter= */
        null,
        r
      );
    }
  }
  var __PRIVATE_AsyncQueueImpl = class {
    constructor(e = Promise.resolve()) {
      this.Pu = [], // Is this AsyncQueue being shut down? Once it is set to true, it will not
      // be changed again.
      this.Iu = false, // Operations scheduled to be queued in the future. Operations are
      // automatically removed after they are run or canceled.
      this.Tu = [], // visible for testing
      this.Eu = null, // Flag set while there's an outstanding AsyncQueue operation, used for
      // assertion sanity-checks.
      this.du = false, // Enabled during shutdown on Safari to prevent future access to IndexedDB.
      this.Au = false, // List of TimerIds to fast-forward delays for.
      this.Ru = [], // Backoff timer used to schedule retries for retryable operations
      this.t_ = new __PRIVATE_ExponentialBackoff(
        this,
        "async_queue_retry"
        /* TimerId.AsyncQueueRetry */
      ), // Visibility handler that triggers an immediate retry of all retryable
      // operations. Meant to speed up recovery when we regain file system access
      // after page comes into foreground.
      this.Vu = () => {
        const e2 = getDocument();
        e2 && __PRIVATE_logDebug("AsyncQueue", "Visibility state changed to " + e2.visibilityState), this.t_.jo();
      }, this.mu = e;
      const t = getDocument();
      t && "function" == typeof t.addEventListener && t.addEventListener("visibilitychange", this.Vu);
    }
    get isShuttingDown() {
      return this.Iu;
    }
    /**
     * Adds a new operation to the queue without waiting for it to complete (i.e.
     * we ignore the Promise result).
     */
    enqueueAndForget(e) {
      this.enqueue(e);
    }
    enqueueAndForgetEvenWhileRestricted(e) {
      this.fu(), // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.gu(e);
    }
    enterRestrictedMode(e) {
      if (!this.Iu) {
        this.Iu = true, this.Au = e || false;
        const t = getDocument();
        t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.Vu);
      }
    }
    enqueue(e) {
      if (this.fu(), this.Iu)
        return new Promise(() => {
        });
      const t = new __PRIVATE_Deferred();
      return this.gu(() => this.Iu && this.Au ? Promise.resolve() : (e().then(t.resolve, t.reject), t.promise)).then(() => t.promise);
    }
    enqueueRetryable(e) {
      this.enqueueAndForget(() => (this.Pu.push(e), this.pu()));
    }
    /**
     * Runs the next operation from the retryable queue. If the operation fails,
     * reschedules with backoff.
     */
    async pu() {
      if (0 !== this.Pu.length) {
        try {
          await this.Pu[0](), this.Pu.shift(), this.t_.reset();
        } catch (e) {
          if (!__PRIVATE_isIndexedDbTransactionError(e)) throw e;
          __PRIVATE_logDebug("AsyncQueue", "Operation failed with retryable error: " + e);
        }
        this.Pu.length > 0 && // If there are additional operations, we re-schedule `retryNextOp()`.
        // This is necessary to run retryable operations that failed during
        // their initial attempt since we don't know whether they are already
        // enqueued. If, for example, `op1`, `op2`, `op3` are enqueued and `op1`
        // needs to  be re-run, we will run `op1`, `op1`, `op2` using the
        // already enqueued calls to `retryNextOp()`. `op3()` will then run in the
        // call scheduled here.
        // Since `backoffAndRun()` cancels an existing backoff and schedules a
        // new backoff on every call, there is only ever a single additional
        // operation in the queue.
        this.t_.Go(() => this.pu());
      }
    }
    gu(e) {
      const t = this.mu.then(() => (this.du = true, e().catch((e2) => {
        this.Eu = e2, this.du = false;
        const t2 = (
          /**
          * Chrome includes Error.message in Error.stack. Other browsers do not.
          * This returns expected output of message + stack when available.
          * @param error - Error or FirestoreError
          */
          function __PRIVATE_getMessageOrStack(e3) {
            let t3 = e3.message || "";
            e3.stack && (t3 = e3.stack.includes(e3.message) ? e3.stack : e3.message + "\n" + e3.stack);
            return t3;
          }(e2)
        );
        throw __PRIVATE_logError("INTERNAL UNHANDLED ERROR: ", t2), e2;
      }).then((e2) => (this.du = false, e2))));
      return this.mu = t, t;
    }
    enqueueAfterDelay(e, t, n) {
      this.fu(), // Fast-forward delays for timerIds that have been overridden.
      this.Ru.indexOf(e) > -1 && (t = 0);
      const r = DelayedOperation.createAndSchedule(this, e, t, n, (e2) => this.yu(e2));
      return this.Tu.push(r), r;
    }
    fu() {
      this.Eu && fail();
    }
    verifyOperationInProgress() {
    }
    /**
     * Waits until all currently queued tasks are finished executing. Delayed
     * operations are not run.
     */
    async wu() {
      let e;
      do {
        e = this.mu, await e;
      } while (e !== this.mu);
    }
    /**
     * For Tests: Determine if a delayed operation with a particular TimerId
     * exists.
     */
    Su(e) {
      for (const t of this.Tu) if (t.timerId === e) return true;
      return false;
    }
    /**
     * For Tests: Runs some or all delayed operations early.
     *
     * @param lastTimerId - Delayed operations up to and including this TimerId
     * will be drained. Pass TimerId.All to run all delayed operations.
     * @returns a Promise that resolves once all operations have been run.
     */
    bu(e) {
      return this.wu().then(() => {
        this.Tu.sort((e2, t) => e2.targetTimeMs - t.targetTimeMs);
        for (const t of this.Tu) if (t.skipDelay(), "all" !== e && t.timerId === e) break;
        return this.wu();
      });
    }
    /**
     * For Tests: Skip all subsequent delays for a timer id.
     */
    Du(e) {
      this.Ru.push(e);
    }
    /** Called once a DelayedOperation is run or canceled. */
    yu(e) {
      const t = this.Tu.indexOf(e);
      this.Tu.splice(t, 1);
    }
  };
  var Firestore = class extends Firestore$1 {
    /** @hideconstructor */
    constructor(e, t, n, r) {
      super(e, t, n, r), /**
       * Whether it's a {@link Firestore} or Firestore Lite instance.
       */
      this.type = "firestore", this._queue = new __PRIVATE_AsyncQueueImpl(), this._persistenceKey = (null == r ? void 0 : r.name) || "[DEFAULT]";
    }
    async _terminate() {
      if (this._firestoreClient) {
        const e = this._firestoreClient.terminate();
        this._queue = new __PRIVATE_AsyncQueueImpl(e), this._firestoreClient = void 0, await e;
      }
    }
  };
  function getFirestore(t, n) {
    const r = "object" == typeof t ? t : getApp(), i = "string" == typeof t ? t : n || "(default)", s = _getProvider(r, "firestore").getImmediate({
      identifier: i
    });
    if (!s._initialized) {
      const e = getDefaultEmulatorHostnameAndPort("firestore");
      e && connectFirestoreEmulator(s, ...e);
    }
    return s;
  }
  function ensureFirestoreConfigured(e) {
    if (e._terminated) throw new FirestoreError(D.FAILED_PRECONDITION, "The client has already been terminated.");
    return e._firestoreClient || __PRIVATE_configureFirestore(e), e._firestoreClient;
  }
  function __PRIVATE_configureFirestore(e) {
    var t, n, r;
    const i = e._freezeSettings(), s = function __PRIVATE_makeDatabaseInfo(e2, t2, n2, r2) {
      return new DatabaseInfo(e2, t2, n2, r2.host, r2.ssl, r2.experimentalForceLongPolling, r2.experimentalAutoDetectLongPolling, __PRIVATE_cloneLongPollingOptions(r2.experimentalLongPollingOptions), r2.useFetchStreams);
    }(e._databaseId, (null === (t = e._app) || void 0 === t ? void 0 : t.options.appId) || "", e._persistenceKey, i);
    e._componentsProvider || (null === (n = i.localCache) || void 0 === n ? void 0 : n._offlineComponentProvider) && (null === (r = i.localCache) || void 0 === r ? void 0 : r._onlineComponentProvider) && (e._componentsProvider = {
      _offline: i.localCache._offlineComponentProvider,
      _online: i.localCache._onlineComponentProvider
    }), e._firestoreClient = new FirestoreClient(e._authCredentials, e._appCheckCredentials, e._queue, s, e._componentsProvider && function __PRIVATE_buildComponentProvider(e2) {
      const t2 = null == e2 ? void 0 : e2._online.build();
      return {
        _offline: null == e2 ? void 0 : e2._offline.build(t2),
        _online: t2
      };
    }(e._componentsProvider));
  }
  var Bytes = class _Bytes {
    /** @hideconstructor */
    constructor(e) {
      this._byteString = e;
    }
    /**
     * Creates a new `Bytes` object from the given Base64 string, converting it to
     * bytes.
     *
     * @param base64 - The Base64 string used to create the `Bytes` object.
     */
    static fromBase64String(e) {
      try {
        return new _Bytes(ByteString.fromBase64String(e));
      } catch (e2) {
        throw new FirestoreError(D.INVALID_ARGUMENT, "Failed to construct data from Base64 string: " + e2);
      }
    }
    /**
     * Creates a new `Bytes` object from the given Uint8Array.
     *
     * @param array - The Uint8Array used to create the `Bytes` object.
     */
    static fromUint8Array(e) {
      return new _Bytes(ByteString.fromUint8Array(e));
    }
    /**
     * Returns the underlying bytes as a Base64-encoded string.
     *
     * @returns The Base64-encoded string created from the `Bytes` object.
     */
    toBase64() {
      return this._byteString.toBase64();
    }
    /**
     * Returns the underlying bytes in a new `Uint8Array`.
     *
     * @returns The Uint8Array created from the `Bytes` object.
     */
    toUint8Array() {
      return this._byteString.toUint8Array();
    }
    /**
     * Returns a string representation of the `Bytes` object.
     *
     * @returns A string representation of the `Bytes` object.
     */
    toString() {
      return "Bytes(base64: " + this.toBase64() + ")";
    }
    /**
     * Returns true if this `Bytes` object is equal to the provided one.
     *
     * @param other - The `Bytes` object to compare against.
     * @returns true if this `Bytes` object is equal to the provided one.
     */
    isEqual(e) {
      return this._byteString.isEqual(e._byteString);
    }
  };
  var FieldPath = class {
    /**
     * Creates a `FieldPath` from the provided field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     *
     * @param fieldNames - A list of field names.
     */
    constructor(...e) {
      for (let t = 0; t < e.length; ++t) if (0 === e[t].length) throw new FirestoreError(D.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
      this._internalPath = new FieldPath$1(e);
    }
    /**
     * Returns true if this `FieldPath` is equal to the provided one.
     *
     * @param other - The `FieldPath` to compare against.
     * @returns true if this `FieldPath` is equal to the provided one.
     */
    isEqual(e) {
      return this._internalPath.isEqual(e._internalPath);
    }
  };
  var GeoPoint = class {
    /**
     * Creates a new immutable `GeoPoint` object with the provided latitude and
     * longitude values.
     * @param latitude - The latitude as number between -90 and 90.
     * @param longitude - The longitude as number between -180 and 180.
     */
    constructor(e, t) {
      if (!isFinite(e) || e < -90 || e > 90) throw new FirestoreError(D.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + e);
      if (!isFinite(t) || t < -180 || t > 180) throw new FirestoreError(D.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + t);
      this._lat = e, this._long = t;
    }
    /**
     * The latitude of this `GeoPoint` instance.
     */
    get latitude() {
      return this._lat;
    }
    /**
     * The longitude of this `GeoPoint` instance.
     */
    get longitude() {
      return this._long;
    }
    /**
     * Returns true if this `GeoPoint` is equal to the provided one.
     *
     * @param other - The `GeoPoint` to compare against.
     * @returns true if this `GeoPoint` is equal to the provided one.
     */
    isEqual(e) {
      return this._lat === e._lat && this._long === e._long;
    }
    /** Returns a JSON-serializable representation of this GeoPoint. */
    toJSON() {
      return {
        latitude: this._lat,
        longitude: this._long
      };
    }
    /**
     * Actually private to JS consumers of our API, so this function is prefixed
     * with an underscore.
     */
    _compareTo(e) {
      return __PRIVATE_primitiveComparator(this._lat, e._lat) || __PRIVATE_primitiveComparator(this._long, e._long);
    }
  };
  var VectorValue = class {
    /**
     * @private
     * @internal
     */
    constructor(e) {
      this._values = (e || []).map((e2) => e2);
    }
    /**
     * Returns a copy of the raw number array form of the vector.
     */
    toArray() {
      return this._values.map((e) => e);
    }
    /**
     * Returns `true` if the two VectorValue has the same raw number arrays, returns `false` otherwise.
     */
    isEqual(e) {
      return function __PRIVATE_isPrimitiveArrayEqual(e2, t) {
        if (e2.length !== t.length) return false;
        for (let n = 0; n < e2.length; ++n) if (e2[n] !== t[n]) return false;
        return true;
      }(this._values, e._values);
    }
  };
  var De = new RegExp("[~\\*/\\[\\]]");
  function __PRIVATE_fieldPathFromDotSeparatedString(e, t, n) {
    if (t.search(De) >= 0) throw __PRIVATE_createError(
      `Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`,
      e,
      /* hasConverter= */
      false,
      /* path= */
      void 0,
      n
    );
    try {
      return new FieldPath(...t.split("."))._internalPath;
    } catch (r) {
      throw __PRIVATE_createError(
        `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,
        e,
        /* hasConverter= */
        false,
        /* path= */
        void 0,
        n
      );
    }
  }
  function __PRIVATE_createError(e, t, n, r, i) {
    const s = r && !r.isEmpty(), o = void 0 !== i;
    let _ = `Function ${t}() called with invalid data`;
    n && (_ += " (via `toFirestore()`)"), _ += ". ";
    let a = "";
    return (s || o) && (a += " (found", s && (a += ` in field ${r}`), o && (a += ` in document ${i}`), a += ")"), new FirestoreError(D.INVALID_ARGUMENT, _ + e + a);
  }
  var DocumentSnapshot$1 = class {
    // Note: This class is stripped down version of the DocumentSnapshot in
    // the legacy SDK. The changes are:
    // - No support for SnapshotMetadata.
    // - No support for SnapshotOptions.
    /** @hideconstructor protected */
    constructor(e, t, n, r, i) {
      this._firestore = e, this._userDataWriter = t, this._key = n, this._document = r, this._converter = i;
    }
    /** Property of the `DocumentSnapshot` that provides the document's ID. */
    get id() {
      return this._key.path.lastSegment();
    }
    /**
     * The `DocumentReference` for the document included in the `DocumentSnapshot`.
     */
    get ref() {
      return new DocumentReference(this._firestore, this._converter, this._key);
    }
    /**
     * Signals whether or not the document at the snapshot's location exists.
     *
     * @returns true if the document exists.
     */
    exists() {
      return null !== this._document;
    }
    /**
     * Retrieves all fields in the document as an `Object`. Returns `undefined` if
     * the document doesn't exist.
     *
     * @returns An `Object` containing all fields in the document or `undefined`
     * if the document doesn't exist.
     */
    data() {
      if (this._document) {
        if (this._converter) {
          const e = new QueryDocumentSnapshot$1(
            this._firestore,
            this._userDataWriter,
            this._key,
            this._document,
            /* converter= */
            null
          );
          return this._converter.fromFirestore(e);
        }
        return this._userDataWriter.convertValue(this._document.data.value);
      }
    }
    /**
     * Retrieves the field specified by `fieldPath`. Returns `undefined` if the
     * document or field doesn't exist.
     *
     * @param fieldPath - The path (for example 'foo' or 'foo.bar') to a specific
     * field.
     * @returns The data at the specified field location or undefined if no such
     * field exists in the document.
     */
    // We are using `any` here to avoid an explicit cast by our users.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(e) {
      if (this._document) {
        const t = this._document.data.field(__PRIVATE_fieldPathFromArgument("DocumentSnapshot.get", e));
        if (null !== t) return this._userDataWriter.convertValue(t);
      }
    }
  };
  var QueryDocumentSnapshot$1 = class extends DocumentSnapshot$1 {
    /**
     * Retrieves all fields in the document as an `Object`.
     *
     * @override
     * @returns An `Object` containing all fields in the document.
     */
    data() {
      return super.data();
    }
  };
  function __PRIVATE_fieldPathFromArgument(e, t) {
    return "string" == typeof t ? __PRIVATE_fieldPathFromDotSeparatedString(e, t) : t instanceof FieldPath ? t._internalPath : t._delegate._internalPath;
  }
  function __PRIVATE_validateHasExplicitOrderByForLimitToLast(e) {
    if ("L" === e.limitType && 0 === e.explicitOrderBy.length) throw new FirestoreError(D.UNIMPLEMENTED, "limitToLast() queries require specifying at least one orderBy() clause");
  }
  var AbstractUserDataWriter = class {
    convertValue(e, t = "none") {
      switch (__PRIVATE_typeOrder(e)) {
        case 0:
          return null;
        case 1:
          return e.booleanValue;
        case 2:
          return __PRIVATE_normalizeNumber(e.integerValue || e.doubleValue);
        case 3:
          return this.convertTimestamp(e.timestampValue);
        case 4:
          return this.convertServerTimestamp(e, t);
        case 5:
          return e.stringValue;
        case 6:
          return this.convertBytes(__PRIVATE_normalizeByteString(e.bytesValue));
        case 7:
          return this.convertReference(e.referenceValue);
        case 8:
          return this.convertGeoPoint(e.geoPointValue);
        case 9:
          return this.convertArray(e.arrayValue, t);
        case 11:
          return this.convertObject(e.mapValue, t);
        case 10:
          return this.convertVectorValue(e.mapValue);
        default:
          throw fail();
      }
    }
    convertObject(e, t) {
      return this.convertObjectMap(e.fields, t);
    }
    /**
     * @internal
     */
    convertObjectMap(e, t = "none") {
      const n = {};
      return forEach(e, (e2, r) => {
        n[e2] = this.convertValue(r, t);
      }), n;
    }
    /**
     * @internal
     */
    convertVectorValue(e) {
      var t, n, r;
      const i = null === (r = null === (n = null === (t = e.fields) || void 0 === t ? void 0 : t.value.arrayValue) || void 0 === n ? void 0 : n.values) || void 0 === r ? void 0 : r.map((e2) => __PRIVATE_normalizeNumber(e2.doubleValue));
      return new VectorValue(i);
    }
    convertGeoPoint(e) {
      return new GeoPoint(__PRIVATE_normalizeNumber(e.latitude), __PRIVATE_normalizeNumber(e.longitude));
    }
    convertArray(e, t) {
      return (e.values || []).map((e2) => this.convertValue(e2, t));
    }
    convertServerTimestamp(e, t) {
      switch (t) {
        case "previous":
          const n = __PRIVATE_getPreviousValue(e);
          return null == n ? null : this.convertValue(n, t);
        case "estimate":
          return this.convertTimestamp(__PRIVATE_getLocalWriteTime(e));
        default:
          return null;
      }
    }
    convertTimestamp(e) {
      const t = __PRIVATE_normalizeTimestamp(e);
      return new Timestamp(t.seconds, t.nanos);
    }
    convertDocumentKey(e, t) {
      const n = ResourcePath.fromString(e);
      __PRIVATE_hardAssert(__PRIVATE_isValidResourceName(n));
      const r = new DatabaseId(n.get(1), n.get(3)), i = new DocumentKey(n.popFirst(5));
      return r.isEqual(t) || // TODO(b/64130202): Somehow support foreign references.
      __PRIVATE_logError(`Document ${i} contains a document reference within a different database (${r.projectId}/${r.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`), i;
    }
  };
  var SnapshotMetadata = class {
    /** @hideconstructor */
    constructor(e, t) {
      this.hasPendingWrites = e, this.fromCache = t;
    }
    /**
     * Returns true if this `SnapshotMetadata` is equal to the provided one.
     *
     * @param other - The `SnapshotMetadata` to compare against.
     * @returns true if this `SnapshotMetadata` is equal to the provided one.
     */
    isEqual(e) {
      return this.hasPendingWrites === e.hasPendingWrites && this.fromCache === e.fromCache;
    }
  };
  var DocumentSnapshot = class extends DocumentSnapshot$1 {
    /** @hideconstructor protected */
    constructor(e, t, n, r, i, s) {
      super(e, t, n, r, s), this._firestore = e, this._firestoreImpl = e, this.metadata = i;
    }
    /**
     * Returns whether or not the data exists. True if the document exists.
     */
    exists() {
      return super.exists();
    }
    /**
     * Retrieves all fields in the document as an `Object`. Returns `undefined` if
     * the document doesn't exist.
     *
     * By default, `serverTimestamp()` values that have not yet been
     * set to their final value will be returned as `null`. You can override
     * this by passing an options object.
     *
     * @param options - An options object to configure how data is retrieved from
     * the snapshot (for example the desired behavior for server timestamps that
     * have not yet been set to their final value).
     * @returns An `Object` containing all fields in the document or `undefined` if
     * the document doesn't exist.
     */
    data(e = {}) {
      if (this._document) {
        if (this._converter) {
          const t = new QueryDocumentSnapshot(
            this._firestore,
            this._userDataWriter,
            this._key,
            this._document,
            this.metadata,
            /* converter= */
            null
          );
          return this._converter.fromFirestore(t, e);
        }
        return this._userDataWriter.convertValue(this._document.data.value, e.serverTimestamps);
      }
    }
    /**
     * Retrieves the field specified by `fieldPath`. Returns `undefined` if the
     * document or field doesn't exist.
     *
     * By default, a `serverTimestamp()` that has not yet been set to
     * its final value will be returned as `null`. You can override this by
     * passing an options object.
     *
     * @param fieldPath - The path (for example 'foo' or 'foo.bar') to a specific
     * field.
     * @param options - An options object to configure how the field is retrieved
     * from the snapshot (for example the desired behavior for server timestamps
     * that have not yet been set to their final value).
     * @returns The data at the specified field location or undefined if no such
     * field exists in the document.
     */
    // We are using `any` here to avoid an explicit cast by our users.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(e, t = {}) {
      if (this._document) {
        const n = this._document.data.field(__PRIVATE_fieldPathFromArgument("DocumentSnapshot.get", e));
        if (null !== n) return this._userDataWriter.convertValue(n, t.serverTimestamps);
      }
    }
  };
  var QueryDocumentSnapshot = class extends DocumentSnapshot {
    /**
     * Retrieves all fields in the document as an `Object`.
     *
     * By default, `serverTimestamp()` values that have not yet been
     * set to their final value will be returned as `null`. You can override
     * this by passing an options object.
     *
     * @override
     * @param options - An options object to configure how data is retrieved from
     * the snapshot (for example the desired behavior for server timestamps that
     * have not yet been set to their final value).
     * @returns An `Object` containing all fields in the document.
     */
    data(e = {}) {
      return super.data(e);
    }
  };
  var QuerySnapshot = class {
    /** @hideconstructor */
    constructor(e, t, n, r) {
      this._firestore = e, this._userDataWriter = t, this._snapshot = r, this.metadata = new SnapshotMetadata(r.hasPendingWrites, r.fromCache), this.query = n;
    }
    /** An array of all the documents in the `QuerySnapshot`. */
    get docs() {
      const e = [];
      return this.forEach((t) => e.push(t)), e;
    }
    /** The number of documents in the `QuerySnapshot`. */
    get size() {
      return this._snapshot.docs.size;
    }
    /** True if there are no documents in the `QuerySnapshot`. */
    get empty() {
      return 0 === this.size;
    }
    /**
     * Enumerates all of the documents in the `QuerySnapshot`.
     *
     * @param callback - A callback to be called with a `QueryDocumentSnapshot` for
     * each document in the snapshot.
     * @param thisArg - The `this` binding for the callback.
     */
    forEach(e, t) {
      this._snapshot.docs.forEach((n) => {
        e.call(t, new QueryDocumentSnapshot(this._firestore, this._userDataWriter, n.key, n, new SnapshotMetadata(this._snapshot.mutatedKeys.has(n.key), this._snapshot.fromCache), this.query.converter));
      });
    }
    /**
     * Returns an array of the documents changes since the last snapshot. If this
     * is the first snapshot, all documents will be in the list as 'added'
     * changes.
     *
     * @param options - `SnapshotListenOptions` that control whether metadata-only
     * changes (i.e. only `DocumentSnapshot.metadata` changed) should trigger
     * snapshot events.
     */
    docChanges(e = {}) {
      const t = !!e.includeMetadataChanges;
      if (t && this._snapshot.excludesMetadataChanges) throw new FirestoreError(D.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
      return this._cachedChanges && this._cachedChangesIncludeMetadataChanges === t || (this._cachedChanges = /** Calculates the array of `DocumentChange`s for a given `ViewSnapshot`. */
      function __PRIVATE_changesFromSnapshot(e2, t2) {
        if (e2._snapshot.oldDocs.isEmpty()) {
          let t3 = 0;
          return e2._snapshot.docChanges.map((n) => {
            const r = new QueryDocumentSnapshot(e2._firestore, e2._userDataWriter, n.doc.key, n.doc, new SnapshotMetadata(e2._snapshot.mutatedKeys.has(n.doc.key), e2._snapshot.fromCache), e2.query.converter);
            return n.doc, {
              type: "added",
              doc: r,
              oldIndex: -1,
              newIndex: t3++
            };
          });
        }
        {
          let n = e2._snapshot.oldDocs;
          return e2._snapshot.docChanges.filter((e3) => t2 || 3 !== e3.type).map((t3) => {
            const r = new QueryDocumentSnapshot(e2._firestore, e2._userDataWriter, t3.doc.key, t3.doc, new SnapshotMetadata(e2._snapshot.mutatedKeys.has(t3.doc.key), e2._snapshot.fromCache), e2.query.converter);
            let i = -1, s = -1;
            return 0 !== t3.type && (i = n.indexOf(t3.doc.key), n = n.delete(t3.doc.key)), 1 !== t3.type && (n = n.add(t3.doc), s = n.indexOf(t3.doc.key)), {
              type: __PRIVATE_resultChangeType(t3.type),
              doc: r,
              oldIndex: i,
              newIndex: s
            };
          });
        }
      }(this, t), this._cachedChangesIncludeMetadataChanges = t), this._cachedChanges;
    }
  };
  function __PRIVATE_resultChangeType(e) {
    switch (e) {
      case 0:
        return "added";
      case 2:
      case 3:
        return "modified";
      case 1:
        return "removed";
      default:
        return fail();
    }
  }
  var __PRIVATE_ExpUserDataWriter = class extends AbstractUserDataWriter {
    constructor(e) {
      super(), this.firestore = e;
    }
    convertBytes(e) {
      return new Bytes(e);
    }
    convertReference(e) {
      const t = this.convertDocumentKey(e, this.firestore._databaseId);
      return new DocumentReference(
        this.firestore,
        /* converter= */
        null,
        t
      );
    }
  };
  function getDocs(e) {
    e = __PRIVATE_cast(e, Query);
    const t = __PRIVATE_cast(e.firestore, Firestore), n = ensureFirestoreConfigured(t), r = new __PRIVATE_ExpUserDataWriter(t);
    return __PRIVATE_validateHasExplicitOrderByForLimitToLast(e._query), __PRIVATE_firestoreClientGetDocumentsViaSnapshotListener(n, e._query).then((n2) => new QuerySnapshot(t, r, e, n2));
  }
  !function __PRIVATE_registerFirestore(e, t = true) {
    !function __PRIVATE_setSDKVersion(e2) {
      S = e2;
    }(SDK_VERSION), _registerComponent(new Component("firestore", (e2, { instanceIdentifier: n, options: r }) => {
      const i = e2.getProvider("app").getImmediate(), s = new Firestore(new __PRIVATE_FirebaseAuthCredentialsProvider(e2.getProvider("auth-internal")), new __PRIVATE_FirebaseAppCheckTokenProvider(e2.getProvider("app-check-internal")), function __PRIVATE_databaseIdFromApp(e3, t2) {
        if (!Object.prototype.hasOwnProperty.apply(e3.options, ["projectId"])) throw new FirestoreError(D.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
        return new DatabaseId(e3.options.projectId, t2);
      }(i, n), i);
      return r = Object.assign({
        useFetchStreams: t
      }, r), s._setSettings(r), s;
    }, "PUBLIC").setMultipleInstances(true)), registerVersion(w, "4.7.3", e), // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
    registerVersion(w, "4.7.3", "esm2017");
  }();

  // public/script.js
  var firebaseConfig = {
    apiKey: "AIzaSyDChyRMRZw13CIheI4_vd5bsrFLBprMC20",
    authDomain: "that-sky-calendar-ffd49.firebaseapp.com",
    projectId: "that-sky-calendar-ffd49",
    storageBucket: "that-sky-calendar-ffd49.appspot.com",
    messagingSenderId: "994867085966",
    appId: "1:994867085966:web:ea6d5b05bccb508eb73fdf",
    measurementId: "G-FXXSH6NS6Z"
  };
  var app = initializeApp(firebaseConfig);
  var analytics = getAnalytics(app);
  var db = getFirestore(app);
  var eventsContainer = document.getElementById("events-container");
  var eventsCollectionRef = collection(db, "events");
  getDocs(eventsCollectionRef).then((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const eventData = doc.data();
      const eventDiv = document.createElement("div");
      eventDiv.innerHTML = `
         <h2>${eventData.name}</h2>
         <p>Date: ${eventData.date}</p>
         <p>Location: ${eventData.location}</p>
       `;
      eventsContainer.appendChild(eventDiv);
    });
  }).catch((error) => {
    console.error("Error fetching events:", error);
    const eventsContainer2 = document.getElementById("events-container");
    eventsContainer2.innerHTML = "Error fetching events. Please try again later.";
  });
})();
/*! Bundled license information:

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/component/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/logger/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/installations/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/analytics/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/analytics/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/webchannel-wrapper/dist/bloom-blob/esm/bloom_blob_es2018.js:
  (** @license
  Copyright The Closure Library Authors.
  SPDX-License-Identifier: Apache-2.0
  *)
  (** @license
  
   Copyright The Closure Library Authors.
   SPDX-License-Identifier: Apache-2.0
  *)

@firebase/webchannel-wrapper/dist/webchannel-blob/esm/webchannel_blob_es2018.js:
  (** @license
  Copyright The Closure Library Authors.
  SPDX-License-Identifier: Apache-2.0
  *)
  (** @license
  
   Copyright The Closure Library Authors.
   SPDX-License-Identifier: Apache-2.0
  *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
  * @license
  * Copyright 2020 Google LLC
  *
  * Licensed under the Apache License, Version 2.0 (the "License");
  * you may not use this file except in compliance with the License.
  * You may obtain a copy of the License at
  *
  *   http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
  *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
//# sourceMappingURL=script.js.map
