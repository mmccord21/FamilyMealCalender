import styles from './Toast.module.css';

interface Props {
  message: string;
  visible: boolean;
}

export default function Toast({ message, visible }: Props) {
  return (
    <div className={`${styles.toast} ${visible ? styles.show : ''}`}>
      {message}
    </div>
  );
}
