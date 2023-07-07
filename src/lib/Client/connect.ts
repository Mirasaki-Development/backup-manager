import { type SocksClientOptions } from 'socks'
import { type ConnectOptions } from 'ssh2-sftp-client'
import { type ClientConfig } from '../../types/config'
import sftpLogger from '../Logger'

/** Resolves all `ConnectOptions` from our client configuration file */
export const resolveConnectOptions = (config: ClientConfig): {
  connection: ConnectOptions
  proxy?: SocksClientOptions | null
} => {
  // Resolve from client config (yaml file)
  const sftpConnectOptions: ConnectOptions = {
    host: config.remote.host,
    port: config.remote.port,
    username: config.username
  }

  // Condition SFTP connection options
  if (config['private-key'] != null && config['private-key'] !== '') sftpConnectOptions.privateKey = config['private-key']
  else if (config.password != null) sftpConnectOptions.password = config.password

  if (config.passphrase != null) sftpConnectOptions.passphrase = config.passphrase
  if (config['ssh-auth-sock'] != null) sftpConnectOptions.agent = config['ssh-auth-sock']

  // Resolve proxy
  let proxyOptions: SocksClientOptions | null = null
  if (config.proxy?.enabled) {
    proxyOptions = {
      proxy: {
        host: config.proxy.host,
        port: config.proxy.port,
        type: config.proxy.type
      },
      command: config.proxy.command,
      destination: config.remote // the remote SFTP server
    }
  }

  // Register development debugger
  if (process.env['NODE_ENV'] !== 'production') {
    sftpConnectOptions.debug = sftpLogger.debug.bind(sftpLogger)
    sftpConnectOptions.keepaliveCountMax = 1
  }

  // Always return our ConnectOptions
  return {
    connection: sftpConnectOptions,
    proxy: proxyOptions
  }
}
