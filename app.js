// Paste a hosted Stripe Payment Link for the $149 CAD offer here.
// Never put a payment-provider secret or API key in this file.
const CHECKOUT_URL = "https://buy.stripe.com/test_7sY00kclTbIDd8d2DjgMw01";

const checkoutButton = document.querySelector("#checkout-button");
const paymentNote = document.querySelector("#payment-note");
const stripeHosts = new Set(["buy.stripe.com", "checkout.stripe.com"]);

function configureCheckout() {
  if (!CHECKOUT_URL.trim()) {
    paymentNote.textContent =
      "Demo checkout is off. Create a Stripe Payment Link for $149 CAD, then add its URL to app.js.";
    return;
  }

  let checkout;
  try {
    checkout = new URL(CHECKOUT_URL);
  } catch (error) {
    paymentNote.textContent = "Checkout is unavailable: the payment link in app.js is not a valid URL.";
    return;
  }

  if (checkout.protocol !== "https:" || !stripeHosts.has(checkout.hostname)) {
    paymentNote.textContent =
      "Checkout is unavailable: add an HTTPS Stripe Payment Link from buy.stripe.com.";
    return;
  }

  checkoutButton.disabled = false;
  if (checkout.pathname.startsWith("/test_")) {
    paymentNote.textContent =
      "Test mode only—no real money is charged. Configure Stripe to redirect after payment to your hosted success.html.";
  } else {
    paymentNote.textContent = "Secure checkout opens on Stripe. Project details are confirmed after payment.";
  }
  checkoutButton.addEventListener("click", () => {
    window.location.assign(checkout.href);
  });
}

configureCheckout();
