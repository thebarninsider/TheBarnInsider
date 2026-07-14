import { X } from 'lucide-react';

export default function Modal({ open, title, children, onClose, footer, danger = false }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-card ${danger ? 'modal-danger' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}
