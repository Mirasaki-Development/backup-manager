import { CreateBackupTypes } from '../../types/backups'
import { type CreateBackupConfig } from '../../types/config'
import { type Client } from '..'
import { CreateBackupTask } from './CreateBackupTask'
import { CreateDirectoryBackupTask } from './CreateDirectoryBackupTask'
import { wait } from '../../util'
import { CreateEntriesBackupTask } from './CreateEntriesBackupTask'

export const allCreateBackupTypes = Object.values(CreateBackupTypes).filter((e) => typeof e === 'string')

export class CreateBackupTaskError extends Error {
  constructor (task: CreateBackupTask, msg: string) {
    super(`Expected create-backup task #${task.index + 1} ` + msg)
  }
}

export const initializeCreateBackupTasks = async (client: Client, tasks: CreateBackupConfig[]): Promise<CreateBackupTask[]> => {
  const activeTasks: CreateBackupTask[] = []
  for await (const taskCfg of tasks) {
    let task
    const type = CreateBackupTypes[taskCfg.type ?? 'Directory']

    if (type === CreateBackupTypes.Directory) {
      task = new CreateDirectoryBackupTask(client, taskCfg)
      await task.schedule(task.run)
    } else if (type === CreateBackupTypes.Entries) {
      task = new CreateEntriesBackupTask(client, taskCfg)
      await task.schedule(task.run)
    } else {
      task = new CreateBackupTask(client, taskCfg)
    }

    // Remote server drops connections with only an end event
    // Source: https://www.npmjs.com/package/ssh2-sftp-client#orge3e4159
    await wait(350)
  }
  return activeTasks
}
