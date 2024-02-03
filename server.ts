import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

import { makeSeededGenerators } from "https://deno.land/x/vegas@v1.3.0/mod.ts";

const list = Array.from(Deno.readDirSync("./images/source/placecage"));

async function handler(request: Request): Promise<Response> {
  const { pathname: path, origin } = new URL(request.url);

  if (path == "/favicon.ico") {
    return handler(new Request(origin + "/42/42"));
  }

  const [_, height, width] = path.split("/");

  const vegas = makeSeededGenerators(`${height}${width}`);

  const file = vegas.randomPick(list);

  const src = await Deno.readFile("./images/source/placecage/" + file.name);

  const img = await Image.decode(src);

  img.cover(parseInt(width), parseInt(height));

  const data = await img.encode();

  return new Response(data, {
    status: 200,
    headers: { "Content-Type": "image/png" },
  });
}

const port = 8080;
console.log(`HTTP server running. Access it at: http://localhost:${port}/`);
Deno.serve({ port }, handler);
