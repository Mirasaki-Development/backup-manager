import { existsSync, mkdirSync } from 'fs'
import { CreateBackupTask } from './CreateBackupTask'
import type SFTPClient from 'ssh2-sftp-client'
import { type CreateEntriesBackupConfig } from '../../types/config'
import { type Client, CreateBackupTaskError } from '..'
import { type FileInfoExistsRes } from '../../types/backups'

export class CreateEntriesBackupTask extends CreateBackupTask {
  entries: string[]
  constructor (client: Client, config: CreateEntriesBackupConfig) {
    super(client, config)
    if (!Array.isArray(config.entries) || config.entries[0] == null) throw new CreateBackupTaskError(this, 'parameter \'entries\' to be of type list/array')
    this.entries = config.entries ?? []
  }

  listEntries = async (sftpClient: SFTPClient): Promise<FileInfoExistsRes[]> => {
    return await Promise.all(this.entries.map(async (e) => {
      const remotePath = this.origin + '/' + e

      // Will be false or d, -, l (dir, file or link)
      let exists
      try {
        exists = await sftpClient.exists(remotePath)
      } catch (err) {
        console.error('Error encountered while checking if file exists:')
        console.error(err)
        return false
      }

      // Warn about non-existent files only on first run
      if (this.runs === 0 && exists === false) {
        console.warn(`${this.identifier} Skipping non-existent entry: ${remotePath}`)
      }

      // Return invalid
      if (exists === false || exists === null) return false

      // Return formatted result
      return {
        type: exists,
        fileName: e,
        remotePath
      }
    }))
  }

  downloadEntries = async (sftpClient: SFTPClient, destination: string): Promise<Array<string | null>> => {
    const isWorkingFileFilter = (e: FileInfoExistsRes): boolean => (
      e !== false &&
      e.remotePath !== 'l'
      // [DEV] - Implement support for link type
    )

    // Resolve all entry info
    const allFileInfo = await this.listEntries(sftpClient)

    // Filter our current working files
    const workingFiles = allFileInfo.filter(isWorkingFileFilter)

    // Download files & directories
    const downloadAllValidEntries = await Promise.all(
      workingFiles.map(async (e) => {
        if (e === false) return null

        const localEntryPath = destination + '/' + e.fileName
        if (e.type === 'd') {
          mkdirSync(localEntryPath)
          return await sftpClient.downloadDir(e.remotePath, localEntryPath)
        } else return await sftpClient.fastGet(e.remotePath, localEntryPath)
      })
    )

    // Notify task operations
    console.info(downloadAllValidEntries.map((e) => `${this.identifier} ${e as string}`).join('\n'))

    // Always return our promise
    return downloadAllValidEntries
  }

  run = async (): Promise<boolean> => {
    if (!existsSync(this.destination)) mkdirSync(this.destination, { recursive: true })
    const dirPath = this.destination + `/${this.dateName()}`
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })

    return await this.client.connect(
      this,
      async (sftpClient) => {
        try {
          const downloadRes = await this.downloadEntries(sftpClient, dirPath)
          if (this.compress) await this.compressLocalBackup(dirPath)
          if (this.keepLatest > 0) this.keepLatestBackups()
          return downloadRes
        } catch (err) {
          console.error('Error encountered while performing CreateEntriesBackupTask:')
          console.error(err)
          return false
        }
      })
  }
}
