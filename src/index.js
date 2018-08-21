
var hideEmpty = true
var webIds = null
var path = null
var projectSchema = null

const wcol = 'opencrypto-weight'
const wcolif = 'opencrypto-weight-if'

function fixSchema (schema) {
  return schema

  schema.properties.name[wcol] = 1
  schema.properties.start_date[wcol] = 1
  schema.properties.web[wcol] = 1
  schema.properties.history[wcol] = 1
  schema.properties.whitepapers[wcol] = 1
  schema.properties.contacts[wcol] = 1
  schema.properties.images[wcol] = 1
  //schema.properties.images.properties.logo_square[wcol] = 1

  schema.properties.team[wcol] = 1
  schema.properties.team_url[wcol] = 0.5
  schema.properties.team.items.properties.name[wcol] = 1
  schema.properties.team.items.properties.role[wcol] = 1
  schema.properties.team.items.properties.photo[wcol] = 0.5
  schema.properties.team.items.properties.webids[wcol] = 1

  schema.properties.assets[wcol] = 1
  schema.properties.webids[wcol] = 1
  //schema.properties.assets.items[wcol] = 2
  schema.properties.assets.items.properties.start_date[wcol] = 1
  schema.properties.assets.items.properties.type[wcol] = 1
  schema.properties.assets.items.properties.symbol[wcol] = 1
  schema.properties.assets.items.properties.name[wcol] = 1
  schema.properties.assets.items.properties.denominations[wcol] = 1
  schema.properties.assets.items.properties.token_properties[wcol] = 1
  schema.properties.assets.items.properties.images[wcol] = 1
  schema.properties.assets.items.properties.networks[wcol] = 1
  schema.properties.assets.items.properties.networks[wcolif] = 'root.type === "blockchain"'

  let network = schema.properties.assets.items.properties.networks.items
  network.properties.name[wcol] = 5
  network.properties.type[wcol] = 5
  network.properties.proof_type[wcol] = 0.5
  network.properties.proof_type[wcolif] = 'root.type === "main"'
  network.properties.algorithm[wcol] = 1
  network.properties.algorithm[wcolif] = 'root.type === "main"'
  network.properties.target_block_time[wcol] = 1
  network.properties.target_block_time[wcolif] = 'root.type === "main"'
  network.properties.maximum_block_size[wcol] = 1
  network.properties.maximum_block_size[wcolif] = 'root.type === "main"'
  network.properties.mineable[wcol] = 1
  network.properties.mineable[wcolif] = 'root.type === "main"'

  return schema
}

function progressError(msgs, path, weight=1, text=undefined) {
  msgs.push({
    text,
    path: makePath(path),
    weight
  })
  return msgs
}

function checkWeightIf (schema) {
}

function calculateProgress (schema, obj, path=[], msgs=[], root=null) {
  let w = 1
  //console.log(schema.title)
  switch (schema.type) {
    case 'string':
    case 'number':
    case 'boolean':
      if (schema[wcol]) {
        if (schema[wcolif]) {
          console.log('exception: %s, eval="%s"', makePath(path), schema[wcolif])
          const ret = function test(code) {
            return eval(code)
          }(schema[wcolif])
          if (!ret) {
            w = 1
            break
          }
        }
        w = (obj !== undefined && obj !== null && obj !== '') ? schema[wcol] : 0
        if (w === 0) {
          progressError(msgs, path, schema[wcol])
        }
      }
      break
    case 'array':
      if (schema[wcol] && schema.items) {
        if (schema[wcolif]) {
          console.log('exception: %s, eval="%s"', makePath(path), schema[wcolif])
          const ret = function test(code) {
            return eval(code)
          }(schema[wcolif])
          if (!ret) {
            w = 1
            break
          }
        }
        if (obj) {
          let arr = obj.map((i, k) => {
            const [ prog ] = calculateProgress(schema.items, i, path.concat([k]), msgs, root)
            return prog
          })
          w = _.sum(arr) / (arr.length * schema[wcol])
        } else {
          progressError(msgs, path, schema[wcol])
          w = 0
        }
      }
      break
    case 'object':
      if (schema.properties) {
        if (schema[wcol] && schema[wcolif]) {
          console.log('exception: %s, eval="%s"', makePath(path), schema[wcolif])
          const ret = function test(code) {
            return eval(code)
          }(schema[wcolif])
          if (!ret) {
            w = 1
            break
          }
        }
        let weights = {}
        let progress = {}
        Object.keys(schema.properties).forEach(p => {
          let pd = schema.properties[p]
          if (pd[wcol]) {
            weights[p] = pd[wcol]
            const [ prog ] = calculateProgress(pd, obj[p] || '', path.concat([p]), msgs, obj)
            progress[p] = prog
          }
        })
        if (Object.keys(weights).length > 0) {
          w = _.sum(Object.values(progress)) / _.sum(Object.values(weights))
        }
        if (w === 0) {
          progressError(msgs, path, schema[wcol])
        }
      }
      break
  }
  return [ w, msgs ]
}

function getLengthInBytes(str) {
  var b = str.match(/[^\x00-\xff]/g);
  return (str.length + (!b ? 0: b.length)); 
}

function githubIssueLink (path, value) {
  const title = encodeURI(`(${dataItem.id}) ${makePath(path)}`)
  const body = `Current value: \`${value}\``
  return `https://github.com/opencrypto-io/data/issues/new?labels=bug&title=${title}&body=${body}`
}

function setPath (p) {
  if (!p) {
    return null
  }
  path = p
}

function makeFooter (arr, schema) {
  return makePath(arr) + ' <'+schema.type+(schema.format? ':' + schema.format : '')+'>'
}

function makePath (arr) {
  return arr.reduce((out, v) => {
    if (typeof v === 'number') {
      return out + '['+v+']'
    }
    if (typeof v === 'string' && !v.match(/^[a-zA-Z0-9_]+$/)) {
      return out + '[\''+v+'\']'
    }
    return out + '.' + v
  })
}

function unsetPath () {
  path = null
}

function resolveWebId(val, type) {
  if (type.match(/^custom\//)) {
    return m('a', { href: val }, val)
  }
  const wd = webIds[type]
  if (!wd) {
    return '#'
  }
  const href = webIds[type].url.replace('@id', val)
  return m('a', { href, target: '_blank' }, val)
}

function processItem(i) {
  i._size = getLengthInBytes(JSON.stringify(i))
  i._logo = null
  i._logo_full = null
  const [ progress, msgs ] = calculateProgress(projectSchema, i)
  console.log(i.id, progress, JSON.stringify(msgs, null, 2))
  i._progress = progress
  for(let n = 0; n <= 3; n++) {
    var asset0 = i.assets[n]
    if (i._logo) continue
    if (!asset0) continue
    if (asset0.images && asset0.images.logo_square) {
      i._logo = asset0.images.logo_square.data
      i._logo_full = i._logo
    }
    if (asset0.images && asset0.images.logo_full) {
      i._logo_full = asset0.images.logo_full.data
    }
  }
  return i
}

function getType (type) {
  let fn = null
  switch (type) {
    case 'string':
      fn = OCString
      break
    case 'array':
      fn = OCArray
      break
    case 'number':
      fn = OCNumber
      break
    case 'boolean':
      fn = OCBoolean
      break
    case 'object':
      fn = OCObject
      break
  }
  return fn
}

function zeroValue() {
  return m('span.grey', '(no value)')
}

function OCBoolean (schema, val) {
  return val === true ? 'Yes' : (val === false ? 'No' : zeroValue())
}

function OCString (schema, val, path) {
  if (!val) {
    return zeroValue()
  }
  if (schema.media && schema.media.binaryEncoding == 'base64') {
    return m('div', [
      m('img', { src: 'data:image/svg+xml;base64,' + val, style: 'max-height: 100px;' }) 
    ])
  }
  let out = val
  if (schema.format === 'url') {
    out = m('a', { href: val, target: '_blank' }, val)
  }
  else if (schema.format === 'date') {
    out = `${val} (${moment(val).fromNow()})`
  }
  else if (schema.format == 'webid') {
    out = resolveWebId(val, path.slice(-1)[0])
  }
  return m('div', [
    out,
    m('.control', m('a', { href: githubIssueLink(path, val) }, m('i.fas.fa-bug')))
  ])
}

function OCNumber (schema, val) {
  return val || zeroValue()
}

function OCArray (schema, val, path) {
  if (!val || val.length === 0) {
    return zeroValue()
  }
  let fn = getType(schema.items.type)
  return val.map((i, c) => {
    return fn ? fn(schema.items, i, path.concat([c])) : null
  })
}

function OCObject(schema, values, path) {
  if (schema.patternProperties) {
    if (values) {
      schema.properties = []
      Object.keys(values).forEach(k => {
        schema.properties[k] = { type: 'string', format: schema['opencrypto-validation'] }
      })
    } else {
      return zeroValue()
    }
  }
  if (!schema.properties) {
    return m('div', 'bad object')
  }
  return m('table.table', m('tbody', Object.keys(schema.properties).map(p => {
    if (hideEmpty && !values[p]) {
      return null
    }
    const pdata = schema.properties[p]
    let cpath = path.concat([p])
    let fn = getType(pdata.type)
    let events = { 'data-path': makeFooter(cpath, pdata), onmouseenter: m.withAttr('data-path', setPath), onmouseleave: m.withAttr('data-path', unsetPath) }
    return m('tr', events, [
      m('th', pdata.title || p),
      m('td', fn ? fn(pdata, values ? values[p] : null, cpath) : 'unknown type: '+pdata.type)
    ])
  })))
}

function githubLink(id, type = 'blob') {
  return `https://github.com/opencrypto-io/data/${type}/master/db/projects/${id}/project.yaml`
}

const Layout = {
  oninit () {
    const schemaUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:1234/schema/deref/project.json'
      : 'https://schema.opencrypto.io/build/deref/project.json'
    Promise.all([
      ocd.query('webids'),
      m.request(schemaUrl)
    ]).then(out => {
      webIds = out[0]
      projectSchema = fixSchema(out[1])
      m.redraw()
    })
  },
  view (vnode) {
    return m('div', [
      path ? m('#toolsFooter', path) : '',
      m('div', { 'style': 'padding-bottom: 5em;' },  [
        m('nav#navbar.navbar', [
          m('.container', [
            m('.navbar-brand', [
              m('a.navbar-item', { href: 'https://data.opencrypto.io/' }, [
                m('#logo'),
                m('#logo-text', [
                  m('span.thin', 'Open'),
                  'Crypto',
                  m('span.green', 'Data'),
                ])
              ])
            ]),
            m('.navbar-menu', [
              m('.navbar-start', [
                m('a.navbar-item', { href: 'https://data.opencrypto.io' }, 'Homepage'), 
                m('a.navbar-item.current', { href: 'https://explorer.opencrypto.io' }, 'Explorer'), 
                m('a.navbar-item', { href: 'https://schema.opencrypto.io' }, 'Schema'), 
              ]),
              m('.navbar-end', [
                m('a.navbar-item', { href: '#' }, 'How to contribute?'), 
                m('a.navbar-item', { href: '#' }, 'FAQ'), 
              ])
            ])
          ])
        ]),
        m('.container', function() {
          if (webIds && projectSchema) {
            return m('#page', vnode.children)
          }
          return m('div', { style: 'padding: 2em;' }, 'Loading ..')
        }())
      ])
    ])
  }
}

var originalData = null
var data = null
var sortBy = 'name'
var sortReverse = false

const ProjectList = {
  oninit () {
    ocd.query('projects').then(res => {
      data = res.map(i => {
        return processItem(i)
      })
      originalData = _.clone(data)
      m.redraw()
    })
  },
  view () {
    if (data === null) {
      return m('div', { style: 'padding: 2em;' }, 'Loading ..')
    }

    function runSort() {
      data = _.sortBy(data, sortBy)
      if (sortReverse) {
        data = data.reverse()
      }
    }
    function updateSort(value) {
      if (sortBy != value) {
        sortBy = value
      } else {
        sortReverse = !sortReverse
      }
      runSort()
    }

    function searchList(value) {
      data = _.clone(originalData)
      if (!value) {
        return null
      }
      data = data.filter((p) => {
        return Boolean(p.name.match(new RegExp(value, 'gmi')))
      })
    }

    runSort()

    return m('div', [
      m('.navbar.transparent.listNavBar', [
        m('.navbar-menu', [
          m('.navbar-start', [
            m('.navbar-item', [
              m('h2.title.is-4', 'Projects ('+originalData.length+')'),
            ]),
            m('.navbar-item', [
              m('input.searchInput', { placeholder: 'Search projects ..', oninput: m.withAttr('value', searchList) }),
            ])
          ])
        ])
      ]),
      m('#projectList', [
        m('table.table', [
          m('thead', [
            m('tr', [
              m('th', ''),
              m('th', m('a', { onclick: m.withAttr('value', updateSort), value: 'name' }, 'Name')),
              m('th', 'Project tags'),
              m('th', m('a', { onclick: m.withAttr('value', updateSort), value: '_progress' }, 'Completeness')),
              m('th', m('a', { onclick: m.withAttr('value', updateSort), value: '_size' }, 'Data size')),
              m('th', 'GitHub'),
              m('th', 'Link to Explorer'),
            ])
          ]),
          m('tbody', function () {
            return data.map(i => {
              return m('tr', { key: i.id }, [
                m('td.data-logo', m('div', [
                  i._logo ? m('img', { src: 'data:image/svg+xml;base64,' + i._logo }) : '',
                ])),
                m('td', m('a.projectTitle', { href: '/project/'+i.id, oncreate: m.route.link }, i.name)),
                m('td', i.tags ? i.tags.join(', ') : ''),
                m('td', m('div', [
                  m('progress.progress.is-primary.is-small', { value: i._progress, max: 1 }, `${i._progress}%`) 
                ])),
                m('td', (i._size/1000).toFixed(2) + ' KB'),
                m('td', [
                  m('a', { href: githubLink(i.id) }, 'Source'),
                  ', ',
                  m('a', { href: githubLink(i.id, 'edit') }, 'Edit'),
                ]),
                m('td', m('a', { href: '/project/'+i.id, oncreate: m.route.link }, 'View →' )),
              ])
            })
          }())
        ])
      ])
    ])
  }
}

var dataItem = null
var dataView = 'explorer'

const Project = {
  oninit (vnode) {
    ocd.get('project', vnode.attrs.id).then(res => {
      dataItem = processItem(res)
      m.redraw()
    })
  },
  view (vnode) {
    if (!dataItem) {
      return m('div', { style: 'padding: 2em;' }, 'Loading ..')
    }

    function switchSource (type) {
      console.log(type)
      dataView = type
    }
    const p = dataItem

    return m('div', [
      m('h2.title.is-4', [
        m('a', { href: '/', oncreate: m.route.link }, 'Projects'),
        ' / ',
        m('span', p.name)
      ]),
      m('#itemDetail', [
        m('.navbar.transparent', [
          m('.navbar-menu', [
            m('.navbar-start', [
              p._logo_full ? m('.navbar-item', m('.itemLogo', m('img', { src: 'data:image/svg+xml;base64,' + p._logo_full }))) : '',
              m('.navbar-item', m('h3.title.is-4', p.name))
            ]),
            m('.navbar-end', [
              m('a.navbar-item', { href: githubLink(p.id, 'edit') }, [
                m('i.fab.fa-github', { style: 'font-size: 1.3em; padding-right: 0.3em;' }),
                'Edit on GitHub'
              ]),
              m('.navbar-item', [
                m('.buttons.has-addons', [
                  m('span.button', { class: dataView === 'explorer' ? 'is-success is-selected' : '', onclick: m.withAttr('value', switchSource), value: 'explorer' }, 'Explorer'),
                  m('span.button', { class: dataView === 'source' ? 'is-success is-selected' : '', onclick: m.withAttr('value', switchSource), value: 'source' }, 'Source'),
                ])
              ])
            ])
          ])
        ]),
        function () {
          if (dataView === 'source') {
            const src = JSON.stringify(p, null, 2)
            return m('#itemSource', [
              m('pre', m.trust(hljs.highlight('json', src).value))
            ])
          }
          if (projectSchema === null) {
            return m('div', { style: 'padding: 2em;' }, 'Loading ..')
          }
          return m('#dataTable', OCObject(projectSchema, p, []))
        }()
      ]),
    ])
  }
}

const root = document.getElementById('data-explorer')
m.route(root, '/', {
  '/': { render: () => m(Layout, m(ProjectList)) },
  '/project/:id': { render: (vnode) => m(Layout, m(Project, vnode.attrs)) }
})
