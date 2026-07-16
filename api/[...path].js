export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/+$/, "");

  if (!apiBaseUrl) {
    res.status(500).json({ message: "API_BASE_URL is not configured." });
    return;
  }

  const path = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  const targetUrl = new URL(`/api/${path ?? ""}${requestUrl.search}`, apiBaseUrl);
  const headers = getForwardHeaders(req.headers);
  const body = hasRequestBody(req.method) ? await readRequestBody(req) : undefined;

  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: "manual"
  });

  res.status(upstreamResponse.status);
  setResponseHeaders(res, upstreamResponse.headers);

  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
  res.send(responseBody);
}

function getForwardHeaders(requestHeaders) {
  const headers = new Headers();
  const skippedHeaders = new Set(["connection", "content-length", "host"]);

  for (const [name, value] of Object.entries(requestHeaders)) {
    if (skippedHeaders.has(name.toLowerCase()) || value === undefined) {
      continue;
    }

    headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
  }

  return headers;
}

function setResponseHeaders(res, responseHeaders) {
  const setCookies = responseHeaders.getSetCookie?.() ?? [];

  responseHeaders.forEach((value, name) => {
    if (name.toLowerCase() !== "set-cookie") {
      res.setHeader(name, value);
    }
  });

  if (setCookies.length > 0) {
    res.setHeader("set-cookie", setCookies);
    return;
  }

  const setCookie = responseHeaders.get("set-cookie");

  if (setCookie) {
    res.setHeader("set-cookie", setCookie);
  }
}

function hasRequestBody(method) {
  return method !== "GET" && method !== "HEAD";
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
