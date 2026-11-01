#!/usr/bin/env node
const fs = require('fs')
const moment = require('moment')
const ArgumentParser = require('argparse').ArgumentParser
const nodemailer = require("nodemailer")
const yaml = require('js-yaml')

const loadDatabase = require('./src/loadDatabase.js')

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

const daysInFuture = args.days
const showOnlyEventTypes = args.events ? args.events.split(',') : null
const translation = JSON.parse(fs.readFileSync('lang/' + args.language + '.json'))
moment.locale(args.language)
const today = args.today === 'today' ? moment(moment().format('YYYY-MM-DD')) : moment(args.today)

const year = parseInt(moment(today).format('YYYY'))
const years = [year]
for (i = 0; i < Math.ceil(daysInFuture / 365); i++) {
  years.push(year + i + 1)
}

const config = yaml.load(fs.readFileSync('config.yaml'))

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
  events = data.events
  entities = data.entities
  const upcoming = []

  Object.values(events).forEach(event => {
    if (!event.date || event.date.length < 10) {
      return
    }

    const days = years.map(y => {
      const n = moment(y + event.date.substr(4))
      const days = n.diff(today, 'days')

      if (days < 0 || days >= daysInFuture) {
        return
      }

      const anniversary = y - event.date.substr(0, 4)

      if (!upcoming[days]) {
        upcoming[days] = []
      }

      const entities = getEventEntities(event.handle)
      entities.forEach(person => {
        upcoming[days].push({
          entity: person,
          event,
          anniversary
        })
      })
    })
  })

  let text = ''
  upcoming.forEach((list, days) => {
    if (!list || !list.length) {
      return
    }

    const date = moment(today).add(days, 'days')

    let in_days = translation['in_days'].replace('%', days)
    if (translation['in_' + days + '_days']) {
      in_days = translation['in_' + days + '_days']
    }

    text += date.format('LL') + ' (' + in_days + ')\n'
    list.forEach(item => {
      let age = translation['age'].replace('%', item.anniversary)
      if (translation['age_' + item.anniversary]) {
        age = translation['age_' + item.anniversary]
      }

      text += '- ' + item.entity.name + ' (' + (translation[item.event.type] ?? item.event.type) + ', ' + age + ')\n'
    })

    text += '\n'
  })

  transporter.sendMail({
    from: config.smtp.from, // sender address
    to: mailConfig.to, // list of recipients
    subject: "Kommende Jahrestage", // subject line
    text
  }, (err) => console.error(err));
}

function getEventEntities (eventHandle) {
  return Object.values(entities).filter(person => person.events.includes(eventHandle))
}
