const axios = require('axios');
const cheerio =: require('cheerio'); // wait, cheerio import standard

const express = require('express'); // Vercel handles standard exports
// Lekin hum standard Vercel module format use karenge:

module.exports = async (req, res) => {
    const query = req.query.movies || req.query.q;
    
    if (!query) {
        return res.status(400).json({ 
            success: false, 
            error: "Bhai, movie ka naam daal! Example: /api/bolly?movies=dil+chahata+hai" 
        });
    }

    const searchUrl = `https://bollyflix.church/search/${encodeURIComponent(query)}`;

    try {
        // Step 1: Search page request
        const { data: searchHtml } = await axios.get(searchUrl, {
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

        // Step 2: Loop through posts to find 1080p/720p
        for (let movie of moviesList.slice(0, 3)) { // Top 3 for speed
            try {
                const { data: postHtml } = await axios.get(movie.postUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                const $$ = cheerio.load(postHtml);

                let targetLink = null;
                let selectedQuality = '';

                // Look for 1080p or 720p dl link
                $$('a.dl').each((i, el) => {
                    const btnText = $$($(el)).closest('p').prev('h5').text() || $$(el).text();
                    const href = $$(el).attr('href');

                    if (href && (btnText.includes('1080p') || btnText.includes('720p'))) {
                        targetLink = href;
                        selectedQuality = btnText.includes('1080p') ? '1080p' : '720p';
                        return false; 
                    }
                });

                if (targetLink) {
                    let finalDirectLink = targetLink;

                    // Step 3: Convert gdflix / fastdlserver to /cloud/ and get workers.dev link
                    if (targetLink.includes('gdflix') || targetLink.includes('fastdlserver')) {
                        try {
                            // URL conversion logic (/file/ to /cloud/)
                            let cloudPageUrl = targetLink.replace('/file/', '/cloud/');
                            
                            const { data: cloudHtml } = await axios.get(cloudPageUrl, {
                                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                            });
                            
                            const $$$ = cheerio.load(cloudHtml);
                            
                            // Extracting the final workers.dev cloud resume download link
                            let workersLink = null;
                            $$$('a').each((j, linkEl) => {
                                const lHref = $$$(linkEl).attr('href');
                                if (lHref && lHref.includes('workers.dev')) {
                                    workersLink = lHref;
                                    return false;
                                }
                            });

                            if (workersLink) {
                                finalDirectLink = workersLink;
                            }
                        } catch (cloudErr) {
                            console.error("Cloud link extraction failed, falling back to original link");
                        }
                    }

                    results.push({
                        title: movie.title,
                        quality: selectedQuality,
                        image: movie.imgUrl,
                        downloadLink: finalDirectLink
                    });
                }
            } catch (err) {
                console.error(`Error fetching post: ${movie.postUrl}`);
            }
        }

        // Step 4: Output format (M3U or JSON)
        if (req.query.format === 'm3u') {
            let m3uContent = '#EXTM3U\n';
            results.forEach((m) => {
                m3uContent += `#EXTINF:-1 tvg-logo="${m.image}" group-title="BollyFlix Direct",${m.title} [${m.quality}]\n`;
                m3uContent += `${m.downloadLink}\n`;
            });
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.send(m3uContent);
        }

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
