#!/usr/bin/env node
const fs = require('fs')
const moment = require('moment')
const ArgumentParser = require('argparse').ArgumentParser
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

parser.add_argument('-s', '--select', {
  help: 'Select certain people from the database (default: all).',
  default: null
})

parser.add_argument('--today', {
  help: 'Setze einen alternativen Ausgangs-Tag',
  default: 'today'
})

const args = parser.parse_args()

mailConfig = {
  days: args.days,
  language: args.language,
  events: args.events,
  select: args.select
}

loadDatabase (args.file, (err, data) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  run(data, mailConfig)
})

function run (data, mailConfig) {
  compileText (data, mailConfig, (err, text) => {
    if (err) { return console.error(err) }

    console.log(text)
  })
}
