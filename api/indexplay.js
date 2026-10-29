export default async function handler(req, res) {
  if (!("prtstream" in req.query)) {
    return res
      .status(403)
      .send(
        "❌ Access Denied ! Yah Link Sirf Prtstream App Me Chalenga Copy Karo Link Ko Or PrtStream Me jake Paste Karo"
      );
  }

  try {
    const url1 = "https://lucky-hat-6f1c.poonamchouhan076.workers.dev/";
    const url2 = "https://allmovieslist.poonamchouhan076.workers.dev/";
    const url3 = "https://raw.githubusercontent.com/Prtstream820894/Prtlive_stream/refs/heads/main/playlist.m3u"; // Nayi playlist add ki gayi hai 
    

    const url4 = "https://raw.githubusercontent.com/poonamchouhan828/xnxx/refs/heads/main/playlist.m3u"; // Nayi NCC playlist add k
  
    const url5 = "https://raw.githubusercontent.com/PRTSTREAM/PRTSTREAM.github.io/refs/heads/main/test.txt";

    const fetchWithTimeout = async (url, ms = 8000) => {
      if (!url) return "";

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);

      try {
        const isUrl3 = url === url3;

        const cacheBuster = isUrl3
          ? `?nocache=${Date.now()}&r=${Math.random()}`
          : `?t=${Date.now()}`;

        const response = await fetch(url + cacheBuster, {
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache, no-store, max-age=0",
            Pragma: "no-cache",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
          ...(isUrl3 && {
            cf: {
              cacheTtl: 0,
              cacheEverything: false,
            },
          }),
        });

        return await response.text();
      } catch (err) {
        console.error(`Fetch failed for ${url}:`, err.message);
        return "";
      } finally {
        clearTimeout(id);
      }
    };

    const responses = await Promise.all([
      fetchWithTimeout(url1, 20000),
      fetchWithTimeout(url2, 30000),
      fetchWithTimeout(url3, 20000),
      fetchWithTimeout(url4, 20000),
      fetchWithTimeout(url5, 20000),
      
    ]);

    if (!responses[0]) {
      return res.status(500).send("Main playlist failed");
    }

    let finalPlaylist = responses[0].trim();

    for (let i = 1; i < responses.length; i++) {
      const rawData = responses[i];

      if (rawData) {
        const cleaned = rawData
          .replace("#EXTM3U", "")
          .replace(/\r/g, "")
          .trim();

        if (cleaned) {
          finalPlaylist += "\n" + cleaned;
        }
      }
    }

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.status(200).send(finalPlaylist.trim());
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
}
