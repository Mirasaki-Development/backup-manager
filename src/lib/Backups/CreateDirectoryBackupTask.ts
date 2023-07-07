import { existsSync, mkdirSync } from 'fs'
import { CreateBackupTask } from './CreateBackupTask'

export class CreateDirectoryBackupTask extends CreateBackupTask {
  run = async (): Promise<boolean> => {
    if (!existsSync(this.destination)) mkdirSync(this.destination, { recursive: true })
    const dirPath = this.destination + `/${this.dateName()}`
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })

    return await this.client.connect(
      this,
      async (sftpClient) => {
        console.info(`${this.identifier} downloading remote ${this.origin}`)
        try {
          const res = await sftpClient.downloadDir(this.origin, dirPath)
          if (this.compress) await this.compressLocalBackup(dirPath)
          if (this.keepLatest > 0) this.keepLatestBackups()
          return res
        } catch (err) {
          console.error('Error encountered while performing CreateDirectoryBackupTask:')
          console.error(err)
          return false
        }
      })
  }
}
