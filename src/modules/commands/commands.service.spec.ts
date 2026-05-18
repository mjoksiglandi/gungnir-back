import { CommandsService } from './commands.service';

describe('CommandsService', () => {
  it('updates command status from MQTT response', async () => {
    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where });
    const db = {
      update: jest.fn().mockReturnValue({ set }),
    };
    const eventEmitter = { emit: jest.fn() };
    const mqttService = { publishJson: jest.fn() };

    const service = new CommandsService(db as never, eventEmitter as never, mqttService as never);
    await service.handleCommandResponse({
      commandId: 'command-123',
      status: 'completed',
      response: { ack: true },
    });

    expect(db.update).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalled();
  });
});
