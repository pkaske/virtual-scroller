import {HtmlSpec} from '../../node_modules/streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../node_modules/streaming-spec/iterateStream.js';
import {ItemSource, VirtualScrollerElement} from '../../virtual-scroller-element.js';

class HTMLSpecSource extends ItemSource {
  static fromArray(items) {
    const placeholders = [];
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.style.lineHeight = '50vh';
      placeholders.push(el);
    }
    const indexToElement = (idx) => idx >= items.length ?
        placeholders[idx % placeholders.length] :
        items[idx];

    return new this({
      // The number of nodes that we'll load dynamically
      // as the user scrolls.
      getLength: () => Math.max(items.length, 9969),
      item: indexToElement,
      key: indexToElement,
    });
  }
}

const isHeaderElement = (() => {
  const localNames = new Set(['link', 'script', 'style']);
  return element => localNames.has(element.localName);
})();

class HTMLSpecViewer extends VirtualScrollerElement {
  constructor() {
    super();

    this._items = undefined;
    this._htmlSpec = undefined;
    this._stream = undefined;
    this._adding = undefined;
  }

  connectedCallback() {
    super.connectedCallback();

    if (this._htmlSpec) return;

    if ('rootScroller' in document) {
      document.rootScroller = this;
    }

    this._htmlSpec = new HtmlSpec();
    this._htmlSpec.head.style.display = 'none';
    this.appendChild(this._htmlSpec.head);

    this._stream = this._htmlSpec.advance();

    this._items = [];
    this.itemSource = HTMLSpecSource.fromArray(this._items);
    this.createElement = (item) => {
      item.removeAttribute('invisible');
      return item;
    };
    this.updateElement = (item, _, idx) => {
      if (idx >= this._items.length) {
        item.textContent = `Loading (index ${idx}, loaded ${
            this._items.length} / ${this.itemSource.length})`;
      }
    };
    this.recycleElement = (item) => {
      item.setAttribute('invisible', '');
    };

    this._load();
  }

  async _load() {
    let lastYield = performance.now();
    for await (const element of iterateStream(this._stream)) {
      element.setAttribute('invisible', '');

      if (isHeaderElement(element)) {
        this._htmlSpec.head.appendChild(element);
      } else {
        this._items.push(element);
        this.appendChild(element);
      }

      // Spend 2ms per frame appending items to the list, then call
      // `#itemsChanged` and wait for a new idle period.
      if (performance.now() - lastYield > 2) {
        this.itemsChanged();
        await new Promise(resolve => requestIdleCallback(resolve));
        lastYield = performance.now();
      }
    }
    this.itemsChanged();

    this.itemSource = this._items;
    this.updateElement = null;
    this._stream = null;
  }
}

customElements.define('html-spec-viewer', HTMLSpecViewer);
