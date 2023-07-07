import winston from 'winston'
import WinstonRotator from 'winston-daily-rotate-file'

const sftpLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: []
})

sftpLogger.add(new WinstonRotator({
  level: 'debug',
  filename: './logs/sftp.log',
  json: false,
  maxFiles: '4',
  maxSize: '5m'
}))

export default sftpLogger
