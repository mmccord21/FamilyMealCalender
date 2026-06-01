'use client';
import styles from './Toast.module.css';

interface Props {
  message: string;
  visible: boolean;
  action?: { label: string; onClick: () => void };
}

export default function Toast({ message, visible, action }: Props) {
  return (
    <div className={`${styles.toast} ${visible ? styles.show : ''} ${action ? styles.interactive : ''}`}>
      <span>{message}</span>
      {action && (
        <button className={styles.undoBtn} onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}
