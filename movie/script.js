
(function(){
  const API_KEY = window.TMDB_API_KEY || "";
  const WEBVIEW_URL = window.WEBVIEW_URL || "https://www.themoviedb.org/movie/{id}";
  const IMG_BASE = "https://image.tmdb.org/t/p/w300";
  const resultsEl = document.getElementById("results");
  const searchBtn = document.getElementById("searchBtn");
  const queryInput = document.getElementById("query");
  const iframeArea = document.getElementById("iframe-area");
  const mainArea = document.getElementById("main-area");
  const backBtn = document.getElementById("backBtn");
  const movieFrame = document.getElementById("movieFrame");

  let selectedMovieId = null;
  let cards = [];

  function shortText(s, n=140){
    if(!s) return "";
    return s.length > n ? s.slice(0,n) + "..." : s;
  }

  async function searchMovies(q){
    if(!API_KEY){
      alert("No TMDB API key found. Put your API key in config.js as window.TMDB_API_KEY.");
      return {results:[]};
    }
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(API_KEY)}&query=${encodeURIComponent(q)}&page=1`;
    const res = await fetch(url);
    if(!res.ok) {
      const txt = await res.text();
      throw new Error("TMDB search failed: " + res.status + " " + txt);
    }
    return res.json();
  }

  function renderResults(items){
    resultsEl.innerHTML = "";
    cards = [];
    if(!items || items.length===0){
      resultsEl.innerHTML = "<div style='opacity:0.8'>No results</div>";
      return;
    }
    items.forEach(it=>{
      // prefer movie or tv result types; if person, skip
      if(it.media_type && it.media_type === "person") return;
      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("role","listitem");
      card.tabIndex = 0;

      const img = document.createElement("img");
      img.className = "poster";
      img.alt = it.title || it.name || "poster";
      const posterPath = it.poster_path || it.profile_path;
      if(posterPath){
        img.src = IMG_BASE + posterPath;
      } else {
        img.src = "";
        img.style.background = "#041122";
      }

      const meta = document.createElement("div");
      meta.className = "meta";

      const titleRow = document.createElement("div");
      titleRow.className = "title-row";
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = it.title || it.name || "(no title)";
      const rating = document.createElement("div");
      rating.className = "rating";
      rating.textContent = (it.vote_average || it.popularity) ? String(it.vote_average || Math.round(it.popularity)) : "N/A";
      titleRow.appendChild(title);
      titleRow.appendChild(rating);

      const overview = document.createElement("div");
      overview.className = "overview";
      overview.textContent = shortText(it.overview || it.overview || it.overview || it.overview || it.overview || it.summary || "", 240);

      const selectBtn = document.createElement("button");
      selectBtn.className = "select-btn";
      selectBtn.textContent = "Select";
      selectBtn.onclick = ()=> selectItem(it);

      meta.appendChild(titleRow);
      meta.appendChild(overview);
      meta.appendChild(selectBtn);

      card.appendChild(img);
      card.appendChild(meta);

      resultsEl.appendChild(card);
      cards.push({card, item: it, selectBtn});
    });
    // focus first card after render
    focusIndex = 0;
    updateFocus();
    // add subtle fade animation
    resultsEl.style.opacity = 0;
    setTimeout(()=> resultsEl.style.opacity = 1, 40);
  }

  async function doSearch(){
    const q = queryInput.value.trim();
    if(!q) return;
    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";
    try{
      const data = await searchMovies(q);
      // TMDB multi returns various results; use first 20 that are movie/tv
      const filtered = (data.results || []).filter(r => r.media_type !== "person").slice(0, 20);
      renderResults(filtered);
    }catch(err){
      console.error(err);
      alert("Search failed: " + err.message);
    }finally{
      searchBtn.disabled = false;
      searchBtn.textContent = "Search";
    }
  }

  function selectItem(it){
    selectedMovieId = it.id;
    mainArea.classList.add("hidden");
    iframeArea.classList.remove("hidden");
    // build url from config; replace {id}
    const url = WEBVIEW_URL.replace("{id}", encodeURIComponent(String(selectedMovieId)));
    movieFrame.src = url;
    window.selectedMovieId = selectedMovieId;
  }

  searchBtn.addEventListener("click", doSearch);
  queryInput.addEventListener("keydown", (e)=> { if(e.key === "Enter") doSearch(); });

  backBtn.addEventListener("click", ()=> {
    movieFrame.src = "";
    iframeArea.classList.add("hidden");
    mainArea.classList.remove("hidden");
    updateFocus();
  });

  // Remote / keyboard navigation (vertical)
  let focusIndex = 0;
  function updateFocus(){
    // focusable order: search input, search button, then cards in order, then back button when visible
    const focusables = [];
    if(!mainArea.classList.contains("hidden")){
      focusables.push(queryInput);
      focusables.push(searchBtn);
      cards.forEach(c=> focusables.push(c.card));
    } else {
      focusables.push(backBtn);
    }
    if(focusIndex < 0) focusIndex = 0;
    if(focusIndex >= focusables.length) focusIndex = focusables.length - 1;
    focusables.forEach((el, i)=>{
      el.classList && el.classList.remove("focused");
      if(i === focusIndex){
        try{ el.focus(); }catch(e){}
        el.classList && el.classList.add("focused");
        // ensure element is visible in scroll
        if(el.scrollIntoView) el.scrollIntoView({behavior:"smooth", block:"center"});
      }
    });
  }

  document.addEventListener("keydown",(e)=>{
    // If focusable list is empty, do nothing
    // Allow PageUp/PageDown/Home/End navigation on TV remotes optionally
    const key = e.key;
    const inMain = !mainArea.classList.contains("hidden");
    const total = (inMain ? (2 + cards.length) : 1);
    if(key === "ArrowDown"){
      focusIndex = Math.min(focusIndex + 1, total - 1);
      updateFocus();
      e.preventDefault();
    } else if(key === "ArrowUp"){
      focusIndex = Math.max(focusIndex - 1, 0);
      updateFocus();
      e.preventDefault();
    } else if(key === "Enter"){
      // emulate click on focused element
      const focusables = [];
      if(inMain){
        focusables.push(queryInput);
        focusables.push(searchBtn);
        cards.forEach(c=> focusables.push(c.card));
      } else {
        focusables.push(backBtn);
      }
      const el = focusables[focusIndex];
      if(el){
        // if card, press its select button
        const cobj = cards.find(c => c.card === el);
        if(cobj){
          cobj.selectBtn.click();
        } else {
          el.click();
        }
      }
      e.preventDefault();
    }
  });

  // Initial focus on search input after load
  setTimeout(()=> { focusIndex = 0; updateFocus(); }, 120);
})(); 
