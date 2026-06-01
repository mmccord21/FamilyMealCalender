'use client';
import styles from './Toast.module.css';

interface Props {
  message: string;
  visible: boolean;
  onUndo?: () => void;
}

export default function Toast({ message, visible, onUndo }: Props) {
  return (
    <div className={`${styles.toast} ${visible ? styles.show : ''} ${onUndo ? styles.interactive : ''}`}>
      <span>{message}</span>
      {onUndo && (
        <button className={styles.undoBtn} onClick={onUndo}>Undo</button>
      )}
    </div>
  );
}
