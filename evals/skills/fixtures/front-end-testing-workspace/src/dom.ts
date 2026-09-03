export const must = <T extends Element>(
  root: ParentNode,
  selector: string,
): T => {
  const element = root.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`the template is missing ${selector}`);
  }
  return element;
};

export const spinner = (document: Document): HTMLElement => {
  const element = document.createElement("span");
  element.className = "spinner";
  element.setAttribute("aria-hidden", "true");
  element.textContent = "◐";
  return element;
};
