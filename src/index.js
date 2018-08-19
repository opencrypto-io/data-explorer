
var hideEmpty = true
var webIds = null
var path = null

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

function makePath (arr, schema) {
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
  i._progress = Math.random()
  i._logo = null
  i._logo_full = null
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
    ocd.query('webids').then((res) => {
      webIds = res
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
        m('.container', [
          m('#page', vnode.children)
        ])
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
var projectSchema = null
var dataView = 'explorer'

const Project = {
  oninit (vnode) {
    ocd.get('project', vnode.attrs.id).then(res => {
      dataItem = res
      m.redraw()
    })
    if (!projectSchema) {
      m.request('https://schema.opencrypto.io/build/deref/project.json').then(res => {
        projectSchema = res
        m.redraw()
      })
    }
  },
  view (vnode) {
    if (!dataItem) {
      return m('div', { style: 'padding: 2em;' }, 'Loading ..')
    }
    const p = processItem(dataItem)

    function switchSource (type) {
      console.log(type)
      dataView = type
    }

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
