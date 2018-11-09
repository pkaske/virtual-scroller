import {ItemSource, VirtualScrollerElement} from '../../virtual-scroller-element.js';
import {loremIpsumElementsHTML} from "./lorem-ipsum-elements.js";

class LoremIpsumViewer extends VirtualScrollerElement {
  constructor() {
    super();

    this._items = [];
  }

  connectedCallback() {
    super.connectedCallback();

    if ('rootScroller' in document) {
      document.rootScroller = this;
    }

    for (const item of this._items) {
      item.setAttribute('invisible', '');
      this.appendChild(item);
    }

    this.itemSource = ItemSource.fromArray(this._items);
    this.createElement = (item) => {
      item.removeAttribute('invisible');
      return item;
    };
    this.updateElement = () => {};
    this.recycleElement = (item) => {
      item.setAttribute('invisible', '');
    };

    this.addEventListener('activateinvisible', e => {
      let node = e.target;
      while (node && node.parentNode !== this) {
        node = node.parentNode;
      }

      if (node && node.parentNode === this) {
        const index = this._items.indexOf(node);
        if (index !== -1) {
          e.preventDefault();
          window.requestAnimationFrame(() => this.scrollToIndex(index));
        }
      }
    });

    this._load();
  }

  async _load() {
    const template = document.createElement('template');

    let lastYield = performance.now();
    for await (const htmlChunk of loremIpsumElementsHTML) {
      template.innerHTML = htmlChunk;
      const element = template.content.firstElementChild;
      template.innerHTML = '';

      element.setAttribute('invisible', '');
      element.style.contains = "style layout paint";
      this._items.push(element);
      this.appendChild(element);

      // Spend 2ms per frame appending items to the list, then call
      // `#itemsChanged` and wait for a new idle period.
      if (performance.now() - lastYield > 4) {
        this.itemsChanged();
        await new Promise(resolve => requestIdleCallback(resolve));
        lastYield = performance.now();
      }
    }
    this.itemsChanged();
  }
}

customElements.define('lorem-ipsum-viewer', LoremIpsumViewer);
