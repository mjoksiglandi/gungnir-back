import { CommandsService } from './services/commands.service';

describe('CommandsService', () => {
  it('updates command status from MQTT response', async () => {
    const commandsRepository = {
      updateFromResponse: jest.fn().mockResolvedValue('completed'),
    };
    const eventEmitter = { emit: jest.fn() };
    const mqttService = { publishJson: jest.fn() };

    const service = new CommandsService(
      commandsRepository as never,
      eventEmitter as never,
      mqttService as never,
    );
    await service.handleCommandResponse({
      commandId: 'command-123',
      status: 'completed',
      response: { ack: true },
    });

    expect(commandsRepository.updateFromResponse).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalled();
  });
});
