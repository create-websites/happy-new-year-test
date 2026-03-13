(function () {
  async function loadArticles() {
    const src = document.documentElement.getAttribute("data-related-json") || "/related-articles.json";
    const res = await fetch(src, { cache: "no-cache" });
    if (!res.ok) throw new Error("Could not load related articles JSON");
    return await res.json();
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function uniqueByUrl(items) {
    const seen = new Set();
    return items.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }

  function getCurrentSignals() {
    const body = document.body ? document.body.innerText : "";
    const title = document.title || "";
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || "";
    const metaDescription = document.querySelector('meta[name="description"]')?.content || "";
    const slug = location.pathname.split("/").pop() || "";
    const dataKeywords = document.documentElement.getAttribute("data-related-keywords") || "";
    const explicitCurrentUrl = document.documentElement.getAttribute("data-current-url") || location.pathname;

    return {
      currentUrl: explicitCurrentUrl,
      haystack: normalize([title, metaKeywords, metaDescription, slug, dataKeywords, body].join(" "))
    };
  }

  function scoreArticle(article, signals) {
    if (article.url === signals.currentUrl) return -9999;

    let score = 0;
    const text = signals.haystack;

    (article.keywords || []).forEach((keyword) => {
      const normalized = normalize(keyword);
      if (!normalized) return;
      if (text.includes(normalized)) score += normalized.split(" ").length > 1 ? 6 : 3;
    });

    const titleNorm = normalize(article.title);
    if (text.includes(titleNorm)) score += 8;

    const categoryNorm = normalize(article.category);
    if (text.includes(categoryNorm)) score += 2;

    return score;
  }

  function pickRelatedArticles(articleDatabase, limit) {
    const signals = getCurrentSignals();
    const scored = articleDatabase
      .map((article) => ({ article, score: scoreArticle(article, signals) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.article);

    const filtered = uniqueByUrl(scored).filter((a) => a.url !== signals.currentUrl);

    const positive = filtered.filter((article) => scoreArticle(article, signals) > 0);
    const fallback = filtered.filter((article) => !positive.includes(article));

    return [...positive, ...fallback].slice(0, limit || 4);
  }

  function createCard(article) {
    const card = document.createElement("article");
    card.className = "ra-card";

    card.innerHTML = `
      <a class="ra-image-link" href="${article.url}">
        <img src="${article.image}" alt="${article.title}" loading="lazy" width="600" height="400">
      </a>
      <div class="ra-content">
        <span class="ra-category">${article.category}</span>
        <h3><a href="${article.url}">${article.title}</a></h3>
        <p>${article.description}</p>
        <a class="ra-read-more" href="${article.url}">Read Article</a>
      </div>
    `;
    return card;
  }

  async function renderRelatedArticles() {
    const mount = document.getElementById("related-articles-root");
    if (!mount) return;

    const limit = parseInt(mount.getAttribute("data-limit") || "4", 10);
    const heading = mount.getAttribute("data-heading") || "Related Articles";
    const intro = mount.getAttribute("data-intro") || "Explore more guides and festival articles.";

    try {
      const articleDatabase = await loadArticles();
      const articles = pickRelatedArticles(articleDatabase, limit);

      mount.innerHTML = "";

      const section = document.createElement("section");
      section.className = "ra-section";
      section.setAttribute("aria-labelledby", "related-articles-heading");

      const header = document.createElement("div");
      header.className = "ra-header";
      header.innerHTML = `
        <h2 id="related-articles-heading">${heading}</h2>
        <p>${intro}</p>
      `;

      const grid = document.createElement("div");
      grid.className = "ra-grid";

      articles.forEach((article) => grid.appendChild(createCard(article)));

      section.appendChild(header);
      section.appendChild(grid);
      mount.appendChild(section);
    } catch (err) {
      console.error("Related articles failed to load:", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderRelatedArticles);
  } else {
    renderRelatedArticles();
  }

  window.RelatedArticlesSystem = {
    render: renderRelatedArticles
  };
})();
