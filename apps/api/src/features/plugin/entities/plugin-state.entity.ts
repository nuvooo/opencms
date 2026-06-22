import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Persisted enabled/disabled state for a plugin, keyed by its manifest id.
 *
 * The in-memory plugin registry is rebuilt from disk on every boot/rescan, so
 * the admin's enable/disable choices must be stored separately to survive
 * restarts. Absence of a row means "enabled" (the default).
 */
@Entity({ schema: 'public', name: 'plugin_state' })
export class PluginState {
  @PrimaryColumn({ name: 'plugin_id', type: 'varchar', length: 100 })
  pluginId: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
