import {
  Image,
  GIF,
  Frame,
} from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { makeSeededGenerators } from "https://deno.land/x/vegas@v1.3.0/mod.ts";

function listImages(path: string) {
  try {
    return Array.from(Deno.readDirSync(path))
      .filter((file) => !file.isDirectory)
      .map((file) => {
        return path + "/" + file.name;
      });
  } catch (_e) {
    return [];
  }
}

const DIR = Deno.env.get("DIR") || "placecage";
const images = listImages(`./images/source/${DIR}`);
const gifs = listImages(`./images/source/${DIR}/gifs`);
const crazies = listImages(`./images/source/${DIR}/crazy`);

async function handler(request: Request): Promise<Response> {
  const { pathname: path, origin } = new URL(request.url);

  console.log(path);

  if (path == "/") {
    const index = Deno.readTextFileSync(`./public/${DIR}/index.html`);
    return new Response(index.replaceAll("{{DOMAIN}}", origin), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (path === "/robots.txt") {
    return new Response("User-agent: *\nDisallow: /", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (path == "/content/global.css") {
    const css = Deno.readTextFileSync("./public/content/global.css");
    return new Response(css, {
      status: 200,
      headers: { "Content-Type": "text/css" },
    });
  }

  if (path == "/favicon.ico") {
    return handler(new Request(origin + "/42/42"));
  }

  let [_, m, width, height] = path.split("/");

  if (!height) {
    height = width;
    width = m;
  }

  const vegas = makeSeededGenerators(`${m}${height}${width}`);

  const list = m === "gif" ? gifs : m === "c" ? crazies : images;

  const file = vegas.randomPick(list);
  const src = await Deno.readFile(file);

  const tool = m === "gif" ? GIF : Image;

  let img = await tool.decode(src);

  if ("cover" in img) {
    img.cover(parseInt(width), parseInt(height));
  } else {
    const frames = [...img].map((frame) =>
      Frame.from(frame.cover(parseInt(width), parseInt(height)), frame.duration)
    );
    img = new GIF(frames);
  }

  if (m === "g" && "saturation" in img) {
    img.saturation(0);
  }

  const data = await img.encode();

  console.log({ path, file, params: { m, height, width } });

  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": m === "gif" ? "image/gif" : "image/png",
      "Cache-Control": "public, max-age=604800",
      "Content-Disposition": `inline; filename="${file.split("/").pop()}"`,
    },
  });
}

const port = 8080;
console.log(`HTTP server running. Access it at: http://localhost:${port}/`);
Deno.serve({ port }, handler);
