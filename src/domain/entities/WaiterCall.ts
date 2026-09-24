export type CallReason = 'waiter' | 'bill' | 'help';
export type CallStatus = 'pending' | 'attending' | 'resolved' | 'cancelled';

export interface WaiterCallProps {
  id: string;
  tenantId?: string;
  tableId: string;
  sessionId: string;
  tableName: string;
  sessionWord: string;
  reason: CallReason;
  status: CallStatus;
  createdAt: number;
  attendingAt?: number | null;
  resolvedAt?: number | null;
}

export class WaiterCall {
  public readonly id: string;
  public tenantId: string;
  public readonly tableId: string;
  public readonly sessionId: string;
  public readonly tableName: string;
  public readonly sessionWord: string;
  public readonly reason: CallReason;
  public status: CallStatus;
  public readonly createdAt: number;
  public attendingAt: number | null;
  public resolvedAt: number | null;

  constructor(props: WaiterCallProps) {
    this.id = props.id;
    this.tenantId = props.tenantId ?? 'default';
    this.tableId = props.tableId;
    this.sessionId = props.sessionId;
    this.tableName = props.tableName;
    this.sessionWord = props.sessionWord;
    this.reason = props.reason;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.attendingAt = props.attendingAt ?? null;
    this.resolvedAt = props.resolvedAt ?? null;
  }

  public isPending(): boolean {
    return this.status === 'pending';
  }

  public attend(timestamp: number = Date.now()): void {
    this.status = 'attending';
    this.attendingAt = timestamp;
  }

  public resolve(timestamp: number = Date.now()): void {
    this.status = 'resolved';
    this.resolvedAt = timestamp;
  }

  public cancel(): void {
    this.status = 'cancelled';
  }
}
