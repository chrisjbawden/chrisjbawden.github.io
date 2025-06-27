document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("blog-posts");

  // List of HTML files (each file = 1 blog post)
  const postFiles = [
    "multi-tab-loader.html",
    "cs50-project.html",
    "md5-java.html",
    "zip-bomb.html",
    "snow-encoder.html",
    "adobe-attack.html",
    "browser-mining.html",
    "wifi-password.html",
    "instructions.html"
  ];

  for (const file of postFiles) {
    try {
      const path = `/blog/posts/${file}`;
      const html = await fetch(path).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch ${path}`);
        return res.text();
      });

      // Create <details> with <summary> and post content
      const details = document.createElement("details");

      const summary = document.createElement("summary");
      const title = file.replace(".html", "").replace(/-/g, " ");
      summary.textContent = title.charAt(0).toUpperCase() + title.slice(1);
      details.appendChild(summary);

      const content = document.createElement("div");
      content.innerHTML = html;
      details.appendChild(content);

      container.appendChild(details);
    } catch (err) {
      console.error(`Error loading ${file}:`, err);
    }
  }
});
