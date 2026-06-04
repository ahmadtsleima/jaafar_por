export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /api/admin/photos -> store uploaded file in R2 and return URL
    if (request.method === "POST" && url.pathname === "/api/admin/photos") {
      try {
        const form = await request.formData();
        const file = form.get("file");
        if (!file) {
          return new Response(JSON.stringify({ error: "missing file" }), { status: 400, headers: { "content-type": "application/json" } });
        }

        const filename = file.name || "upload";
        const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
        const key = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

        await env.R2_BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" },
        });

        const origin = `${url.protocol}//${url.host}`;
        const fileUrl = `${origin}/r2/${key}`;

        return new Response(JSON.stringify({ key, url: fileUrl }), { status: 200, headers: { "content-type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "content-type": "application/json" } });
      }
    }

    // GET /r2/:key -> stream object from R2
    if (request.method === "GET" && url.pathname.startsWith("/r2/")) {
      const key = decodeURIComponent(url.pathname.replace("/r2/", ""));
      const obj = await env.R2_BUCKET.get(key);
      if (!obj) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      if (obj.httpMetadata && obj.httpMetadata.contentType) headers.set("content-type", obj.httpMetadata.contentType);
      if (obj.size) headers.set("content-length", String(obj.size));
      return new Response(obj.body, { status: 200, headers });
    }

    return new Response("Not found", { status: 404 });
  }
};
