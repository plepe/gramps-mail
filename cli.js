#!/usr/bin/env node
const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom
const moment = require('moment')

const today = moment()
const year = new Date().getFullYear()
const nextYear = year + 1
const daysInFuture = 31

const events = {}
const persons = {}
const upcoming = []

fs.readFile('/home/skunk/Downloads/gramps-web-export-20261031183922.gramps', (err, body) => {
  const dom = new JSDOM(body.toString(), {
    contentType: 'application/xml'
  })
  const document = dom.window.document

  Array.from(document.getElementsByTagName('event')).forEach(event => {
    events[event.getAttribute('handle')] = {
      handle: event.getAttribute('handle'),
      type: getTextContent(event, 'type'),
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

    persons[person.getAttribute('handle')] = item
  })

  Object.values(events).forEach(event => {
    if (!event.date || event.date.length < 10) {
      return
    }

    const n1 = moment(year + event.date.substr(4))
    const n2 = moment(nextYear + event.date.substr(4))

    const days1 = n1.diff(today, 'days')
    const days2 = n2.diff(today, 'days')
    let days = null
    let anniversary = null

    if (days1 >= 0 && days1 < daysInFuture) {
      days = days1
      anniversary = year - event.date.substr(0, 4)
    }
    if (days2 >= 0 && days2 < daysInFuture) {
      days = days2
      anniversary = nextYear - event.date.substr(0, 4)
    }

    if (days !== null) {
      if (!upcoming[days]) {
        upcoming[days] = []
      }

      const persons = getEventPersons(event.handle)
      persons.forEach(person => {
        upcoming[days].push({
          entity: person,
          event,
          anniversary
        })
      })
    }
  })

  upcoming.forEach((list, days) => {
    if (!list) {
      return
    }

    const date = moment().add(days, 'days')

    if (list.length) {
      console.log(date.format('ll') + ' (in ' + days + ' Tagen)')
      list.forEach(item => console.log('- ' + item.entity.name + ' (' + item.event.type + ', ' + item.anniversary + ' Jahre)'))
      console.log()
    }
  })
})

function getEventPersons (eventHandle) {
  return Object.values(persons).filter(person => person.events.includes(eventHandle))
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
