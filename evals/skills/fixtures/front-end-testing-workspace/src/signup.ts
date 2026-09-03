import { createSignup } from "./api.js";
import { must, spinner } from "./dom.js";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const template = `
  <form class="signup" novalidate>
    <h2>Create your account</h2>
    <p>
      <label for="signup-name">Full name</label>
      <input id="signup-name" name="fullName" type="text" autocomplete="name" />
    </p>
    <p>
      <label for="signup-email">Email address</label>
      <input id="signup-email" name="email" type="email" autocomplete="email" />
    </p>
    <p class="status" role="status"></p>
    <button type="submit">Create account</button>
  </form>
`;

export const mountSignupForm = (container: HTMLElement): void => {
  container.innerHTML = template;
  const doc = container.ownerDocument;
  const form = must<HTMLFormElement>(container, "form.signup");
  const name = must<HTMLInputElement>(container, "#signup-name");
  const email = must<HTMLInputElement>(container, "#signup-email");
  const status = must<HTMLElement>(container, ".status");
  const submit = must<HTMLButtonElement>(container, "button[type=submit]");

  const say = (message: string): void => {
    status.replaceChildren(doc.createTextNode(message));
  };

  const busy = (isBusy: boolean, message = ""): void => {
    submit.disabled = isBusy;
    form.setAttribute("aria-busy", String(isBusy));
    if (isBusy) {
      status.replaceChildren(spinner(doc), doc.createTextNode(message));
    }
  };

  const send = async (): Promise<void> => {
    busy(true, "Creating your account…");
    try {
      await createSignup({
        fullName: name.value.trim(),
        email: email.value.trim(),
      });
      say(`Account created. Check your inbox, ${name.value.trim()}.`);
    } catch {
      say("Sorry — we couldn't create your account. Please try again.");
    } finally {
      busy(false);
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (name.value.trim() === "") {
      say("Enter your full name.");
      return;
    }
    if (!EMAIL.test(email.value.trim())) {
      say("Enter a valid email address.");
      return;
    }
    void send();
  });
};
