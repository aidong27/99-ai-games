import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { assertSubpath } from "./common.mjs";

const MIME = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".wav", "audio/wav"],
  [".webmanifest", "application/manifest+json; charset=utf-8"]
]);

export async function startStaticServer(options) {
  const root = path.resolve(options.root);
  const host = options.host ?? "127.0.0.1";
  const requestedPort = Number(options.port ?? 0);
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? host}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) {
        pathname += "index.html";
      }
      const filePath = path.resolve(root, `.${pathname}`);
      assertSubpath(root, filePath, "request path");
      const info = await stat(filePath);
      if (!info.isFile()) {
        throw Object.assign(new Error("Not found"), { code: "ENOENT" });
      }
      const body = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": MIME.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "Cross-Origin-Resource-Policy": "same-origin",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(body);
    } catch (error) {
      const statusCode = error.code === "ENOENT" ? 404 : 400;
      response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(statusCode === 404 ? "Not found" : "Bad request");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(requestedPort, host, resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : requestedPort;
  return {
    server,
    root,
    host,
    port,
    origin: `http://${host}:${port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}
