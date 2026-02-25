export const getCookieValue = (cookieHeader, cookieName) => {
  if (!cookieHeader || typeof cookieHeader !== "string" || !cookieName) {
    return null;
  }

  const parts = cookieHeader.split(";").map(item => item.trim());
  const targetPrefix = `${cookieName}=`;

  const found = parts.find(part => part.startsWith(targetPrefix));
  if (!found) {
    return null;
  }

  const rawValue = found.slice(targetPrefix.length);
  if (!rawValue) {
    return null;
  }

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
};
