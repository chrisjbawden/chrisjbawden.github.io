document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("blog-posts");

  try {
    const postFiles = [
      "wifi-password.md",
      "browser-mining.md",
      "adobe-attack.md"
    ];

    for (const file of postFiles) {
      const raw = await fetch(`/blog/posts/${file}`).then(res => res.text());
      const { meta, body } = parseFrontmatter(raw);

      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = meta.title || file;
      details.appendChild(summary);

      const p = document.createElement("p");

      p.innerHTML = body
        .replace(/\n/g, "<br>")
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');

      details.appendChild(p);

      container.appendChild(details);
    }
  } catch (err) {
    container.innerHTML = "<p>Failed to load blog posts.</p>";
    console.error(err);
  }
});
