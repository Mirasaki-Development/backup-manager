import { type ConnectOptions } from 'ssh2-sftp-client'
import { type CreateBackupTask } from '../lib/Backups/CreateBackupTask'

export interface ClientOptions {
  connectOptions: ConnectOptions
  onConnect?: (connectOptions: ConnectOptions) => void | Promise<void>
  onRefuse?: (err: Error, connectOptions: ConnectOptions) => void | Promise<void>
  onInitialize?: (tasks: Tasks) => void | Promise<void>
}

export interface Tasks {
  create: CreateBackupTask[]
}
