window.IKODI_CONFIG = Object.freeze({ apiBaseUrl: window.location.protocol === "file:" ? "http://localhost:4000" : "", ...(window.IKODI_CONFIG || {}) });
