(function () {
  async function loadArticles() {
    const src =
      document.documentElement.getAttribute("data-related-json") ||
      "/related-articles.json";

    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) {
      throw new Error("Could not load related articles JSON: " + res.status);
    }

    const data = await res.json();

    // Support both array and { articles: [...] }
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.articles)) return data.articles;

    throw new Error("Invalid related articles JSON structure");
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getSignals() {
    const body = document.body ? document.body.innerText : "";
    const title = document.title || "";
    const metaKeywords =
      document.querySelector('meta[name="keywords"]')?.content || "";
    const metaDescription =
      document.querySelector('meta[name="description"]')?.content || "";
    const slug = location.pathname.split("/").pop() || "";
    const dataKeywords =
      document.documentElement.getAttribute("data-related-keywords") || "";

    return normalize(
      [title, metaKeywords, metaDescription, slug, dataKeywords, body].join(" ")
    );
  }

  function score(article, text) {
    let s = 0;
    (article.keywords || []).forEach((k) => {
      if (text.includes(String(k).toLowerCase())) s += 3;
    });
    return s;
  }

  function createCard(article) {
    const card = document.createElement("article");
    card.className = "ra-card";
    card.innerHTML = `
      <span class="ra-category">${article.category || ""}</span>
      <h3><a href="${article.url || "#"}">${article.title || "Untitled"}</a></h3>
      <p>${article.description || ""}</p>
      <a class="ra-read-more" href="${article.url || "#"}">Read Article</a>
    `;
    return card;
  }

  async function render() {
    const mount = document.getElementById("related-articles-root");
    if (!mount) return;

    try {
      const articles = await loadArticles();
      const text = getSignals();

      const sorted = articles
        .map((a) => ({ a, s: score(a, text) }))
        .sort((x, y) => y.s - x.s)
        .map((x) => x.a)
        .slice(0, 4);

      const section = document.createElement("section");
      section.className = "ra-section";
      section.innerHTML = `
        <div class="ra-header">
          <h2>Related Articles</h2>
          <p>Explore more guides and festival articles.</p>
        </div>
        <div class="ra-grid"></div>
      `;

      const grid = section.querySelector(".ra-grid");
      sorted.forEach((a) => grid.appendChild(createCard(a)));

      mount.appendChild(section);
    } catch (err) {
      console.error("Related articles failed:", err);

      mount.innerHTML = `
        <section class="ra-section">
          <div class="ra-header">
            <h2>Related Articles</h2>
            <p>Unable to load related articles right now.</p>
          </div>
        </section>
      `;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();