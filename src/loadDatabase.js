const fs = require('fs')
const zlib = require('zlib')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

module.exports = function loadDatabase (filename, callback) {
  fs.readFile(filename, (err, body) => {
    body = zlib.gunzip(body, (err, body) => {
      run(body, callback)
    })
  })
}

function run (body, callback) {
  const events = {}
  const entities = {}

  const dom = new JSDOM(body, {
    contentType: 'application/xml'
  })
  const document = dom.window.document

  Array.from(document.getElementsByTagName('event')).forEach(event => {
    const type = getTextContent(event, 'type')

//    if (showOnlyEventTypes && !showOnlyEventTypes.includes(type)) {
//      return
//    }

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

  callback(null, { entities, events })
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
