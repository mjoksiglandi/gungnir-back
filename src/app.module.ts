import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { DatabaseModule } from './infrastructure/database/database.module';
import { MqttModule } from './infrastructure/mqtt/mqtt.module';
import { QueueModule } from './infrastructure/queues/queue.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AtakModule } from './modules/atak/atak.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AirTrafficModule } from './modules/air-traffic/air-traffic.module';
import { CommandsModule } from './modules/commands/commands.module';
import { CopModule } from './modules/cop/cop.module';
import { CotModule } from './modules/cot/cot.module';
import { DevicesModule } from './modules/devices/devices.module';
import { ExternalSourcesModule } from './modules/external-sources/external-sources.module';
import { FireIntelModule } from './modules/fire-intel/fire-intel.module';
import { GeofencesModule } from './modules/geofences/geofences.module';
import { GuardianModule } from './modules/guardian/guardian.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { MapLayersModule } from './modules/map-layers/map-layers.module';
import { MavlinkModule } from './modules/mavlink/mavlink.module';
import { MissionsModule } from './modules/missions/missions.module';
import { NotamsModule } from './modules/notams/notams.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RolesModule } from './modules/roles/roles.module';
import { SystemHealthModule } from './modules/system-health/system-health.module';
import { TaskingModule } from './modules/tasking/tasking.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { UnitsModule } from './modules/units/units.module';
import { UsersModule } from './modules/users/users.module';
import { WeatherModule } from './modules/weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
      },
    }),
    EventEmitterModule.forRoot(),
    JwtModule.register({ global: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.getOrThrow<string>('app.REDIS_URL'),
        },
      }),
    }),
    DatabaseModule,
    QueueModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RolesModule,
    OrganizationsModule,
    UnitsModule,
    AssetsModule,
    DevicesModule,
    TrackingModule,
    TelemetryModule,
    CommandsModule,
    CopModule,
    MissionsModule,
    TaskingModule,
    IncidentsModule,
    AlertsModule,
    GeofencesModule,
    MapLayersModule,
    ExternalSourcesModule,
    FireIntelModule,
    AirTrafficModule,
    NotamsModule,
    WeatherModule,
    GuardianModule,
    MavlinkModule,
    AtakModule,
    CotModule,
    RealtimeModule,
    SystemHealthModule,
    MqttModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
