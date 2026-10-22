export default async function handler(req, res) {
  try {
    const urls = [
      "https://royal-bird-6a0a.poonamchouhan076.workers.dev/",
      "https://raw.githubusercontent.com/Prtstream820894/Liv/refs/heads/main/new_sony.m3u"
    ];

    const timestamp = Date.now();

    // ⚡ Dono link se sidha raw text format me playlist fetch karenge
    const responses = await Promise.all(
      urls.map(url => {
        const freshUrl = url.includes('?') ? `${url}&_t=${timestamp}` : `${url}?_t=${timestamp}`;
        
        return fetch(freshUrl, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
          .then(r => (r.ok ? r.text() : ""))
          .catch(() => ""); // Agar koi ek down ho toh khali string return karega
      })
    );

    // 🎯 Har playlist se #EXTM3U tag ko saaf karenge taaki beech me repeat na ho
    const cleanPlaylists = responses.map(text => {
      return text.replace("#EXTM3U", "").trim();
    });

    // 🔗 Sabko ek sath jodenge aur main #EXTM3U tag sirf ek baar sabse upar lagayenge
    const finalPlaylist = "#EXTM3U\n" + cleanPlaylists.filter(Boolean).join("\n");

    // 🚀 Strong Cache Bypass Headers taaki instantly naya channel dikhe
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("CDN-Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    
    res.status(200).send(finalPlaylist);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
