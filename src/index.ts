import yaml from 'js-yaml'
import { existsSync, readFileSync } from 'fs'

// Initialize SSH2 SFTP client
import { Client, initializeCreateBackupTasks } from './lib'
import { type ClientConfig } from './types/config'
import { AuthType } from './types/connect'

// Licensing print / vanity
console.info('Backup Manager, seamlessly create, manage and deploy backups remotely\nCopyright (C) 2023 Richard Hillebrand (Mirasaki)')

// Make sure we have a config file
const configFilePath = './config/config.yaml'
if (!existsSync(configFilePath)) {
  throw Error('Config file at config/config.yaml not found, exiting...')
}

// Resolve YAML configuration
let config: ClientConfig
try {
  const configFileContent = readFileSync(configFilePath, 'utf-8')
  config = yaml.load(configFileContent) as ClientConfig
  console.log(config)
} catch (err) {
  console.error(`Error encountered while reading config file (${configFilePath}):`)
  console.error(err)
  process.exit(1)
}

const client = new Client({
  ...config,
  onConnect: () => {
    console.info(`Connected to remote ${config.remote.host}:${config.remote.port} through method: ${AuthType[client.authType]}`)
  },
  onRefuse: (err) => {
    console.error('Error encountered while connecting to remote:')
    console.error(err)
    console.error('Can\'t continue, exiting...')
    process.exit(1)
  },
  onInitialize: (tasks) => {
    console.info(`Initialized ${tasks.create.length} create-backup tasks`)
  }
})

void (async () => {
  await initializeCreateBackupTasks(client, config['create-backups'])
})()

// setInterval(() => {
//   const sftp = new SFTPClient()
//   sftp.connect(resolveConnectOptions(config)).then(async () => {
//     return await sftp.list('/home/mirasaki')
//   }).then(data => {
//     console.info(data[0], 'the data info')
//   }).catch(err => {
//     console.error(err, 'catch error')
//   }).then(async () => {
//     await sftp.end()
//   }).catch(err => {
//     console.error(err, 'catch error')
//   })
// }, 5000)
