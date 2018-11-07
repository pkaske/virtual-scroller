import {ItemSource, VirtualScrollerElement} from '../../virtual-scroller-element.js';

class LoremIpsumInlineViewer extends VirtualScrollerElement {
  constructor() {
    super();

    this._items = undefined;
  }

  connectedCallback() {
    super.connectedCallback();

    if ('rootScroller' in document) {
      document.rootScroller = this;
    }

    this._items = Array.from(this.children);
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
  }
}

customElements.define('lorem-ipsum-inline-viewer', LoremIpsumInlineViewer);
