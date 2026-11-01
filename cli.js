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

parser.add_argument('-d', '--days', {
  help: 'Liste Jahrestage in den nächsten n Tagen',
  default: 14
})

parser.add_argument('-e', '--events', {
  help: 'Liste nur die angegebenen Event-Typen (engl. Original-Werte; komma-separiert). Leerer String für alle Events.',
  default: 'Birth,Death,Marriage'
})

parser.add_argument('-l', '--language', {
  help: 'Sprache (Kürzel, z.B. "de")',
  default: 'en'
})

parser.add_argument('--today', {
  help: 'Setze einen alternativen Ausgangs-Tag',
  default: 'today'
})

const args = parser.parse_args()

const showOnlyEventTypes = args.events ? args.events.split(',') : null

const config = yaml.load(fs.readFileSync('config.yaml'))

config.default = {
  days: args.days,
  language: args.language,
  events: showOnlyEventTypes
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

    transporter.sendMail({
      from: config.smtp.from, // sender address
      to: mailConfig.to, // list of recipients
      subject: "Kommende Jahrestage", // subject line
      text
    }, (err) => console.error(err));
  })
}
