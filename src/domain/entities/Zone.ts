export interface ZoneProps {
  id: string;
  name: string;
  width: number;
  height: number;
  isDefault: boolean;
  createdAt: number;
}

export class Zone {
  public readonly id: string;
  public name: string;
  public width: number;
  public height: number;
  public isDefault: boolean;
  public readonly createdAt: number;

  constructor(props: ZoneProps) {
    this.id = props.id;
    this.name = props.name;
    this.width = props.width;
    this.height = props.height;
    this.isDefault = props.isDefault;
    this.createdAt = props.createdAt;
  }
}
