(() => {
  const init = (root = document) => {
    root.querySelectorAll('[data-hp-product-form]').forEach((form) => {
      if (form.dataset.ready) return;
      form.dataset.ready = 'true';
      const select = form.querySelector('[name="id"]');
      const section = form.closest('[data-hp-product-section]');
      const price = section?.querySelector('[data-hp-current-price]');
      const button = form.querySelector('[name="add"]');
      const change = () => {
        const option = select?.selectedOptions[0];
        if (!option) return;
        if (price) price.textContent = option.dataset.price || '';
        if (button) {
          const available = option.dataset.available === 'true';
          button.disabled = form.dataset.commerce !== 'true' || !available;
          button.textContent = form.dataset.commerce !== 'true' ? form.dataset.preparing : available ? form.dataset.add : form.dataset.unavailable;
        }
        const url = new URL(location.href);
        if (/^\d+$/.test(option.value)) {
          url.searchParams.set('variant', option.value);
          history.replaceState(null, '', url);
        }
      };
      select?.addEventListener('change', change);
      form.addEventListener('submit', (event) => {
        if (form.dataset.commerce !== 'true' || button?.disabled) event.preventDefault();
      });
    });
    root.querySelectorAll('[data-hp-thumbnail]').forEach((button) => {
      if (button.dataset.ready) return;
      button.dataset.ready = 'true';
      button.addEventListener('click', () => {
        const gallery = button.closest('[data-hp-gallery]');
        const image = gallery?.querySelector('[data-hp-main-image]');
        if (!image) return;
        const url = new URL(button.dataset.src || '', location.origin);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
        image.src = url.href;
        image.removeAttribute('srcset');
        image.alt = button.dataset.alt || '';
        gallery.querySelectorAll('[data-hp-thumbnail]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      });
    });
    root.querySelectorAll('[data-hp-preview-form]').forEach((form) => {
      if (form.dataset.ready) return;
      form.dataset.ready = 'true';
      form.addEventListener('submit', (event) => event.preventDefault());
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  else init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
