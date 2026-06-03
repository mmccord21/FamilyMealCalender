import styles from './loading.module.css'

export default function Loading() {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>
        <svg width="72" height="72" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="115" fill="#2C1810" />
          <g fill="#C4956A">
            <rect x="211" y="110" width="20" height="122" rx="10" />
            <rect x="246" y="110" width="20" height="122" rx="10" />
            <rect x="281" y="110" width="20" height="122" rx="10" />
            <rect x="211" y="216" width="90" height="26" rx="4" />
            <rect x="246" y="216" width="20" height="192" rx="10" />
          </g>
        </svg>
      </div>
      <p className={styles.title}>Family Meal Planner</p>
      <p className={styles.sub}>Loading your week…</p>
      <div className={styles.dots}>
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
