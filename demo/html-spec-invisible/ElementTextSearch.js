export class ElementTextSearch {
  constructor({root, textNormalizer}) {
    this._root = root;
    this._observer = new MutationObserver(records => this._onMutation(records));
    this._observer.observe(this._root, {
      childList: true,
      subtree: true,
    });

    this._textToElement = new Map();

    this._textNormalizer = textNormalizer || (x => x);
  }

  _onMutation(records) {
    const newNodes = new Set();
    for (const record of records) {
      for (const node of record.addedNodes) {
        newNodes.add(node);
      }
      for (const node of record.removedNodes) {
        newNodes.delete(node);
      }
    }

    for (const node of newNodes) {
      let child = node;
      while (child !== null && child.parentNode !== this._root) {
        child = child.parentNode;
      }
      if (child !== null && child.parentNode === this._root) {
        this._updateElement(child);
      }
    }
  }

  _updateElement(element) {
    const textNormalizer = this._textNormalizer;
    this._textToElement.set(textNormalizer(element.textContent), element);
  }

  search(query) {
    const textNormalizer = this._textNormalizer;
    const normalizedQuery = textNormalizer(query);

    const results = new Set();
    for (const text of this._textToElement.keys()) {
      if (text.includes(normalizedQuery)) {
        results.add(this._textToElement.get(text));
      }
    }
    return results;
  }
}
