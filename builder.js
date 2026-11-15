const websiteForm = document.querySelector("#website-form");
const preview = document.querySelector("#site-preview");
const downloadButton = document.querySelector("#download-button");
const builderStatus = document.querySelector("#builder-status");
const desktopButton = document.querySelector("#preview-desktop");
const phoneButton = document.querySelector("#preview-phone");

const fields = {
  name: document.querySelector("#business-name"),
  type: document.querySelector("#business-type"),
  description: document.querySelector("#description"),
  services: document.querySelector("#services"),
  area: document.querySelector("#area"),
  theme: document.querySelector("#theme"),
  email: document.querySelector("#email"),
  phone: document.querySelector("#phone"),
};

const businessTypes = {
  local: "A local business",
  beauty: "Beauty and personal care",
  food: "Food and drink",
  home: "Home services",
  creative: "A creative studio",
};

const themes = {
  coral: { accent: "#d75f4e", wash: "#f7e5df", ink: "#202239" },
  blue: { accent: "#5365c8", wash: "#e7eafa", ink: "#202239" },
  leaf: { accent: "#587449", wash: "#e9efdf", ink: "#202239" },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function readContent() {
  const serviceItems = fields.services.value
    .split(/\r?\n/)
    .map((service) => service.trim())
    .filter(Boolean)
    .slice(0, 8);
  const phoneDigits = fields.phone.value.replace(/\D/g, "");
  const email = fields.email.value.trim();

  return {
    name: fields.name.value.trim() || "Your business",
    category: businessTypes[fields.type.value] || businessTypes.local,
    description:
      fields.description.value.trim() ||
      "Add a short sentence about what you offer and who you help.",
    services: serviceItems,
    area: fields.area.value.trim(),
    theme: themes[fields.theme.value] || themes.coral,
    email: email && fields.email.validity.valid ? email : "",
    phone: phoneDigits ? fields.phone.value.trim() : "",
    phoneHref: phoneDigits ? `tel:${phoneDigits}` : "",
  };
}

function createWebsiteHtml() {
  const content = readContent();
  const serviceMarkup = content.services.length
    ? content.services
        .map((service) => `<li>${escapeHtml(service)}</li>`)
        .join("\n")
    : "<li>Add your services or products here.</li>";
  const contactHref = content.email
    ? `mailto:${content.email}`
    : content.phoneHref || "#services";
  const contactLabel = content.email
    ? "Email us"
    : content.phoneHref
      ? "Call us"
      : "See our services";
  const areaMarkup = content.area
    ? `<span>${escapeHtml(content.area)}</span>`
    : "";
  const emailMarkup = content.email
    ? `<a href="mailto:${escapeHtml(content.email)}">${escapeHtml(content.email)}</a>`
    : "";
  const phoneMarkup = content.phone
    ? `<a href="${escapeHtml(content.phoneHref)}">${escapeHtml(content.phone)}</a>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(content.description)}">
  <title>${escapeHtml(content.name)}</title>
  <style>
    :root{color-scheme:light;--accent:${content.theme.accent};--wash:${content.theme.wash};--ink:${content.theme.ink};--paper:#f7f6f1;--muted:#656779}
    *{box-sizing:border-box}
    body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,"Segoe UI",sans-serif}
    a{color:inherit}
    .page{width:min(980px,88vw);margin:0 auto}
    header{min-height:70px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #deddd4;font-size:12px}
    .wordmark{font-weight:800;letter-spacing:-.04em;text-decoration:none}
    .place{color:var(--muted)}
    .hero{margin:42px 0 20px;padding:clamp(28px,6vw,65px);background:var(--wash)}
    .eyebrow{margin:0 0 16px;color:var(--accent);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    h1{max-width:700px;margin:0 0 16px;font-size:clamp(42px,8vw,82px);line-height:.96;letter-spacing:-.075em}
    .intro{max-width:590px;margin:0 0 24px;color:var(--muted);font-size:15px;line-height:1.7}
    .button{display:inline-flex;min-height:44px;align-items:center;padding:0 16px;background:var(--ink);color:white;font-size:12px;font-weight:700;text-decoration:none}
    section.services{padding:42px 0}
    h2{margin:0 0 16px;font-size:25px;letter-spacing:-.06em}
    ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:0;padding:0;list-style:none}
    li{padding:16px;border:1px solid #deddd4;background:#fffefa;font-size:12px}
    footer{display:flex;flex-wrap:wrap;gap:12px 24px;padding:22px 0;border-top:1px solid #deddd4;color:var(--muted);font-size:11px}
    footer a{text-decoration:none}
    @media(max-width:520px){header{min-height:60px}.hero{margin-top:24px;padding:27px 22px}.intro{font-size:13px}section.services{padding:28px 0}}
  </style>
</head>
<body>
  <div class="page">
    <header><a class="wordmark" href="#top">${escapeHtml(content.name)}</a><span class="place">${areaMarkup}</span></header>
    <main id="top">
      <section class="hero">
        <p class="eyebrow">${escapeHtml(content.category)}</p>
        <h1>${escapeHtml(content.name)}</h1>
        <p class="intro">${escapeHtml(content.description)}</p>
        <a class="button" href="${escapeHtml(contactHref)}">${contactLabel}</a>
      </section>
      <section class="services" id="services">
        <h2>What we offer</h2>
        <ul>${serviceMarkup}</ul>
      </section>
    </main>
    <footer>${areaMarkup}${emailMarkup}${phoneMarkup}</footer>
  </div>
</body>
</html>`;
}

function updatePreview() {
  preview.srcdoc = createWebsiteHtml();
  builderStatus.textContent = "Preview updated. Your entries stay in this browser.";
}

function downloadWebsite() {
  const html = createWebsiteHtml();
  const file = new Blob([html], { type: "text/html;charset=utf-8" });
  const fileUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  const slug = readContent().name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  link.href = fileUrl;
  link.download = `${slug || "business"}-site.html`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
  builderStatus.textContent =
    "Downloaded. Rename the file to index.html if your host expects that filename.";
}

function setPreviewSize(size) {
  const isPhone = size === "phone";
  preview.classList.toggle("is-phone", isPhone);
  desktopButton.setAttribute("aria-pressed", String(!isPhone));
  phoneButton.setAttribute("aria-pressed", String(isPhone));
}

websiteForm.addEventListener("input", updatePreview);
websiteForm.addEventListener("change", updatePreview);
downloadButton.addEventListener("click", downloadWebsite);
desktopButton.addEventListener("click", () => setPreviewSize("desktop"));
phoneButton.addEventListener("click", () => setPreviewSize("phone"));

updatePreview();
