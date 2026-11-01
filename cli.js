#!/usr/bin/env node
const fs = require('fs')
const zlib = require('zlib')
const jsdom = require("jsdom")
const { JSDOM } = jsdom
const moment = require('moment')
const ArgumentParser = require('argparse').ArgumentParser

const events = {}
const entities = {}
const upcoming = []

const parser = new ArgumentParser({
  add_help: true,
  description: 'Liest einen Gramps-XML Export und kreiert einen Text mit den nächsten Jahrestagen'
})

parser.add_argument('file', {
  help: 'Pfad einer gramps Datei',
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

fs.readFile(args.file, (err, body) => {
  body = zlib.gunzip(body, (err, body) => {
    run(body)
  })
})

function run (body) {
  const dom = new JSDOM(body.toString(), {
    contentType: 'application/xml'
  })
  const document = dom.window.document

  Array.from(document.getElementsByTagName('event')).forEach(event => {
    const type = getTextContent(event, 'type')

    if (showOnlyEventTypes && !showOnlyEventTypes.includes(type)) {
      return
    }

    events[event.getAttribute('handle')] = {
      handle: event.getAttribute('handle'),
      type,
      date: getAttribute(event, 'dateval', 'val')
    }
  })

  Array.from(document.getElementsByTagName('person')).forEach(person => {
    const item = {
      id: person.getAttribute('id'),
      handle: person.getAttribute('handle'),
      name: getPersonName(person),
      events: []
    }

    Array.from(person.querySelectorAll('eventref')).forEach(eventref => {
      if (eventref.getAttribute('role') === 'Primary') {
        item.events.push(eventref.getAttribute('hlink'))
      }
    })

    entities[person.getAttribute('handle')] = item
  })

  Array.from(document.getElementsByTagName('family')).forEach(family => {
    let person0 = family.querySelector('mother')
    if (person0) {
      person0 = person0.getAttribute('hlink')
    }

    let person1 = family.querySelector('father')
    if (person1) {
      person1 = person1.getAttribute('hlink')
    }

    const item = {
      id: family.getAttribute('id'),
      handle: family.getAttribute('handle'),
      name: (entities[person0] ? entities[person0].name : '?') + ' & ' + (entities[person1] ? entities[person1].name : '?'),
      events: []
    }

    Array.from(family.querySelectorAll('eventref')).forEach(eventref => {
      if (eventref.getAttribute('role') === 'Family') {
        item.events.push(eventref.getAttribute('hlink'))
      }
    })

    entities[family.getAttribute('handle')] = item
  })

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

  upcoming.forEach((list, days) => {
    if (!list || !list.length) {
      return
    }

    const date = moment(today).add(days, 'days')

    let in_days = translation['in_days'].replace('%', days)
    if (translation['in_' + days + '_days']) {
      in_days = translation['in_' + days + '_days']
    }

    console.log(date.format('LL') + ' (' + in_days + ')')
    list.forEach(item => {
      let age = translation['age'].replace('%', item.anniversary)
      if (translation['age_' + item.anniversary]) {
        age = translation['age_' + item.anniversary]
      }

      console.log('- ' + item.entity.name + ' (' + (translation[item.event.type] ?? item.event.type) + ', ' + age + ')')
    })
    console.log()
  })
}

function getEventEntities (eventHandle) {
  return Object.values(entities).filter(person => person.events.includes(eventHandle))
}

function getTextContent (item, selector) {
  const value = item.querySelector(selector)
  if (value) {
    return value.textContent
  }
}

function getAttribute (item, selector, attribute) {
  const value = item.querySelector(selector)
  if (value) {
    return value.getAttribute(attribute)
  }
}

function getPersonName (person) {
  const nameValue = person.querySelector('name')
  return (getTextContent(nameValue, 'first') ?? '?') + ' ' + getTextContent(nameValue, 'surname')
}
