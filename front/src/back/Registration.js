class Registration {
  constructor() {
    this.registrations = {}
  }

  register(project, value, ws) {
    if(this.registrations[project] == null) this.registrations[project] = {}
    if(this.registrations[project][value] == null) this.registrations[project][value] = []

    this.registrations[project][value].push(ws)
  }

  unregister(ws) {
    Object.keys(this.registrations).forEach((project) => {
      Object.keys(this.registrations[project]).forEach((value) => {
        this.registrations[project][value] = this.registrations[project][value].filter(_ => _ != ws)
      })
    })
  }
}

module.exports = {
  Registration
}