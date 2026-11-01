function selected (person, entities, select) {
  if (!select) {
    return true
  }

  if (select.includes(person.id)) {
    return true
  }

  return false
}

module.exports = selected 
