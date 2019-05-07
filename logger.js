const { format, createLogger, transports } = require('winston')

const logger = createLogger({
  level: 'info',
  format: format.simple(),
  transports: [
    new transports.File({ filename: 'logger.log' })
  ]
})

exports.logger = logger
