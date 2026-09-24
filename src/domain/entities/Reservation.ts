export type ReservationStatus = 'confirmed' | 'seated' | 'cancelled' | 'no_show' | 'completed';

export interface ReservationProps {
  id: string;
  tableId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  date: string;
  time: string;
  pax: number;
  notes?: string | null;
  status: ReservationStatus;
  createdAt: number;
}

export class Reservation {
  public readonly id: string;
  public tableId: string | null;
  public customerName: string;
  public customerPhone: string;
  public customerEmail: string | null;
  public date: string;
  public time: string;
  public pax: number;
  public notes: string | null;
  public status: ReservationStatus;
  public readonly createdAt: number;

  constructor(props: ReservationProps) {
    this.id = props.id;
    this.tableId = props.tableId ?? null;
    this.customerName = props.customerName;
    this.customerPhone = props.customerPhone;
    this.customerEmail = props.customerEmail ?? null;
    this.date = props.date;
    this.time = props.time;
    this.pax = props.pax;
    this.notes = props.notes ?? null;
    this.status = props.status;
    this.createdAt = props.createdAt;
  }
}
