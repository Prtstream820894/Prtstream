const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // URL se dynamic movie name pakadna (jaise ?movies=avatar ya ?movies=spiderman)
    const query = req.query.movies || req.query.q;
    
    if (!query) {
        return res.status(400).json({ 
            success: false, 
            error: "Bhai, movie ka naam toh daal! Example: /api/search?movies=avatar" 
        });
    }

    const searchUrl = `https://bollyflix.church/search/${encodeURIComponent(query)}`;

    try {
        // Step 1: Dynamic search URL par request bhejo
        const { data: searchHtml } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const $ = cheerio.load(searchHtml);
        let moviesList = [];

        // Step 2: Sabhi search results/articles ko grab karo
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

        // Step 3: Har movie ke post page par jao aur quality (1080p/720p) link dhundo
        for (let movie of moviesList.slice(0, 5)) { // Fast response ke liye top 5
            try {
                const { data: postHtml } = await axios.get(movie.postUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                const $$ = cheerio.load(postHtml);

                let targetLink = null;
                let selectedQuality = '';

                // Step 4: 1080p ya 720p ka link extract karo
                $$('a.dl').each((i, el) => {
                    const btnText = $$(el).closest('p').prev('h5').text() || $$(el).text();
                    const href = $$(el).attr('href');

                    if (href && (btnText.includes('1080p') || btnText.includes('720p'))) {
                        targetLink = href;
                        selectedQuality = btnText.includes('1080p') ? '1080p' : '720p';
                        return false; // Break loop once found
                    }
                });

                if (targetLink) {
                    results.push({
                        title: movie.title,
                        quality: selectedQuality,
                        image: movie.imgUrl,
                        downloadLink: targetLink
                    });
                }
            } catch (err) {
                console.error(`Error fetching post: ${movie.postUrl}`);
            }
        }

        // Step 5: Agar format=m3u manga hai, toh M3U playlist format do, warna JSON
        if (req.query.format === 'm3u') {
            let m3uContent = '#EXTM3U\n';
            results.forEach((m) => {
                m3uContent += `#EXTINF:-1 tvg-logo="${m.image}" group-title="BollyFlix Search",${m.title} [${m.quality}]\n`;
                m3uContent += `${m.downloadLink}\n`;
            });
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.send(m3uContent);
        }

        // Default JSON response
        return res.json({
            success: true,
            searchQuery: query,
            totalFound: results.length,
            movies: results
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
