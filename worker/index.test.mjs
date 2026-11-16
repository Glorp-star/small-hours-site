import assert from "node:assert/strict";
import test from "node:test";
import worker, { validateGeneratedSite, validateInput } from "./index.mjs";

const appOrigin = "https://glorp-star.github.io";
const environment = { APP_ORIGIN: appOrigin, GEMINI_API_KEY: "test-key" };

const input = {
  name: "Test Studio",
  category: "A creative studio",
  description: "Design help for local businesses.",
  brief: "Make the page feel thoughtful and direct.",
  services: ["Brand design", "Web design"],
  area: "Toronto",
  themePreference: "auto",
  email: "private@example.ca",
  phone: "555-0100",
};

const generatedSite = {
  headline: "A clearer first impression",
  introduction: "Thoughtful design for businesses finding their next step.",
  callToAction: "Start a project",
  theme: "blue",
  style: "editorial",
  sections: [
    { heading: "A good place to begin", body: "Make the next step feel simple." },
    { heading: "Built around your work", body: "Give your best work room to speak." },
  ],
};

function makeRequest(body, options = {}) {
  return new Request("https://small-hours-ai.test/api/generate", {
    method: options.method || "POST",
    headers: {
      Origin: options.origin || appOrigin,
      "Content-Type": "application/json",
      "CF-Connecting-IP": options.ip || "192.0.2.1",
    },
    body: options.rawBody ?? JSON.stringify(body),
  });
}

test("rejects requests from any other site origin", async () => {
  const response = await worker.fetch(
    makeRequest(input, { origin: "https://attacker.example" }),
    environment,
  );

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("accepts a preflight request only from the published site", async () => {
  const response = await worker.fetch(
    makeRequest(null, { method: "OPTIONS" }),
    environment,
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), appOrigin);
});

test("does not call Gemini without a backend secret", async () => {
  const response = await worker.fetch(makeRequest(input), { APP_ORIGIN: appOrigin });

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not configured/);
});

test("validates model output and keeps contact details out of the Gemini prompt", async () => {
  const originalFetch = globalThis.fetch;
  let providerRequest;
  globalThis.fetch = async (url, options) => {
    providerRequest = { url: String(url), options };
    return new Response(
      JSON.stringify({
        object: "interaction",
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: JSON.stringify(generatedSite) }],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const response = await worker.fetch(makeRequest(input, { ip: "192.0.2.10" }), environment);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), appOrigin);
    assert.equal(body.site.headline, generatedSite.headline);
    assert.equal(providerRequest.url, "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.equal(providerRequest.options.headers["x-goog-api-key"], "test-key");

    const providerBody = JSON.parse(providerRequest.options.body);
    assert.match(providerBody.input, /Make the page feel thoughtful and direct/);
    assert.doesNotMatch(providerBody.input, /private@example\.ca|555-0100/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retries Gemini once after a temporary service error", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) {
      return new Response(null, { status: 503 });
    }
    return new Response(
      JSON.stringify({
        object: "interaction",
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: JSON.stringify(generatedSite) }],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const response = await worker.fetch(
      makeRequest(input, { ip: "192.0.2.11" }),
      environment,
    );

    assert.equal(response.status, 200);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports persistent Gemini unavailability after the retry", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response(null, { status: 503 });
  };

  try {
    const response = await worker.fetch(
      makeRequest(input, { ip: "192.0.2.12" }),
      environment,
    );
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.match(body.error, /temporarily unavailable/i);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects oversized and incomplete requests", async () => {
  const oversized = await worker.fetch(
    makeRequest(null, { rawBody: "x".repeat(17_000), ip: "192.0.2.20" }),
    environment,
  );
  const incomplete = await worker.fetch(
    makeRequest({ name: "Test Studio" }, { ip: "192.0.2.21" }),
    environment,
  );

  assert.equal(oversized.status, 413);
  assert.equal(incomplete.status, 400);
});

test("limits repeated generations from one client IP", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        object: "interaction",
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: JSON.stringify(generatedSite) }],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  try {
    for (let index = 0; index < 4; index += 1) {
      const response = await worker.fetch(
        makeRequest(input, { ip: "192.0.2.50" }),
        environment,
      );
      assert.equal(response.status, 200);
    }

    const limited = await worker.fetch(
      makeRequest(input, { ip: "192.0.2.50" }),
      environment,
    );
    assert.equal(limited.status, 429);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not accept arbitrary AI output as a site", () => {
  assert.equal(validateGeneratedSite({ ...generatedSite, theme: "url(javascript:alert(1))" }), null);
  assert.equal(validateGeneratedSite({ ...generatedSite, sections: [] }), null);
  assert.equal(validateInput({ name: " ", brief: "Write it" }), null);
});
