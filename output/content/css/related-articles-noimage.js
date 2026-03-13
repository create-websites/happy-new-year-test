
(function () {
  async function loadArticles() {
    const src = document.documentElement.getAttribute("data-related-json") || "/related-articles.json";
    const res = await fetch(src);
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

  function getSignals() {
    const body = document.body ? document.body.innerText : "";
    const title = document.title || "";
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || "";
    const metaDescription = document.querySelector('meta[name="description"]')?.content || "";
    const slug = location.pathname.split("/").pop() || "";
    const dataKeywords = document.documentElement.getAttribute("data-related-keywords") || "";

    return normalize([title, metaKeywords, metaDescription, slug, dataKeywords, body].join(" "));
  }

  function score(article, text) {
    let score = 0;
    (article.keywords || []).forEach(k => {
      if (text.includes(k.toLowerCase())) score += 3;
    });
    return score;
  }

  function createCard(article) {
    const card = document.createElement("article");
    card.className = "ra-card";
    card.innerHTML = `
      <span class="ra-category">${article.category}</span>
      <h3><a href="${article.url}">${article.title}</a></h3>
      <p>${article.description}</p>
      <a class="ra-read-more" href="${article.url}">Read Article</a>
    `;
    return card;
  }

  async function render() {
    const mount = document.getElementById("related-articles-root");
    if (!mount) return;

    const articles = await loadArticles();
    const text = getSignals();

    const sorted = articles
      .map(a => ({ a, s: score(a, text) }))
      .sort((x,y)=>y.s-x.s)
      .map(x=>x.a)
      .slice(0,4);

    const section = document.createElement("section");
    section.className="ra-section";

    section.innerHTML=`
      <div class="ra-header">
        <h2>Related Articles</h2>
        <p>Explore more guides and festival articles.</p>
      </div>
      <div class="ra-grid"></div>
    `;

    const grid = section.querySelector(".ra-grid");

    sorted.forEach(a=>grid.appendChild(createCard(a)));

    mount.appendChild(section);
  }

  if (document.readyState==="loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
