const fs = require('fs')

const translations = {}

module.exports = function loadTranslation (language, callback) {
  if (language in translations) {
    return callback(null, translations[language])
  }

  fs.readFile('lang/' + language + '.json', (err, body) => {
    if (err) { return callback(err) }

    translations[language] = JSON.parse(body)
    callback(null, translations[language])
  })
}
