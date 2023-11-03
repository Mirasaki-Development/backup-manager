import { type CreateBackupTypes } from './backups'
import { type ProxyOptions, type RemoteHostOptions } from './connect'

// [DEV] - Mark all config as optional and validate

export interface ClientConfig {
  remote: RemoteHostOptions
  username: string
  password?: string
  'private-key'?: string
  passphrase?: string
  'ssh-auth-sock'?: string
  proxy: ProxyOptions
  'create-backups': CreateBackupConfig[]
}

export interface CreateBackupConfig {
  type?: keyof typeof CreateBackupTypes
  'desktop-notifications'?: boolean
  enabled?: boolean
  origin?: string
  destination?: string
  compress?: boolean
  interval?: number
  'keep-latest'?: number
}

export interface CreateEntriesBackupConfig extends CreateBackupConfig {
  entries?: string[]
}
