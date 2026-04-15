import { css } from 'lit';

/** Shared CSS for minigame editors and form-heavy components */
export const editorStyles = css`
  :host { display: block; }

  .section {
    margin-bottom: 1.5rem;
  }

  h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .help-text {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    margin: 0 0 0.75rem;
  }

  .form-group {
    margin-bottom: 0.75rem;
  }

  .form-group label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
  }

  .form-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .form-row .form-group {
    flex: 1;
    min-width: 150px;
  }

  .form-input {
    width: 100%;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--border-primary, #e5e7eb);
    border-radius: var(--radius-sm, 6px);
    font-size: 0.85rem;
    font-family: inherit;
    background: var(--bg-primary, #fff);
    color: var(--text-primary, #111827);
    transition: border-color var(--transition-fast, 0.15s ease);
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary, #6366f1);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary, #6366f1) 20%, transparent);
  }

  select.form-input {
    cursor: pointer;
  }

  textarea.form-input {
    resize: vertical;
    min-height: 60px;
  }

  .empty-state {
    text-align: center;
    padding: 1.5rem;
    color: var(--text-tertiary);
    font-size: 0.85rem;
    font-style: italic;
    border: 1px dashed var(--border-secondary, #d1d5db);
    border-radius: var(--radius, 8px);
  }

  .card {
    background: var(--bg-primary, #fff);
    border: 1px solid var(--border-primary, #e5e7eb);
    border-radius: var(--radius, 8px);
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .card-number {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-tertiary);
    min-width: 2rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.7rem;
    border: none;
    border-radius: var(--radius-sm, 6px);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition-fast, 0.15s ease);
  }

  .btn:focus-visible {
    outline: 2px solid var(--primary, #6366f1);
    outline-offset: 2px;
  }

  .btn-primary {
    background: var(--primary, #6366f1);
    color: white;
  }
  .btn-primary:hover { background: var(--primary-dark, #4f46e5); }

  .btn-danger {
    background: var(--error, #ef4444);
    color: white;
  }
  .btn-danger:hover { filter: brightness(0.9); }

  .btn-ghost {
    background: none;
    color: var(--text-tertiary);
    border: 1px solid var(--border-primary, #e5e7eb);
  }
  .btn-ghost:hover { background: var(--bg-tertiary, #f3f4f6); }

  .btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.2rem;
    font-size: 0.85rem;
    color: var(--text-tertiary);
    border-radius: 4px;
  }
  .btn-icon:hover { background: var(--bg-tertiary, #f3f4f6); }

  .actions-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    text-transform: uppercase;
  }

  .badge-shootable {
    background: #fff7ed;
    color: #c2410c;
    border: 1px solid #fed7aa;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  @media (max-width: 768px) {
    .grid-2 { grid-template-columns: 1fr; }
    .form-row { flex-direction: column; }
  }
`;
