#!/usr/bin/env node
const fs = require('fs')
const moment = require('moment')
const ArgumentParser = require('argparse').ArgumentParser
const nodemailer = require("nodemailer")
const yaml = require('js-yaml')

const loadDatabase = require('./src/loadDatabase.js')
const compileText = require('./src/compileText.js')

let events
let entities

const parser = new ArgumentParser({
  add_help: true,
  description: 'Liest einen Gramps-XML Export und kreiert einen Text mit den nächsten Jahrestagen'
})

parser.add_argument('file', {
  help: 'Pfad einer gramps Datei',
})

parser.add_argument('-c', '--config', {
  help: 'Config-File',
  default: 'config.yaml'
})

const args = parser.parse_args()

const config = yaml.load(fs.readFileSync('config.yaml'))

config.default = {
  days: 14,
  language: 'en',
  events: 'Birth,Death,Marriage',
  ...(config.default ?? {})
}

// Create a transporter using SMTP
const transporter = nodemailer.createTransport(config.smtp)

loadDatabase (args.file, (err, data) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  config.mails.forEach(mail => {
    const mailConfig = { ...config.default ?? {}, ...mail }
    run(data, mailConfig)
  })
})

function run (data, mailConfig) {
  compileText (data, mailConfig, (err, text) => {
    if (err) { return console.error(err) }

    if (config.smtp.signature) {
      text += '-- \n' + config.smtp.signature
    }

    transporter.sendMail({
      from: config.smtp.from, // sender address
      to: mailConfig.to, // list of recipients
      subject: "Kommende Jahrestage", // subject line
      text
    }, (err) => console.error(err));
  })
}
