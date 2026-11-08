import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import { DeliveriesOutboxEvent } from '../../domain/drivers/deliveries/deliveries-outbox-event';
import { DeliveryEventKind } from '../../domain/drivers/deliveries/delivery-event-kind';
import { toDeliveryEventId } from '../../domain/drivers/deliveries/delivery-event-id';
import { toOrderDeliveryId } from '../../domain/drivers/deliveries/order-delivery';
import { toOrderId } from '../../domain/orders/order';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { scheduleScenario } from '../../application-core/scenarios/schedule-scenario';
import type { WallClock } from '../../application-core/simulation-engine/wall-clock';
import { LiveScenarioRun } from './live-scenario-run';
import { withDeliveries } from '../../application-core/simulation-engine/main-root';
import type { IScenario } from '../../application-core/scenarios/scenario';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toDeliveriesOutboxEventId } from '../../domain/drivers/deliveries/deliveries-outbox-event';

/**
 * A live run with a bug: the deliveries outbox holds an event for an order orders has no copy for,
 * which the first read trips on.
 */
export function liveRunWithABug(scenario: IScenario, wall: WallClock): LiveScenarioRun {
    const run = createRun({ seed: scenario.seed });
    const start = scheduleScenario(run, scenario.start, scenario.steps);
    const bad = DeliveriesOutboxEvent.create({
        id: toDeliveriesOutboxEventId('bad'),
        eventId: toDeliveryEventId('bad'),
        orderDeliveryId: toOrderDeliveryId('bad'),
        orderId: toOrderId('nope'),
        kind: DeliveryEventKind.OrderReady,
        at: toSimTime(0),
        driverId: null,
        wasStartedByDeliveries: false,
    });
    const { deliveries } = start.root.state;
    const outbox = deliveries.outbox.push(bad);
    const withBad = DeliveriesState.create({
        deliveries: deliveries.deliveries,
        deliveryVersions: deliveries.deliveryVersions,
        eventsByOrder: deliveries.eventsByOrder,
        ordersEventLinks: deliveries.ordersEventLinks,
        outbox,
        inbox: deliveries.inbox,
        inboxPosition: deliveries.inboxPosition,
        notificationsByOrder: deliveries.notificationsByOrder,
        notificationVersions: deliveries.notificationVersions,
        nextDelivery: deliveries.nextDelivery,
    });
    return new LiveScenarioRun(scenario, wall, {
        ...start,
        root: withDeliveries(start.root, withBad),
    });
}
