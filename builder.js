const websiteForm = document.querySelector("#website-form");
const preview = document.querySelector("#site-preview");
const generateButton = document.querySelector("#generate-button");
const downloadButton = document.querySelector("#download-button");
const builderStatus = document.querySelector("#builder-status");
const setupNotice = document.querySelector("#ai-setup-notice");
const desktopButton = document.querySelector("#preview-desktop");
const phoneButton = document.querySelector("#preview-phone");
const consentCheckbox = document.querySelector("#ai-consent");

const fields = {
  name: document.querySelector("#business-name"),
  type: document.querySelector("#business-type"),
  description: document.querySelector("#description"),
  brief: document.querySelector("#creative-brief"),
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
  coral: {
    paper: "#f6f4ee",
    surface: "#fffefa",
    ink: "#202239",
    muted: "#656779",
    accent: "#d75f4e",
    accentInk: "#ffffff",
  },
  blue: {
    paper: "#f3f4fb",
    surface: "#ffffff",
    ink: "#22253d",
    muted: "#666a80",
    accent: "#5365c8",
    accentInk: "#ffffff",
  },
  leaf: {
    paper: "#f3f5ed",
    surface: "#fffefa",
    ink: "#273027",
    muted: "#687064",
    accent: "#587449",
    accentInk: "#ffffff",
  },
  ink: {
    paper: "#17191e",
    surface: "#24272e",
    ink: "#f5f3ed",
    muted: "#c5c6ca",
    accent: "#d7ed72",
    accentInk: "#202239",
  },
  sand: {
    paper: "#f3ecdf",
    surface: "#fffaf0",
    ink: "#382f28",
    muted: "#6b625a",
    accent: "#9b5039",
    accentInk: "#ffffff",
  },
};

const endpoint = getApiEndpoint();
let generatedSite = null;
let activeRequest = null;

function getApiEndpoint() {
  const configuredEndpoint = window.SMALL_HOURS_AI_CONFIG?.endpoint;
  if (typeof configuredEndpoint !== "string" || !configuredEndpoint.trim()) {
    return "";
  }

  try {
    const url = new URL(configuredEndpoint);
    return url.protocol === "https:" && url.pathname.replace(/\/+$/, "") === "/api/generate"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

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
    name: fields.name.value.trim(),
    category: businessTypes[fields.type.value] || businessTypes.local,
    description: fields.description.value.trim(),
    brief: fields.brief.value.trim(),
    services: serviceItems,
    area: fields.area.value.trim(),
    themePreference: fields.theme.value,
    email: email && fields.email.validity.valid ? email : "",
    phone: phoneDigits ? fields.phone.value.trim() : "",
    phoneHref: phoneDigits ? `tel:${phoneDigits}` : "",
  };
}

function normalizeGeneratedSite(site) {
  const allowedStyles = new Set(["editorial", "playful", "minimal", "bold"]);
  const text = (value, limit) =>
    typeof value === "string" ? value.trim().slice(0, limit) : "";

  if (!site || typeof site !== "object") {
    throw new Error("Gemini returned an unreadable website. Try again.");
  }

  const sections = Array.isArray(site.sections)
    ? site.sections
        .slice(0, 4)
        .map((section) => ({
          heading: text(section?.heading, 70),
          body: text(section?.body, 500),
        }))
        .filter((section) => section.heading && section.body)
    : [];
  const theme = themes[site.theme] ? site.theme : "coral";
  const style = allowedStyles.has(site.style) ? site.style : "minimal";
  const normalized = {
    headline: text(site.headline, 100),
    introduction: text(site.introduction, 400),
    callToAction: text(site.callToAction, 40),
    sections,
    theme,
    style,
  };

  if (
    !normalized.headline ||
    !normalized.introduction ||
    !normalized.callToAction ||
    normalized.sections.length < 2
  ) {
    throw new Error("Gemini returned an incomplete website. Try again.");
  }

  return normalized;
}

function createWebsiteHtml(content, site) {
  const palette = themes[site.theme];
  const contactHref = content.email
    ? `mailto:${content.email}`
    : content.phoneHref || "#services";
  const servicesMarkup = content.services.length
    ? `<section class="services" id="services">
        <p class="section-kicker">The details</p>
        <h2>What we offer</h2>
        <ul>${content.services.map((service) => `<li>${escapeHtml(service)}</li>`).join("")}</ul>
      </section>`
    : "";
  const sectionsMarkup = site.sections
    .map(
      (section, index) => `<section class="story-section">
        <p class="section-index">${String(index + 1).padStart(2, "0")}</p>
        <div><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></div>
      </section>`,
    )
    .join("");
  const areaMarkup = content.area ? `<span>${escapeHtml(content.area)}</span>` : "";
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
  <meta name="description" content="${escapeHtml(site.introduction)}">
  <title>${escapeHtml(content.name)}</title>
  <style>
    :root{color-scheme:light;--paper:${palette.paper};--surface:${palette.surface};--ink:${palette.ink};--muted:${palette.muted};--accent:${palette.accent};--accent-ink:${palette.accentInk}}
    *{box-sizing:border-box}
    body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,"Segoe UI",sans-serif}
    a{color:inherit}
    .page{width:min(980px,88vw);margin:0 auto}
    header{min-height:72px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid color-mix(in srgb,var(--ink) 18%,transparent);font-size:12px}
    .wordmark{font-weight:800;letter-spacing:-.04em;text-decoration:none}
    .place,.story-section>div>p{color:var(--muted)}
    .hero{margin:42px 0 20px;padding:clamp(28px,6vw,65px);background:var(--surface)}
    .eyebrow,.section-kicker{margin:0 0 16px;color:var(--accent);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    h1{max-width:740px;margin:0 0 16px;font-size:clamp(42px,8vw,82px);line-height:.96;letter-spacing:-.075em}
    .intro{max-width:590px;margin:0 0 24px;color:var(--muted);font-size:15px;line-height:1.7}
    .button{display:inline-flex;min-height:46px;align-items:center;padding:0 17px;background:var(--accent);color:var(--accent-ink);font-size:12px;font-weight:700;text-decoration:none}
    .story-section{display:grid;grid-template-columns:55px minmax(0,1fr);gap:18px;padding:32px 0;border-top:1px solid color-mix(in srgb,var(--ink) 18%,transparent)}
    .section-index{margin:4px 0 0;color:var(--accent);font-size:11px;font-weight:700}
    h2{margin:0 0 10px;font-size:clamp(22px,3vw,32px);letter-spacing:-.055em}
    .story-section>div>p{max-width:650px;margin:0;font-size:14px;line-height:1.7}
    .services{padding:34px 0;border-top:1px solid color-mix(in srgb,var(--ink) 18%,transparent)}
    .services .section-kicker{margin-bottom:8px}
    ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:18px 0 0;padding:0;list-style:none}
    li{padding:15px;border:1px solid color-mix(in srgb,var(--ink) 18%,transparent);background:var(--surface);font-size:12px}
    footer{display:flex;flex-wrap:wrap;gap:12px 24px;padding:22px 0;border-top:1px solid color-mix(in srgb,var(--ink) 18%,transparent);color:var(--muted);font-size:11px}
    footer a{text-decoration:none}
    .ai-site--editorial h1,.ai-site--editorial h2{font-family:Georgia,"Times New Roman",serif;font-weight:400;letter-spacing:-.045em}
    .ai-site--editorial .hero{border-left:5px solid var(--accent)}
    .ai-site--playful .hero{border-radius:24px}
    .ai-site--playful li{border-radius:12px}
    .ai-site--minimal .hero{padding-left:0;background:transparent}
    .ai-site--bold .hero{background:var(--ink);color:var(--paper)}
    .ai-site--bold .intro{color:var(--paper)}
    @media(max-width:520px){header{min-height:60px}.hero{margin-top:24px;padding:27px 22px}.ai-site--minimal .hero{padding-left:0}.intro{font-size:13px}.story-section{grid-template-columns:35px minmax(0,1fr);gap:12px}.services{padding:28px 0}}
  </style>
</head>
<body class="ai-site--${site.style}">
  <div class="page">
    <header><a class="wordmark" href="#top">${escapeHtml(content.name)}</a><span class="place">${areaMarkup}</span></header>
    <main id="top">
      <section class="hero">
        <p class="eyebrow">${escapeHtml(content.category)}</p>
        <h1>${escapeHtml(site.headline)}</h1>
        <p class="intro">${escapeHtml(site.introduction)}</p>
        <a class="button" href="${escapeHtml(contactHref)}">${escapeHtml(site.callToAction)}</a>
      </section>
      ${sectionsMarkup}
      ${servicesMarkup}
    </main>
    <footer>${areaMarkup}${emailMarkup}${phoneMarkup}</footer>
  </div>
</body>
</html>`;
}

function showEmptyPreview() {
  preview.srcdoc = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f3ed;color:#55576a;font:14px/1.6 Arial,sans-serif;text-align:center}.message{max-width:310px;padding:24px}strong{display:block;margin-bottom:8px;color:#191b35;font-size:18px}</style>
</head><body><div class="message"><strong>Your AI-built site will appear here.</strong>Describe the business and the kind of page you want, then choose “Build my site with AI.”</div></body></html>`;
}

function setPreviewSize(size) {
  const isPhone = size === "phone";
  preview.classList.toggle("is-phone", isPhone);
  desktopButton.setAttribute("aria-pressed", String(!isPhone));
  phoneButton.setAttribute("aria-pressed", String(isPhone));
}

function invalidateGeneratedSite() {
  if (activeRequest) {
    activeRequest.abort();
    activeRequest = null;
    generateButton.disabled = false;
  }

  generatedSite = null;
  downloadButton.disabled = true;
  showEmptyPreview();
  builderStatus.textContent = "Your details changed. Build the site again to update the preview.";
}

async function generateWebsite() {
  if (!endpoint) {
    setupNotice.hidden = false;
    builderStatus.textContent =
      "Gemini is not connected yet. Follow the private setup steps before generating a site.";
    setupNotice.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  if (!consentCheckbox.checked) {
    builderStatus.textContent = "Check the Google Gemini data notice before generating.";
    consentCheckbox.focus();
    return;
  }

  if (!websiteForm.reportValidity()) {
    builderStatus.textContent = "Fill in the required business details first.";
    return;
  }

  const content = readContent();
  if (!content.name || (!content.description && !content.brief)) {
    builderStatus.textContent = "Add a business name and describe what you want the site to say.";
    return;
  }

  const controller = new AbortController();
  activeRequest = controller;
  generateButton.disabled = true;
  downloadButton.disabled = true;
  builderStatus.textContent = "Gemini is writing your page and choosing its visual direction…";
  const generationRequest = {
    name: content.name,
    category: content.category,
    description: content.description,
    brief: content.brief,
    services: content.services,
    area: content.area,
    themePreference: content.themePreference,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(generationRequest),
      signal: controller.signal,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "Gemini could not build the page. Try again in a moment.",
      );
    }

    generatedSite = normalizeGeneratedSite(result.site);
    preview.srcdoc = createWebsiteHtml(readContent(), generatedSite);
    downloadButton.disabled = false;
    builderStatus.textContent =
      "Your AI-built page is ready. Check every detail before you publish or share it.";
  } catch (error) {
    if (error.name !== "AbortError") {
      builderStatus.textContent =
        error instanceof TypeError
          ? "Could not reach the AI service. Check the connection and try again."
          : error.message;
    }
  } finally {
    if (activeRequest === controller) {
      activeRequest = null;
      generateButton.disabled = false;
    }
  }
}

function downloadWebsite() {
  if (!generatedSite) {
    builderStatus.textContent = "Build the page with Gemini before downloading it.";
    return;
  }

  const html = createWebsiteHtml(readContent(), generatedSite);
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

websiteForm.addEventListener("input", invalidateGeneratedSite);
websiteForm.addEventListener("change", invalidateGeneratedSite);
generateButton.addEventListener("click", generateWebsite);
downloadButton.addEventListener("click", downloadWebsite);
desktopButton.addEventListener("click", () => setPreviewSize("desktop"));
phoneButton.addEventListener("click", () => setPreviewSize("phone"));

downloadButton.disabled = true;
showEmptyPreview();
if (!endpoint) {
  setupNotice.hidden = false;
  builderStatus.textContent = "Gemini setup is required before the AI generator can run.";
}
