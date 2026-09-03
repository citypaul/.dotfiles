import { mountCheckout } from "./checkout.js";
import { must } from "./dom.js";
import { mountSignupForm } from "./signup.js";

mountSignupForm(must<HTMLElement>(document, "#signup"));
mountCheckout(must<HTMLElement>(document, "#checkout"));
