export function qs(selector, root = document) {
  return root?.querySelector(selector) ?? null;
}

export function qsa(selector, root = document) {
  return [...(root?.querySelectorAll(selector) ?? [])];
}

export function createElement(tagName, options = {}, children) {
  const element = document.createElement(tagName);
  const {
    className,
    text,
    attrs = {},
    dataset = {},
    ariaLabel,
    ariaCurrent,
    children: optionChildren,
    ...properties
  } = options;

  if (className) {
    element.className = className;
  }

  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined && value !== null) {
      element[key] = value;
    }
  }

  if (ariaLabel) {
    element.setAttribute("aria-label", ariaLabel);
  }
  if (ariaCurrent) {
    element.setAttribute("aria-current", ariaCurrent);
  }

  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      element.setAttribute(key, String(value));
    }
  }

  for (const [key, value] of Object.entries(dataset)) {
    if (value !== undefined && value !== null) {
      element.dataset[key] = String(value);
    }
  }

  if ("text" in options) {
    element.textContent = text ?? "";
  }

  const content = children ?? optionChildren;
  if (content !== undefined) {
    appendChildren(element, content);
  }

  return element;
}

export function createText(tagName, className = "", text = "") {
  return createElement(tagName, { className, text: text ?? "" });
}

export function createNode(tagName, className = "", content = "") {
  return createElement(tagName, { className }, content);
}

function appendChildren(parent, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    if (Array.isArray(child)) {
      appendChildren(parent, child);
    } else if (child instanceof Node) {
      parent.append(child);
    } else {
      parent.append(document.createTextNode(String(child)));
    }
  }
  return parent;
}

export function setText(element, value) {
  if (element) {
    element.textContent = String(value ?? "");
  }
}

export function setHref(element, href) {
  if (element && href) {
    element.href = href;
  }
}

export function clearNode(element) {
  element?.replaceChildren();
}
