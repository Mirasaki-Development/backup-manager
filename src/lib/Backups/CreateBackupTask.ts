import { CreateBackupTypes } from '../../types/backups'
import { type CreateBackupConfig } from '../../types/config'
import { MS_IN_ONE_SECOND, SECONDS_IN_ONE_MINUTE } from '../../magic-number'
import { allCreateBackupTypes, CreateBackupTaskError, type Client } from '..'
import { createWriteStream, readdirSync, rmSync, rmdirSync, statSync } from 'fs'
import notifier from 'node-notifier'
import tar from 'tar'
import path from 'path'
import { getEmptyFolders, goOneDirectoryUp, msToHumanReadableTime, sortFilesByCreationTime } from '../../util'

// Inner scoped variable
let _createBackupTaskIndex = 0

export class CreateBackupTask {
  readonly index = _createBackupTaskIndex++
  sendNotifications: boolean
  identifier = `[task #${this.index + 1}]`
  client: Client
  enabled: boolean = true
  type: CreateBackupTypes
  origin: string
  destination: string
  compress: boolean
  interval: number
  keepLatest: number
  runs = 0

  private _timerStart: number | null = null
  get timerStart (): number | null {
    return this._timerStart
  }

  private _timer: NodeJS.Timer | null = null
  get timer (): NodeJS.Timer | null {
    return this._timer
  }

  private _nextRun: number | null = null
  get nextRun (): number | null {
    return this._nextRun
  }

  constructor (client: Client, config: CreateBackupConfig) {
    this.client = client
    this.enabled = config.enabled ?? true

    // Validate required
    if (
      config.type == null ||
      !allCreateBackupTypes.includes(config.type)
    ) throw new CreateBackupTaskError(this, `parameter 'type' to be a valid CreateBackupTypes\nExpected: ${allCreateBackupTypes.join(', ')}\nReceived: ${config.type ?? '<none>'}`)
    if (typeof config.origin !== 'string') throw new CreateBackupTaskError(this, 'parameter \'origin\' to be of type string')
    if (typeof config.destination !== 'string') throw new CreateBackupTaskError(this, 'parameter \'destination\' to be of type string')

    // Set after validation
    this.type = CreateBackupTypes[config.type]
    this.origin = config.origin
    this.destination = config.destination.startsWith('/')
      ? config.destination
      : './' + config.destination

    // Check destination already exists
    if (client.tasks.create.find((e) => e.destination === this.destination) != null) {
      throw new CreateBackupTaskError(this, 'parameter \'destination\' to be unique. A unique destination is required for every task')
    }

    // Validate optional types
    if ((config.compress != null) && typeof config.compress !== 'boolean') throw new CreateBackupTaskError(this, 'parameter \'compress\' to be of type boolean')
    if ((config.interval != null) && typeof config.interval !== 'number') throw new CreateBackupTaskError(this, 'parameter \'interval\' to be of type number')
    if ((config['keep-latest'] != null) && typeof config['keep-latest'] !== 'number') throw new CreateBackupTaskError(this, 'parameter \'keep-latest\' to be of type number')

    // Optionals
    this.compress = config.compress ?? true
    this.interval = (config.interval ?? 3600) * MS_IN_ONE_SECOND * SECONDS_IN_ONE_MINUTE
    this.keepLatest = config['keep-latest'] ?? 5
    this.sendNotifications = config['desktop-notifications'] ?? true

    // Always save in client tasks
    client.tasks.create.push(this)
  }

  /** Schedules this task */
  async schedule (runFn: () => Promise<any>): Promise<void> {
    if (!this.enabled) return
    this._timerStart = Date.now()

    const executeRunFn = async (schedule: boolean = true): Promise<void> => {
      if (this.sendNotifications) {
        notifier.notify({
          title: 'Backup Manager',
          message: `${this.identifier} Starting backup task #${this.index + 1} - ${this.type}\n\nOrigin: ${this.origin}\nDestination: ${this.destination}`,
          sound: true,
          wait: true
        })
      }

      try {
        await runFn()
        this.runs++
        this._nextRun = Date.now() + this.interval
        console.info(
          `${this.identifier} Finished run #${this.runs} - next run in ${msToHumanReadableTime(
            (this.nextRun as number) - Date.now()
          )}`
        )
        if (this.sendNotifications) {
          notifier.notify({
            title: 'Backup Manager',
            message: `${this.identifier} Finished backup task #${this.index + 1} - ${this.type}\n\nOrigin: ${this.origin}\nDestination: ${this.destination}`,
            sound: true,
            wait: false
          })
        }
        if (schedule) {
          setTimeout(() => {
            void executeRunFn()
          }, this.interval)
        }
      } catch (err) {
        console.error(err)
      }
    }

    // Initial run
    await executeRunFn(false)

    // Schedule subsequent runs
    this._timer = setTimeout(() => {
      void executeRunFn()
    }, this.interval)
  }

  keepLatestBackups (): number {
    const allFiles = readdirSync(this.destination)
      // Keep only relevant files
      .filter((e) => this.compress ? e.endsWith('.tgz') : !e.endsWith('.tgz'))
      .map((e) => path.join(this.destination, e))
    let deletedCount = 0
    if (allFiles.length > this.keepLatest) {
      const allFileStats = allFiles
        .map((e) => statSync(e))

      const sortedFiles = sortFilesByCreationTime(allFiles)
      for (const filePath of sortedFiles.slice(this.keepLatest - 1, allFileStats.length)) {
        rmSync(filePath, { recursive: true })
      }

      deletedCount = sortedFiles.length - this.keepLatest
    }
    if (this.sendNotifications && deletedCount > 0) {
      notifier.notify({
        title: 'Backup Manager',
        message: `${this.identifier} Deleted/cleaned ${deletedCount} old backup(s)`,
        sound: true,
        wait: false
      })
    }
    return deletedCount
  }

  /**
   * When process is stopped in the middle of `#compressLocalBackup`,
   * there will be folders (empty or otherwise) in the destination
   * which aren't compressed, when the process wasn't able to delete
   * the origin folder
   */
  cleanBackupFiles = (targetPath: string): void => {
    const emptyFolderPaths = getEmptyFolders(targetPath)
    if (emptyFolderPaths.length >= 1) {
      console.info(`${this.identifier} Found a total of ${emptyFolderPaths.length} empty folders that weren't properly removed. This can happen when the application goes offline in the middle of a task. Cleaning up...`)
      emptyFolderPaths.forEach((targetPath) => {
        console.info(`${this.identifier} Removing empty directory ${targetPath}`)
        rmdirSync(targetPath)
      })
      console.info(`${this.identifier} Finished empty folder cleanup`)
    }
  }

  /**
   * Compresses destination files into a `gzip` compressed file
   */
  compressLocalBackup = async (targetPath: string): Promise<void> => {
    console.info(`${this.identifier} compressing ${targetPath} to ${targetPath}.tgz`)

    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(`${targetPath}.tgz`)

      writeStream.on('close', () => {
        console.info(`${this.identifier} finished compressing`)
        console.info(`${this.identifier} deleting original @ ${targetPath}...`)
        rmSync(targetPath, { recursive: true })
        console.info(`${this.identifier} deleted ${targetPath}`)
        this.cleanBackupFiles(goOneDirectoryUp(targetPath))
        resolve()
      })

      writeStream.on('error', (error) => {
        reject(error)
      })

      tar.c({ gzip: true, cwd: targetPath }, ['.']).pipe(writeStream)
    })

    if (this.sendNotifications) {
      notifier.notify({
        title: 'Backup Manager',
        message: `${this.identifier} Finished compressing backup`,
        sound: true,
        wait: false
      })
    }
  }

  // Local
  dateName = (): string => {
    const date = new Date()
    const dateNum = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${dateNum}-${hours}-${minutes}-${seconds}`
  }
}
