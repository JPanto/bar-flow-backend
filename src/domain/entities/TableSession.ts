export type SessionStatus = 'active' | 'closed';

export interface TableSessionProps {
  id: string;
  tenantId?: string;
  tableId: string;
  sessionWord: string;
  status: SessionStatus;
  openedAt: number;
  closedAt?: number | null;
}

export class TableSession {
  public readonly id: string;
  public tenantId: string;
  public readonly tableId: string;
  public readonly sessionWord: string;
  public status: SessionStatus;
  public readonly openedAt: number;
  public closedAt: number | null;

  constructor(props: TableSessionProps) {
    this.id = props.id;
    this.tenantId = props.tenantId ?? 'default';
    this.tableId = props.tableId;
    this.sessionWord = props.sessionWord;
    this.status = props.status;
    this.openedAt = props.openedAt;
    this.closedAt = props.closedAt ?? null;
  }

  public isActive(): boolean {
    return this.status === 'active';
  }

  public close(timestamp: number = Date.now()): void {
    this.status = 'closed';
    this.closedAt = timestamp;
  }
}
