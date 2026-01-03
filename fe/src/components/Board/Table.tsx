import type { ReactNode } from 'react';
import styles from './Table.module.css';

interface TableProps {
  children: ReactNode;
}

export function Table({ children }: TableProps) {
  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableRail}>
        <div className={styles.tableFelt}>
          <div className={styles.feltPattern} />
          <div className={styles.centerLogo}>
            <span className={styles.logoP}>♠</span>
            <span className={styles.logoW}>W</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
