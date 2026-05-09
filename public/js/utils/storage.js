function safeParseStoredJson(rawValue, fallbackValue = null) {
  if (rawValue == null || rawValue === "") return fallbackValue;
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn("Invalid stored JSON ignored:", error);
    return fallbackValue;
  }
}
