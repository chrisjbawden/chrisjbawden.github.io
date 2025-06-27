// Function to extract frontmatter and body from a Markdown file
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };

  const metaBlock = match[1];
  const body = match[2];
  const meta = {};

  metaBlock.split("\n").forEach(line => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length > 0) {
      meta[key.trim()] = rest.join(":").trim().replace(/^"(.*)"$/, "$1");
    }
  });

  return { meta, body };
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("blog-posts");

  try {
    const postFiles = await fetch("/blog/posts/index.json").then(res => res.json());


    for (const file of postFiles) {
      const path = `https://raw.githubusercontent.com/chrisjbawden/chrisjbawden.github.io/refs/heads/master/blog/posts/${file}`;
      console.log(`Loading ${path}`);
      const raw = await fetch(path).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch ${path}`);
        return res.text();
      });

      const { meta, body } = parseFrontmatter(raw);

      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = meta.title || file;
      details.appendChild(summary);

      const content = document.createElement("div");

      content.innerHTML = body
        .replace(/\n/g, "<br>")
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');

      details.appendChild(content);

      // Optional download link from metadata
      if (meta.link) {
        const link = document.createElement("p");
        link.innerHTML = `<a href="${meta.link}" target="_blank">Download</a>`;
        details.appendChild(link);
      }

      container.appendChild(details);
    }
  } catch (err) {
    container.innerHTML = "<p>Failed to load blog posts.</p>";
    console.error(err);
  }
});
