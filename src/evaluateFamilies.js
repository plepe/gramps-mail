function evaluateFamilies (entities, select) {
  console.log(select)
  if (!select) { return null }

  select.forEach((id, i) => {
    const m = id.match(/^([\+\*]*)([A-Z][0-9]+)([\+\*]*)$/)
    id = m[2]
    select[i] = id
    const up = m[1]
    const down = m[3]

    const entity = Object.values(entities).filter(e => e.id === id)[0]
    if (!entity) { return }

    if (up) {
      const newUp = up[0] === '+' ? up.substr(1) : up

      // find family where this person is up
      if (entity.peopleUp) {
        entity.peopleUp.forEach(handle => {
          const e = entities[handle]

          const families = Object.values(entities).filter(e => e.peopleDown && e.peopleDown.includes(entity.handle))

          select = select.concat(evaluateFamilies(entities, [newUp + e.id]))
        })
      } else {
        const families = Object.values(entities).filter(e => e.peopleDown && e.peopleDown.includes(entity.handle))

        families.forEach(family => {
          select.push(family.id)
          select = select.concat(evaluateFamilies(entities, [newUp + family.id]))
        })
      }
    }

    if (down) {
      const newDown = down[0] === '+' ? down.substr(1) : down

      // find family where this person is up
      if (entity.peopleDown) {
        entity.peopleDown.forEach(handle => {
          const e = entities[handle]
          select.push(e.id)
          select = select.concat(evaluateFamilies(entities, [e.id + newDown]))
        })
      } else {
        const families = Object.values(entities).filter(e => e.peopleUp && e.peopleUp.includes(entity.handle))

        families.forEach(family => {
          family.peopleDown.forEach(handle => {
            const e = entities[handle]
            select.push(e.id)
            select = select.concat(evaluateFamilies(entities, [e.id + newDown]))
          })
        })
      }
    }
  })

  return select
}

module.exports = evaluateFamilies
