AUTO RELATED ARTICLES SYSTEM - JSON VERSION

FILES
1. related-articles-loader.js
2. related-articles.css
3. related-articles.json

WHY THIS VERSION IS BETTER
- You update article data in one JSON file
- No need to edit JavaScript each time you add a new article
- Easier to scale across your whole site

INSTALLATION

1) Add this CSS in the <head>
<link rel="stylesheet" href="/related-articles.css">

2) Add this to the <html> tag if you want page-specific keyword hints
<html data-related-keywords="easter spring christian family celebration"
      data-related-json="/related-articles.json">

3) Add this container above your footer
<div id="related-articles-root"
     data-limit="4"
     data-heading="Related Articles"
     data-intro="Explore more guides and festival articles."></div>

4) Add this script before </body>
<script src="/related-articles-loader.js"></script>

HOW TO ADD NEW ARTICLES

Open related-articles.json and add a new object like this:

{
  "id": "article-slug",
  "title": "Article Title",
  "url": "/article-page.html",
  "category": "Festival Guide",
  "description": "Short description here.",
  "image": "/images/article-image.jpg",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

OPTIONAL PAGE CONTROL

You can force the current page URL if needed:
<html data-current-url="/easter-celebration-guide.html">

You can point to a custom JSON file:
<html data-related-json="/data/related-articles.json">

NOTES
- The system excludes the current page automatically
- It uses page title, meta description, meta keywords, slug, body text, and optional custom keywords
- Best results come from giving each page strong title, meta description, and keywords
