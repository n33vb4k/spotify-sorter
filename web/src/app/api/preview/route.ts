/**
 * Finds a song's 30-second preview on Deezer. Deezer's search API doesn't allow browser requests (no CORS),
 * so this tiny proxy does the lookup; the MP3 itself is fetched by the browser directly (its CDN allows it).
 * Stateless, stores nothing, logs nothing.
 */
const clean = (s: string) => s.split(" - ")[0].split(" (feat")[0].split(" (with")[0].split(" [")[0].trim();

interface DeezerHit {
  id: number;
  title: string;
  preview?: string;
  duration?: number;
  artist: { name: string };
  album?: { cover_small?: string; cover_medium?: string };
}

async function search(q: string): Promise<DeezerHit[]> {
  const res = await fetch(`https://api.deezer.com/search?limit=10&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Deezer ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message ?? "Deezer error");
  return body.data ?? [];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const artists = (searchParams.get("artists") ?? "").split("|").map((a) => a.trim()).filter(Boolean).slice(0, 6);
  const title = clean(searchParams.get("title") ?? "").slice(0, 200);
  if (!artists.length || !title) return Response.json({ error: "artists and title are required" }, { status: 400 });

  try {
    let hits = await search(`artist:"${artists[0]}" track:"${title}"`);
    if (!hits.length) hits = await search(`${artists[0]} ${title}`);
    const lower = artists.map((a) => a.toLowerCase());
    const withPreview = hits.filter((h) => h.preview);
    const best =
      withPreview.find((h) => lower.includes(h.artist.name.toLowerCase())) ??
      withPreview.find((h) => lower.some((a) => h.artist.name.toLowerCase().includes(a) || h.title.toLowerCase().includes(a)));
    if (!best) return Response.json({ preview: null }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    return Response.json(
      { preview: best.preview, deezerId: best.id, cover: best.album?.cover_medium ?? null },
      // Preview URLs are signed and expire, so only cache briefly.
      { headers: { "Cache-Control": "public, s-maxage=600" } },
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
