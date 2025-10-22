
TMDB TV-Optimized Search
------------------------

What changed
- Centered, large search bar (Google-like)
- Results shown as a vertical list (one item per row)
- Title, rating, and a 2-line overview always visible (clamped to 2 lines)
- Smooth focus animations and scroll-into-view for TV remotes
- Configurable WEBVIEW_URL in config.js: replace {id} with the movie/show id
  Example: window.WEBVIEW_URL = "https://example.com/player/{id}"

Keyboard / Remote controls
- ArrowUp / ArrowDown: move focus between search, results, and back
- Enter: activate focused item (search/select/back)
- Selected ID saved in window.selectedMovieId

Notes
- The iframe may be blocked by some sites (X-Frame-Options / CSP). If blank, try opening the URL directly.
- Replace the API key in config.js with your own if needed.
