import { describe, it, expect } from 'vitest';
import { Zone } from '../../src/domain/entities/Zone.js';
import { RestaurantTable } from '../../src/domain/entities/Table.js';
import { TableSession } from '../../src/domain/entities/TableSession.js';
import { WaiterCall } from '../../src/domain/entities/WaiterCall.js';
import { Reservation } from '../../src/domain/entities/Reservation.js';

describe('Domain Entities', () => {
  it('should create and validate a Zone entity', () => {
    const zone = new Zone({
      id: 'z-1',
      name: 'Terraza VIP',
      width: 1600,
      height: 1000,
      isDefault: true,
      createdAt: 1727189500000,
    });

    expect(zone.id).toBe('z-1');
    expect(zone.name).toBe('Terraza VIP');
    expect(zone.isDefault).toBe(true);
  });

  it('should create and validate a RestaurantTable entity', () => {
    const table = new RestaurantTable({
      id: 't-1',
      zoneId: 'z-1',
      name: 'Mesa 1',
      shape: 'round',
      x: 100,
      y: 150,
      width: 80,
      height: 80,
      rotation: 0,
      seats: 4,
      status: 'available',
      updatedAt: 1727189500000,
    });

    expect(table.name).toBe('Mesa 1');
    expect(table.isOccupied()).toBe(false);

    table.markOccupied();
    expect(table.isOccupied()).toBe(true);
    expect(table.status).toBe('occupied');

    table.markAvailable();
    expect(table.isOccupied()).toBe(false);
    expect(table.status).toBe('available');
  });

  it('should create and validate a TableSession entity', () => {
    const session = new TableSession({
      id: 's-1',
      tableId: 't-1',
      sessionWord: 'MOJITO-24',
      status: 'active',
      openedAt: 1727189500000,
      closedAt: null,
    });

    expect(session.sessionWord).toBe('MOJITO-24');
    expect(session.isActive()).toBe(true);

    session.close(1727189600000);
    expect(session.isActive()).toBe(false);
    expect(session.status).toBe('closed');
    expect(session.closedAt).toBe(1727189600000);
  });

  it('should create and validate a WaiterCall entity and transitions', () => {
    const call = new WaiterCall({
      id: 'c-1',
      tableId: 't-1',
      sessionId: 's-1',
      tableName: 'Mesa 1',
      sessionWord: 'MOJITO-24',
      reason: 'waiter',
      status: 'pending',
      createdAt: 1727189500000,
    });

    expect(call.isPending()).toBe(true);

    call.attend(1727189550000);
    expect(call.status).toBe('attending');
    expect(call.attendingAt).toBe(1727189550000);

    call.resolve(1727189600000);
    expect(call.status).toBe('resolved');
    expect(call.resolvedAt).toBe(1727189600000);
  });

  it('should create and validate a Reservation entity', () => {
    const res = new Reservation({
      id: 'r-1',
      tableId: 't-1',
      customerName: 'Carlos Gómez',
      customerPhone: '+57 300 123 4567',
      customerEmail: 'carlos@example.com',
      date: '2026-09-24',
      time: '20:00',
      pax: 4,
      notes: 'Celebración cumpleaños',
      status: 'confirmed',
      createdAt: 1727189500000,
    });

    expect(res.customerName).toBe('Carlos Gómez');
    expect(res.pax).toBe(4);
    expect(res.status).toBe('confirmed');
  });
});
