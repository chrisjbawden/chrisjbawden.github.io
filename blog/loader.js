document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("blog-posts");

  try {
    const postFiles = [
      "wifi-password.json",
      "browser-mining.json",
      "adobe-attack.json"
    ];

    for (const file of postFiles) {
      const path = `/blog/posts/${file}`;
      const post = await fetch(path).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch ${path}`);
        return res.json();
      });

      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = post.title || file;
      details.appendChild(summary);

      const content = document.createElement("div");
      content.innerHTML = post.body
        .replace(/\n/g, "<br>")
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');

      details.appendChild(content);

      if (post.link) {
        const link = document.createElement("p");
        link.innerHTML = `<a href="${post.link}" target="_blank">Download</a>`;
        details.appendChild(link);
      }

      container.appendChild(details);
    }
  } catch (err) {
    container.innerHTML = "<p>Failed to load blog posts.</p>";
    console.error(err);
  }
});
