import { type ConnectOptions } from 'ssh2-sftp-client'
import { resolveConnectOptions } from './connect'
import { type ClientConfig } from '../../types/config'
import { AuthType } from '../../types/connect'
import { type Tasks, type ClientOptions } from '../../types/client'
// import { initializeCreateBackupTasks } from '..'
import SFTPClient from 'ssh2-sftp-client'
import { type CreateBackupTask } from '../Backups/CreateBackupTask'
import { existsSync, mkdirSync } from 'fs'
import { SocksClient, type SocksClientOptions } from 'socks'

export class Client {
  options: Partial<ClientOptions>
  connected = false
  connectOptions: ConnectOptions
  proxyOptions: SocksClientOptions | null | undefined
  authType: AuthType
  tasks: Tasks = {
    create: []
  }

  constructor (options: ClientConfig & Partial<ClientOptions>) {
    this.options = options
    const { connection, proxy } = resolveConnectOptions(options)
    this.connectOptions = connection
    this.proxyOptions = proxy
    this.authType = (this.connectOptions.password == null)
      ? AuthType.PUBLICKEY
      : AuthType.PASSWORD

    // Make sure our inner backup folder exists
    if (!existsSync('./backups')) mkdirSync('./backups')

    // Connect to SFTP client (ssh)
    // This just tests the connection to make sure we can access remote\
    // SFTP client connection shouldn't be re-used,
    // source: https://www.npmjs.com/package/ssh2-sftp-client#orge15889c
    // void this.connect(
    //   null,
    //   () => {
    //     if (typeof this.options.onConnect === 'function') void this.options.onConnect(this.connectOptions)
    //   },
    //   (err) => {
    //     if (typeof this.options.onRefuse === 'function') void this.options.onRefuse(err, this.connectOptions)
    //   }
    // )
  }

  async connect (
    task: CreateBackupTask | null,
    onConnect: (sftpClient: SFTPClient, task: CreateBackupTask | null) => any | Promise<any>,
    onRefuse: (err: Error, task: CreateBackupTask | null) => any | Promise<any> = (err) => {
      console.error('Error encountered while connecting to remote:')
      console.error(err)
      console.error('Can\'t continue, exiting...')
      process.exit(1)
    }
  ): Promise<any> {
    if (task != null) console.info(`${task.identifier} Creating SFTP connection...`)

    // Connect to SOCKS proxy
    if (this.proxyOptions != null) {
      try {
        const { socket } = await SocksClient.createConnection(this.proxyOptions)
        this.connectOptions.sock = socket
      } catch (err) {
        console.error(`Error encountered while connecting to SOCKSv${this.proxyOptions.proxy.type}:`)
        console.error(err)
      }
    }

    // Override host/port if task has remote options
    if ((task?.server) != null) {
      const { server } = task
      this.connectOptions.host = server.remote.host
      this.connectOptions.port = server.remote.port
      this.connectOptions.username = server.username
      if (server.password != null) this.connectOptions.password = server.password
      if (server['private-key'] != null) this.connectOptions.privateKey = server['private-key']
      if (server.passphrase != null) this.connectOptions.passphrase = server.passphrase
      if (server['ssh-auth-sock'] != null) this.connectOptions.agent = server['ssh-auth-sock']
    }

    const sftpClient = new SFTPClient()
    try {
      await sftpClient.connect(this.connectOptions)
      if (task != null) console.info(`${task.identifier} SFTP connection established`)
      this.connected = true
      await onConnect(sftpClient, task)
      return true
    } catch (err: unknown) {
      if (task != null) console.error(`${task.identifier} SFTP connection couldn't be established`)
      if (typeof onRefuse === 'function') await onRefuse(err as Error, task)
      return false
    } finally {
      if (task != null) console.info(`${task.identifier} Closing/ending SFTP connection...`)
      await sftpClient.end()
      if (task != null) console.info(`${task.identifier} SFTP connection closed`)
      this.connected = false
    }
  }
}
