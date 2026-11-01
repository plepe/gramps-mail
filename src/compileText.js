const moment = require('moment')

const loadTranslation = require('./loadTranslation.js')

module.exports = function compileText (data, mailConfig, callback) {
  loadTranslation(mailConfig.language, (err, translation) => {
    if (err) { return callback(err) }

    moment.locale(mailConfig.language)
    run(data, mailConfig, translation, callback)
  })
}

function run (data, mailConfig, translation, callback) {
  const today = mailConfig.today === 'today' ? moment(moment().format('YYYY-MM-DD')) : moment(mailConfig.today)

  const year = parseInt(moment(today).format('YYYY'))
  const years = [year]
  for (i = 0; i < Math.ceil(mailConfig.days / 365); i++) {
    years.push(year + i + 1)
  }

  const events = data.events
  const entities = data.entities
  const upcoming = []

  Object.values(events).forEach(event => {
    if (!event.date || event.date.length < 10) {
      return
    }

    const days = years.map(y => {
      const n = moment(y + event.date.substr(4))
      const days = n.diff(today, 'days')

      if (days < 0 || days >= mailConfig.days) {
        return
      }

      const anniversary = y - event.date.substr(0, 4)

      if (!upcoming[days]) {
        upcoming[days] = []
      }

      const ents = getEventEntities(entities, event.handle)
      ents.forEach(person => {
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

  callback(null, text)
}

function getEventEntities (entities, eventHandle) {
  return Object.values(entities).filter(person => person.events.includes(eventHandle))
}
