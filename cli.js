#!/usr/bin/env node
const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

const year = new Date().getFullYear()
const nextYear = year + 1

fs.readFile('/home/skunk/Downloads/gramps-web-export-20261031183922.gramps', (err, body) => {
  const dom = new JSDOM(body.toString(), {
    contentType: 'application/xml'
  })
  const document = dom.window.document

  const events = {}
  Array.from(document.getElementsByTagName('event')).forEach(event => {
    events[event.getAttribute('handle')] = {
      type: getTextContent(event, 'type'),
      date: getAttribute(event, 'dateval', 'val')
    }
  })

  const persons = {}
  Array.from(document.getElementsByTagName('person')).forEach(person => {
    const nameValue = person.querySelector('name')

    const item = {
      name: getTextContent(nameValue, 'first') + ' ' + getTextContent(nameValue, 'surname'),
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
    console.log(event.date)
  })
})

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
