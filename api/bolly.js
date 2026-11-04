const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const query = req.query.movies || req.query.q;
    
    if (!query) {
        return res.status(400).json({ 
            success: false, 
            error: "Bhai, movie ka naam daal! Example: /api/bolly?movies=dil" 
        });
    }

    const searchUrl = `https://bollyflix.church/search/${encodeURIComponent(query)}`;

    try {
        const { data: searchHtml } = await axios.get(searchUrl, {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const $ = cheerio.load(searchHtml);
        let moviesList = [];

        $('.latestPost').each((i, element) => {
            const titleElement = $(element).find('.title a');
            const movieTitle = titleElement.text();
            const postUrl = titleElement.attr('href');
            const imgUrl = $(element).find('img').attr('src');

            if (postUrl && movieTitle) {
                moviesList.push({ title: movieTitle, postUrl, imgUrl });
            }
        });

        let results = [];

        // Timeout se bachne ke liye sirf top 2 movies rakhi hain
        for (let movie of moviesList.slice(0, 2)) {
            try {
                const { data: postHtml } = await axios.get(movie.postUrl, {
                    timeout: 4000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                const $$ = cheerio.load(postHtml);

                let targetLink = null;
                let selectedQuality = '1080p';

                $$('a.dl').each((i, el) => {
                    const btnText = $$(el).closest('p').prev('h5').text() || $$(el).text() || '';
                    const href = $$(el).attr('href');

                    if (href && (href.includes('fastdlserver.site') || href.includes('gdflix'))) {
                        if (btnText.includes('1080p') || btnText.includes('720p')) {
                            targetLink = href;
                            if (btnText.includes('720p')) selectedQuality = '720p';
                            return false; // mil gaya toh break karo
                        }
                    }
                });

                if (targetLink) {
                    let finalLink = targetLink;

                    try {
                        const redirectRes = await axios.get(targetLink, {
                            timeout: 4000,
                            maxRedirects: 5,
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                        });
                        
                        let gdflixUrl = redirectRes.request?.res?.responseUrl || redirectRes.config?.url;

                        if (gdflixUrl && gdflixUrl.includes('/file/')) {
                            let cloudUrl = gdflixUrl.replace('/file/', '/cloud/');
                            const { data: cloudHtml } = await axios.get(cloudUrl, {
                                timeout: 4000,
                                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                            });
                            const $$$ = cheerio.load(cloudHtml);

                            $$$('a').each((j, linkEl) => {
                                const lHref = $$$(linkEl).attr('href');
                                if (lHref && lHref.includes('workers.dev')) {
                                    finalLink = lHref;
                                    return false;
                                }
                            });
                        }
                    } catch (e) {
                        // Agar redirect ya cloud fail ho toh original link use karo
                    }

                    results.push({
                        title: movie.title,
                        quality: selectedQuality,
                        image: movie.imgUrl,
                        downloadLink: finalLink
                    });
                }
            } catch (err) {
                // Skip invalid posts
            }
        }

        if (req.query.format === 'm3u') {
            let m3uContent = '#EXTM3U\n';
            results.forEach((m) => {
                m3uContent += `#EXTINF:-1 tvg-logo="${m.image}" group-title="BollyFlix",${m.title} [${m.quality}]\n`;
                m3uContent += `${m.downloadLink}\n`;
            });
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.send(m3uContent);
        }

        return res.json({
            success: true,
            query: query,
            totalFound: results.length,
            movies: results
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
