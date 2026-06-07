function normalizeMongoUri(raw) {
  if (!raw) return "";
  let uri = raw.trim();
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
  }
  return uri;
}

function parseMongoUri(uri) {
  if (!uri) {
    return { configured: false, user: null, host: null, database: null };
  }

  const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:([^:@/]+)(?::([^@]*))?@)?([^/?]+)(?:\/([^?]*))?/);
  if (!match) {
    return { configured: true, user: null, host: null, database: null, parseError: true };
  }

  return {
    configured: true,
    user: match[1] || null,
    host: match[3] || null,
    database: match[4] || null,
    hasPassword: Boolean(match[2]),
    passwordLength: match[2]?.length || 0,
  };
}

function getMongoConfigSummary() {
  const raw = process.env.MONGODB_URI;
  const normalized = normalizeMongoUri(raw);
  const parsed = parseMongoUri(normalized);

  return {
    ...parsed,
    uriLength: normalized.length,
    hadSurroundingQuotes: Boolean(
      raw &&
        raw.trim() !== raw ||
        (raw?.trim().startsWith('"') && raw?.trim().endsWith('"')) ||
        (raw?.trim().startsWith("'") && raw?.trim().endsWith("'"))
    ),
    onVercel: Boolean(process.env.VERCEL),
  };
}

module.exports = {
  normalizeMongoUri,
  parseMongoUri,
  getMongoConfigSummary,
};
