import { socket } from '../socket-client.js';

export function initTriviaLogic() {
  const triviaSearchInput = document.getElementById('triviaSearchInput');
  const searchTriviaBtn = document.getElementById('searchTriviaBtn');
  const triviaPreviewArea = document.getElementById('triviaPreviewArea');
  const triviaPreviewImg = document.getElementById('triviaPreviewImg');
  const triviaPreviewTitle = document.getElementById('triviaPreviewTitle');
  const triviaPreviewText = document.getElementById('triviaPreviewText');
  const broadcastTriviaBtn = document.getElementById('broadcastTriviaBtn');

  let currentTriviaPayload = null;

  if (searchTriviaBtn) {
    searchTriviaBtn.addEventListener('click', async () => {
      const query = triviaSearchInput.value.trim();
      if (!query) return;

      searchTriviaBtn.innerText = "Searching...";
      try {
        const engine = localStorage.getItem('cinemaTriviaEngine') || 'tmdb';
        if (engine === 'tmdb') {
          const apiKey = localStorage.getItem('cinemaTmdbApiKey');
          if (!apiKey) {
            alert("Please enter your TMDB API Key in the Theater Settings first!");
            searchTriviaBtn.innerText = "Search";
            return;
          }

          const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`);
          if (!searchRes.ok) throw new Error("TMDB API Error. Check your API key.");
          const data = await searchRes.json();
          if (!data.results || data.results.length === 0) throw new Error("Not found");

          const topResult = data.results[0];
          let title = topResult.title || topResult.name || "Unknown";
          
          let deepData = topResult;
          let factsHtml = "";

          if (topResult.media_type === 'movie') {
            const detailRes = await fetch(`https://api.themoviedb.org/3/movie/${topResult.id}?api_key=${apiKey}&append_to_response=credits`);
            if (detailRes.ok) deepData = await detailRes.json();
            
            if (deepData.release_date) title += ` (${deepData.release_date.split('-')[0]})`;
            
            if (deepData.tagline) factsHtml += `<div style="font-style: italic; color: #fbbf24; margin-bottom: 8px;">"${deepData.tagline}"</div>`;
            factsHtml += `<div style="margin-bottom: 8px;">${deepData.overview || "No description available."}</div>`;
            
            if (deepData.budget > 0) factsHtml += `<div><strong>Budget:</strong> $${(deepData.budget / 1000000).toFixed(1)}M</div>`;
            if (deepData.revenue > 0) factsHtml += `<div><strong>Box Office:</strong> $${(deepData.revenue / 1000000).toFixed(1)}M</div>`;
            
            if (deepData.credits && deepData.credits.cast) {
              const topCast = deepData.credits.cast.slice(0, 3).map(c => c.name).join(', ');
              if (topCast) factsHtml += `<div style="margin-top: 8px; color: #cbd5e1;"><strong>Starring:</strong> ${topCast}</div>`;
            }

          } else if (topResult.media_type === 'tv') {
            const detailRes = await fetch(`https://api.themoviedb.org/3/tv/${topResult.id}?api_key=${apiKey}&append_to_response=credits`);
            if (detailRes.ok) deepData = await detailRes.json();
            
            if (deepData.first_air_date) title += ` (${deepData.first_air_date.split('-')[0]})`;
            
            if (deepData.tagline) factsHtml += `<div style="font-style: italic; color: #fbbf24; margin-bottom: 8px;">"${deepData.tagline}"</div>`;
            factsHtml += `<div style="margin-bottom: 8px;">${deepData.overview || "No description available."}</div>`;
            
            factsHtml += `<div><strong>Status:</strong> ${deepData.status || 'N/A'}</div>`;
            factsHtml += `<div><strong>Seasons:</strong> ${deepData.number_of_seasons || 'N/A'}</div>`;
            
            if (deepData.credits && deepData.credits.cast) {
              const topCast = deepData.credits.cast.slice(0, 3).map(c => c.name).join(', ');
              if (topCast) factsHtml += `<div style="margin-top: 8px; color: #cbd5e1;"><strong>Starring:</strong> ${topCast}</div>`;
            }
          } else if (topResult.media_type === 'person') {
            const detailRes = await fetch(`https://api.themoviedb.org/3/person/${topResult.id}?api_key=${apiKey}`);
            if (detailRes.ok) deepData = await detailRes.json();
            
            factsHtml += `<div style="margin-bottom: 8px;"><strong>Known For:</strong> ${deepData.known_for_department}</div>`;
            if (deepData.birthday) factsHtml += `<div><strong>Born:</strong> ${deepData.birthday}</div>`;
            if (deepData.place_of_birth) factsHtml += `<div><strong>Place of Birth:</strong> ${deepData.place_of_birth}</div>`;
            
            if (topResult.known_for) {
              const popularWorks = topResult.known_for.map(k => k.title || k.name).join(', ');
              factsHtml += `<div style="margin-top: 8px; color: #cbd5e1;"><strong>Popular Works:</strong> ${popularWorks}</div>`;
            }
          }

          let imageUrl = null;
          if (deepData.poster_path) imageUrl = `https://image.tmdb.org/t/p/w500${deepData.poster_path}`;
          else if (deepData.profile_path) imageUrl = `https://image.tmdb.org/t/p/w500${deepData.profile_path}`;

          currentTriviaPayload = { title, factsHtml, imageUrl };
        } else if (engine === 'ai') {
          const apiKey = localStorage.getItem('cinemaAiApiKey');
          if (!apiKey) {
            alert("Please enter your Gemini API Key in Settings first!");
            searchTriviaBtn.disabled = false;
            searchTriviaBtn.innerText = "Search";
            return;
          }

          const prompt = `You are an energetic cinema trivia host. Give me ONE short, mind-blowing trivia fact about: '${query}'. 
CRITICAL RULES:
1. MAXIMUM 3 sentences. KEEP IT EXTREMELY SHORT AND PUNCHY.
2. NO boring introductions (like "Ladies and gentlemen..."). Jump STRAIGHT into the fact!
3. Format the text using HTML <strong> to highlight key details.
4. Do NOT use markdown codeblocks. Return only raw HTML.`;

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          if (!res.ok) throw new Error("Gemini API Error. Check your API key or quota.");
          const data = await res.json();
          
          let aiText = data.candidates[0].content.parts[0].text;
          aiText = aiText.replace(/^```html\n/g, '').replace(/```$/g, '');

          currentTriviaPayload = { 
            title: `AI Fact: ${query}`, 
            factsHtml: aiText, 
            imageUrl: null 
          };
        }

        triviaPreviewTitle.innerText = currentTriviaPayload.title;
        triviaPreviewText.innerHTML = currentTriviaPayload.factsHtml;
        
        if (currentTriviaPayload.imageUrl) {
          triviaPreviewImg.src = currentTriviaPayload.imageUrl;
          triviaPreviewImg.style.display = 'block';
        } else {
          triviaPreviewImg.style.display = 'none';
        }

        triviaPreviewArea.style.display = 'flex';
        triviaPreviewArea.style.flexDirection = 'column';
        searchTriviaBtn.innerText = "Search";
      } catch (err) {
        searchTriviaBtn.innerText = "Not Found";
        setTimeout(() => searchTriviaBtn.innerText = "Search", 2000);
        triviaPreviewArea.style.display = 'none';
      }
    });

    triviaSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchTriviaBtn.click();
    });

    broadcastTriviaBtn.addEventListener('click', () => {
      if (currentTriviaPayload) {
        socket.emit('broadcast-trivia', currentTriviaPayload);
        broadcastTriviaBtn.innerText = "Broadcasted!";
        broadcastTriviaBtn.style.background = "#4ade80";
        setTimeout(() => {
          broadcastTriviaBtn.innerText = "Broadcast Fact to Room";
          broadcastTriviaBtn.style.background = "#e50914";
        }, 2000);
      }
    });
  }
}
