import styles from './Modal.module.css';

interface Props {
  open: boolean;
  onBackdropClick: () => void;
  children: React.ReactNode;
}

export default function Modal({ open, onBackdropClick, children }: Props) {
  if (!open) return null;
  return (
    <div
      className={styles.overlay}
      onClick={onBackdropClick}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
