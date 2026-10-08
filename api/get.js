export default async function handler(req, res) {
  let current_cookie = "hdntl=exp=1791589859~acl=%2f*~id=c75d722924652d3001fcea018d088bcf~data=hdntl~hmac=c40ae2f4d0764e1a62e67f6c15ac41ac8bd421e53c32749eb785c5be38cad979"; // Jab bhi pre-configured rakhni ho yahan daal dena

  if (current_cookie && current_cookie.trim() !== "") {
    return res.status(200).send(`
      <h3>🍪 Pre-configured Cookie (Top Priority):</h3>
      ${current_cookie}
    `);
  }

  const fallback_url = "https://serv.vodep39240327.workers.dev/channel/raw?=m3u";
  const default_fallback_cookie = "hdntl=exp=1785499260~acl=%2f*~id=f4259cda851c7a4eaf1a3a64027227b0~data=hdntl~hmac=75637db8b9691f231d00d9095e1c7961ed59c3fc371020edcc7fe373c7b5ba08";

  let extracted_cookie = null;
  let source_label = "Live Extracted Cookie";

  // Step 1 & Step 2: Seedha Firebase REST se cookie ya link uthao (Direct Denver URL hit hata diya hai)
  try {
    const fbRes = await fetch("https://ipl2020-46d2f.firebaseio.com/Denver.json");
    const denverData = await fbRes.json();

    if (denverData) {
      // Agar direct stored cookie milti hai jo 'xyz' nahi hai
      if (denverData.cookie && denverData.cookie !== "xyz") {
        extracted_cookie = denverData.cookie;
        source_label = "Firebase Stored Cookie";
      } 
      // Nahi toh Firebase me diye gaye 'Link' se fetch karo (Ye sirf tabhi hoga jab tera background app code ya koi ek authorized process karega)
      else if (denverData.Link) {
        const fbResponse = await fetch(denverData.Link, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "*/*"
          }
        });
        const fbText = await fbResponse.text();
        const fbLines = fbText.split("\n");
        for (let line of fbLines) {
          if (line.includes("jcevent") || line.includes("Cookie=")) {
            let match = line.match(/Cookie=([^&]+)/);
            if (match) {
              extracted_cookie = match[1].trim();
              break;
            } else if (line.includes("?")) {
              extracted_cookie = line.substring(line.indexOf("?") + 1).trim();
              break;
            }
          }
        }
        if (extracted_cookie) source_label = "Firebase Link Extracted Cookie";
      }
    }
  } catch (fbErr) {
    console.log("Firebase REST fetch failed:", fbErr.message);
  }

  // Step 3: Purana worker fallback agar Firebase me na mile
  if (!extracted_cookie) {
    try {
      const response = await fetch(fallback_url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "*/*"
        }
      });

      const text = await response.text();
      const lines = text.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("JC_ColorsHD.m3u8")) {
          const extinf = lines[i - 1] || "";
          const match = extinf.match(/"Cookie":"([^"]+)"/);
          if (match) {
            extracted_cookie = match[1];
            source_label = "Worker Fallback Cookie";
          }
          break;
        }
      }
    } catch (err) {
      console.log("Fallback server also failed.");
    }
  }

  const final_cookie = extracted_cookie || default_fallback_cookie;
  if (!extracted_cookie) source_label = "Default Cookie (Fallback)";

  res.status(200).send(`
    <h3>🍪 ${source_label}:</h3>
    ${final_cookie}
  `);
}
