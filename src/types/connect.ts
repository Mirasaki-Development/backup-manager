export interface RemoteHostOptions {
  host: string
  port: number
}

export enum ProxyType {
  SOCKSv4 = 4,
  SOCKSv5
}

export type ProxyTypeOptions = 4 | 5

export enum ProxyCommand {
  CONNECT = 'connect',
  BIND = 'bind',
  ASSOCIATE = 'associate'
}

export type ProxyCommandOptions = 'connect' | 'bind' | 'associate'

export enum AuthType {
  PASSWORD,
  PUBLICKEY
}

export interface ProxyOptions {
  enabled: boolean
  host: string
  port: number
  type: ProxyTypeOptions
  command: ProxyCommandOptions
}
