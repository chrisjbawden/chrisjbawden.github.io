document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("blog-posts");

  try {
    const postFiles = await fetch('/blog/posts/index.json').then(res => res.json());

    for (const file of postFiles) {
      const path = `/blog/posts/${file}`;
      const html = await fetch(path).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch ${path}`);
        return res.text();
      });

      const details = document.createElement("details");

      const summary = document.createElement("summary");
      const title = file.replace(".html", "").replace(/-/g, " ");
      summary.textContent = title; // Use raw title, no uppercase formatting
      details.appendChild(summary);

      const content = document.createElement("div");
      content.innerHTML = html;
      details.appendChild(content);

      container.appendChild(details);
    }
  } catch (err) {
    container.innerHTML = "<p>Failed to load blog posts.</p>";
    console.error(err);
  }
});

