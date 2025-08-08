document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("blog-posts");

  try {
    const postFiles = await fetch('/blog/posts/index.json').then(res => res.json());

    // Sort by date descending
    postFiles.sort((a, b) => b.date.localeCompare(a.date));

    // Group by year
    const postsByYear = {};
    for (const post of postFiles) {
      const year = post.date.slice(0, 4);
      if (!postsByYear[year]) postsByYear[year] = [];
      postsByYear[year].push(post);
    }

    // Render by year, most recent year first
    for (const year of Object.keys(postsByYear).sort((a, b) => b.localeCompare(a))) {
      // Year heading
      const yearHeading = document.createElement("h2");
      yearHeading.textContent = year;
      container.appendChild(yearHeading);

      // Posts for that year
      for (const post of postsByYear[year]) {
        const path = `/blog/posts/${post.file}`;
        const html = await fetch(path).then(res => {
          if (!res.ok) throw new Error(`Failed to fetch ${path}`);
          return res.text();
        });

        const details = document.createElement("details");
        const summary = document.createElement("summary");

        // Title from file (or post.title if you want to add one)
        const title = post.file.replace(".html", "").replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, " ");
        summary.textContent = title;
        details.appendChild(summary);

        const content = document.createElement("div");
        content.innerHTML = html;
        details.appendChild(content);

        container.appendChild(details);
      }
    }
  } catch (err) {
    container.innerHTML = "<p>Failed to load blog posts.</p>";
    console.error(err);
  }
});
