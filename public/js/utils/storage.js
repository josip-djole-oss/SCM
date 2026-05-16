function safeParseStoredJson(rawValue, fallbackValue = null) {
  if (rawValue == null || rawValue === "") return fallbackValue;
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn("Invalid stored JSON ignored:", error);
    return fallbackValue;
  }
}

(function attachPerformanceAndStorageHelpers(global) {
  const storageValueCache = new Map();
  const jsonParseCache = new Map();
  const frameQueue = new Map();
  const perfSamples = [];
  const perfCounters = Object.create(null);
  const isPerfDebugEnabled = () =>
    global.sessionStorage?.getItem("cmax_perf_debug") === "true" ||
    global.localStorage?.getItem("cmax_perf_debug") === "true";

  function getCachedStorageValue(key, fallbackValue = null) {
    if (!key) return fallbackValue;
    if (storageValueCache.has(key)) {
      const cached = storageValueCache.get(key);
      return cached == null ? fallbackValue : cached;
    }
    const value = global.localStorage.getItem(key);
    storageValueCache.set(key, value);
    return value == null ? fallbackValue : value;
  }

  function setCachedStorageValue(key, value) {
    if (!key) return false;
    const nextValue = value == null ? null : String(value);
    const prevValue = storageValueCache.has(key)
      ? storageValueCache.get(key)
      : global.localStorage.getItem(key);
    if (prevValue === nextValue) return false;
    if (nextValue == null) {
      global.localStorage.removeItem(key);
      storageValueCache.delete(key);
      jsonParseCache.delete(key);
      return true;
    }
    global.localStorage.setItem(key, nextValue);
    storageValueCache.set(key, nextValue);
    jsonParseCache.delete(key);
    return true;
  }

  function removeCachedStorageValue(key) {
    if (!key) return false;
    const existed = storageValueCache.has(key) || global.localStorage.getItem(key) != null;
    global.localStorage.removeItem(key);
    storageValueCache.delete(key);
    jsonParseCache.delete(key);
    return existed;
  }

  function getCachedStorageJson(key, fallbackValue = null) {
    const rawValue = getCachedStorageValue(key, null);
    if (rawValue == null || rawValue === "") return fallbackValue;
    const cached = jsonParseCache.get(key);
    if (cached && cached.raw === rawValue) {
      return cached.value;
    }
    const parsed = safeParseStoredJson(rawValue, fallbackValue);
    jsonParseCache.set(key, { raw: rawValue, value: parsed });
    return parsed;
  }

  function setCachedStorageJson(key, value) {
    return setCachedStorageValue(key, JSON.stringify(value));
  }

  function clearCachedStorageSnapshot() {
    storageValueCache.clear();
    jsonParseCache.clear();
  }

  function debounce(fn, wait = 200) {
    let timer = null;
    return function debounced(...args) {
      const scope = this;
      global.clearTimeout(timer);
      timer = global.setTimeout(() => {
        timer = null;
        fn.apply(scope, args);
      }, Math.max(0, Number(wait) || 0));
    };
  }

  function throttle(fn, wait = 120) {
    let lastRun = 0;
    let timer = null;
    let trailingArgs = null;
    let trailingScope = null;

    return function throttled(...args) {
      const now = Date.now();
      const remaining = Math.max(0, (Number(wait) || 0) - (now - lastRun));
      trailingArgs = args;
      trailingScope = this;
      if (!remaining) {
        if (timer) {
          global.clearTimeout(timer);
          timer = null;
        }
        lastRun = now;
        fn.apply(trailingScope, trailingArgs);
        trailingArgs = null;
        trailingScope = null;
        return;
      }
      if (timer) return;
      timer = global.setTimeout(() => {
        timer = null;
        lastRun = Date.now();
        fn.apply(trailingScope, trailingArgs || []);
        trailingArgs = null;
        trailingScope = null;
      }, remaining);
    };
  }

  function scheduleFrame(key, callback) {
    if (!key || typeof callback !== "function") return;
    if (frameQueue.has(key)) return;
    const raf = global.requestAnimationFrame || ((cb) => global.setTimeout(cb, 16));
    const handle = raf(() => {
      frameQueue.delete(key);
      callback();
    });
    frameQueue.set(key, handle);
  }

  function cancelScheduledFrame(key) {
    if (!frameQueue.has(key)) return;
    const handle = frameQueue.get(key);
    frameQueue.delete(key);
    const cancel = global.cancelAnimationFrame || global.clearTimeout;
    cancel(handle);
  }

  const perfApi = {
    enabled() {
      return isPerfDebugEnabled();
    },
    begin(label, metadata = {}) {
      return {
        label: String(label || "perf"),
        metadata,
        startedAt: global.performance?.now?.() || Date.now(),
      };
    },
    end(token, metadata = {}) {
      if (!token) return 0;
      const endedAt = global.performance?.now?.() || Date.now();
      const duration = Math.max(0, endedAt - (token.startedAt || endedAt));
      perfSamples.push({
        label: token.label,
        duration,
        metadata: { ...(token.metadata || {}), ...(metadata || {}) },
        endedAt: new Date().toISOString(),
      });
      if (perfSamples.length > 250) perfSamples.splice(0, perfSamples.length - 250);
      if (perfApi.enabled()) {
        console.info(`[perf] ${token.label}: ${duration.toFixed(1)}ms`, metadata);
      }
      return duration;
    },
    count(name, delta = 1) {
      const key = String(name || "counter");
      perfCounters[key] = (perfCounters[key] || 0) + Number(delta || 0);
      return perfCounters[key];
    },
    snapshot() {
      return {
        counters: { ...perfCounters },
        samples: perfSamples.slice(-50),
      };
    },
  };

  global.getCachedStorageValue = getCachedStorageValue;
  global.setCachedStorageValue = setCachedStorageValue;
  global.removeCachedStorageValue = removeCachedStorageValue;
  global.getCachedStorageJson = getCachedStorageJson;
  global.setCachedStorageJson = setCachedStorageJson;
  global.clearCachedStorageSnapshot = clearCachedStorageSnapshot;
  global.cmaxDebounce = debounce;
  global.cmaxThrottle = throttle;
  global.cmaxScheduleFrame = scheduleFrame;
  global.cmaxCancelScheduledFrame = cancelScheduledFrame;
  global.CMAX_PERF = global.CMAX_PERF || perfApi;

  global.addEventListener("storage", (event) => {
    if (!event?.key) return;
    storageValueCache.delete(event.key);
    jsonParseCache.delete(event.key);
  });
})(window);
