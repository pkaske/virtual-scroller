import {HtmlSpec} from '../../node_modules/streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../node_modules/streaming-spec/iterateStream.js';
import {ItemSource, VirtualScrollerElement} from '../../virtual-scroller-element.js';

class HTMLSpecSource extends ItemSource {
  static fromArray(items) {
    const placeholders = [];
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.style.lineHeight = '100vh';
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
    this._invisibleArea = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._htmlSpec) return;

    const style = document.createElement('style');
    style.textContent = `
:host {
  /* Bug with position: fixed https://crbug.com/846322 */
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  padding: 8px;
  height: auto;
}`;
    this.shadowRoot.appendChild(style);
    if ('rootScroller' in document) {
      document.rootScroller = this;
    }

    this._invisibleArea = document.createElement('div');
    this._invisibleArea.setAttribute('invisible', '');
    this.shadowRoot.appendChild(this._invisibleArea);

    this._htmlSpec = new HtmlSpec();
    this._htmlSpec.head.style.display = 'none';
    this.appendChild(this._htmlSpec.head);

    this._stream = this._htmlSpec.advance();

    this._items = [];
    this.itemSource = HTMLSpecSource.fromArray(this._items);
    this.createElement = (item) => item;
    this.updateElement = (item, _, idx) => {
      if (idx >= this._items.length) {
        item.textContent = `Loading (index ${idx}, loaded ${
            this._items.length} / ${this.itemSource.length})`;
      }
    };
    this.recycleElement = (item) => {
      if (!isHeaderElement(item)) {
        this._invisibleArea.appendChild(item);
      }
    };

    this._load();
  }

  async _load() {
    let lastYield = performance.now();
    for await (const element of iterateStream(this._stream)) {

      if (isHeaderElement(element)) {
        this._htmlSpec.head.appendChild(element);
      } else {
        this._items.push(element);
        this._invisibleArea.appendChild(element);
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
